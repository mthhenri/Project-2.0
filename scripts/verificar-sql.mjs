import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { tokensSql } from './formatar-sql.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pastaBackend = join(raiz, 'backend', 'src');
const pastaMigrations = join(pastaBackend, 'database', 'migrations');
const DINAMICO = '__sql_dinamico__';

/** Isenções fechadas (SYSTEM.SPEC §9.2 #1 e #11): as únicas leituras que veem registro excluído. */
const METODOS_DE_RESTAURACAO = /^recuperarExcluid[oa]$/;
/** O histórico do chat entre colaboradores sobrevive a quem saiu, e a conversa de gestor segue privada mesmo depois de ele ser excluído. */
const LEITURAS_DE_USUARIO_DO_CHAT = new Set(['validarExistenciaIncluindoExcluido', 'listarTiposPorIds', 'listarIdsComPermissaoDeGestor']);

const PALAVRAS_RESERVADAS = new Set([
    'ON', 'WHERE', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'JOIN', 'GROUP', 'ORDER', 'LIMIT', 'OFFSET', 'HAVING', 'UNION',
    'INTERSECT', 'EXCEPT', 'SET', 'RETURNING', 'FOR', 'USING', 'LATERAL', 'WINDOW', 'FETCH', 'FROM', 'AND', 'OR', 'NATURAL',
]);

function identificadorLimpo(token) {
    return token.startsWith('"') ? token.slice(1, -1) : token;
}

function maiuscula(token) {
    return typeof token === 'string' ? token.toUpperCase() : '';
}

/** Lê as migrations em ordem e devolve, por tabela, se ela tem `is_deleted` e `updated_date`. */
export function colunasDasMigrations(migrations) {
    const tabelas = new Map();
    for (const migration of migrations) {
        const up = migration.split(/^--\s*DOWN\s*$/m)[0];
        for (const criacao of up.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(/gi)) {
            let profundidade = 1;
            let posicao = criacao.index + criacao[0].length;
            while (profundidade > 0 && posicao < up.length) {
                if (up[posicao] === '(') profundidade += 1;
                if (up[posicao] === ')') profundidade -= 1;
                posicao += 1;
            }
            const corpo = up.slice(criacao.index, posicao);
            tabelas.set(criacao[1].toLowerCase(), {
                isDeleted: /\bis_deleted\b/i.test(corpo),
                updatedDate: /\bupdated_date\b/i.test(corpo),
            });
        }
        for (const renomeada of up.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)\s+RENAME\s+TO\s+(\w+)/gi)) {
            const colunas = tabelas.get(renomeada[1].toLowerCase());
            if (colunas) {
                tabelas.delete(renomeada[1].toLowerCase());
                tabelas.set(renomeada[2].toLowerCase(), colunas);
            }
        }
        for (const removida of up.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/gi)) tabelas.delete(removida[1].toLowerCase());
    }
    return tabelas;
}

/**
 * Divide os tokens em escopos de consulta. Parêntese que abre SELECT/WITH (ou o UPDATE/INSERT/DELETE de uma CTE) é um escopo novo; qualquer outro é transparente
 * e os tokens ficam no escopo de fora, com `nivel` maior (assim `EXTRACT(EPOCH FROM x)` não vira tabela).
 */
function separarEscopos(tokens) {
    const escopos = [];
    const criarEscopo = () => {
        const escopo = { itens: [] };
        escopos.push(escopo);
        return escopo;
    };
    const pilha = [{ escopo: criarEscopo(), nivel: 0, novoEscopo: false }];
    for (let indice = 0; indice < tokens.length; indice += 1) {
        const token = tokens[indice];
        const topo = pilha[pilha.length - 1];
        if (token === '(') {
            const proximo = maiuscula(tokens[indice + 1]);
            if (['SELECT', 'WITH', 'UPDATE', 'INSERT', 'DELETE'].includes(proximo)) {
                const anterior = topo.escopo.itens[topo.escopo.itens.length - 1];
                const anteAnterior = topo.escopo.itens[topo.escopo.itens.length - 2];
                topo.escopo.itens.push({ token: '(subconsulta)', nivel: topo.nivel });
                if (maiuscula(anterior?.token) === 'AS' && anteAnterior) topo.escopo.nomesDeCte = [...(topo.escopo.nomesDeCte ?? []), anteAnterior.token.toLowerCase()];
                pilha.push({ escopo: criarEscopo(), nivel: 0, novoEscopo: true });
            } else {
                topo.escopo.itens.push({ token, nivel: topo.nivel });
                pilha.push({ escopo: topo.escopo, nivel: topo.nivel + 1, novoEscopo: false });
            }
            continue;
        }
        if (token === ')' && pilha.length > 1) {
            const fechado = pilha.pop();
            if (!fechado.novoEscopo) pilha[pilha.length - 1].escopo.itens.push({ token, nivel: pilha[pilha.length - 1].nivel });
            continue;
        }
        if (token === ';' && pilha.length === 1) {
            pilha[0].escopo = criarEscopo();
            continue;
        }
        topo.escopo.itens.push({ token, nivel: topo.nivel });
    }
    return escopos;
}

/** Cada ramo de UNION/INTERSECT/EXCEPT é um bloco, com filtros próprios. */
function separarBlocos(escopo) {
    const blocos = [[]];
    for (const item of escopo.itens) {
        if (item.nivel === 0 && ['UNION', 'INTERSECT', 'EXCEPT'].includes(maiuscula(item.token))) blocos.push([]);
        else blocos[blocos.length - 1].push(item);
    }
    return blocos.filter((bloco) => bloco.length);
}

function lerReferencia(tokens, inicio) {
    let posicao = inicio;
    while (['ONLY', 'LATERAL'].includes(maiuscula(tokens[posicao]?.token))) posicao += 1;
    const primeiro = tokens[posicao]?.token;
    if (!primeiro || primeiro === '(subconsulta)' || primeiro === '(') return { referencia: null, posicao: posicao + 1 };
    // Função de conjunto (`generate_series(...)`, `jsonb_each(...)`) não é tabela.
    if (tokens[posicao + 1]?.token === '(') return { referencia: null, posicao: posicao + 1 };
    let nome = identificadorLimpo(primeiro);
    posicao += 1;
    if (tokens[posicao]?.token === '.') {
        nome = identificadorLimpo(tokens[posicao + 1]?.token ?? '');
        if (identificadorLimpo(primeiro).toLowerCase() !== 'public') return { referencia: null, posicao: posicao + 2 };
        posicao += 2;
    }
    let alias = nome;
    if (maiuscula(tokens[posicao]?.token) === 'AS') {
        alias = identificadorLimpo(tokens[posicao + 1]?.token ?? nome);
        posicao += 2;
    } else if (tokens[posicao] && /^[a-zA-Z_"]/.test(tokens[posicao].token) && !tokens[posicao].token.includes(DINAMICO) && !PALAVRAS_RESERVADAS.has(maiuscula(tokens[posicao].token)) && tokens[posicao].nivel === 0) {
        alias = identificadorLimpo(tokens[posicao].token);
        posicao += 1;
    }
    return { referencia: { tabela: nome.toLowerCase(), alias: alias.toLowerCase() }, posicao };
}

/** Depois de uma função de conjunto ou subconsulta no FROM: pula os argumentos e o apelido, para achar a vírgula seguinte. */
function pularFonteSemTabela(bloco, inicio) {
    let posicao = inicio;
    if (bloco[posicao]?.token === '(') posicao += 1;
    while (bloco[posicao] && bloco[posicao].nivel > 0) posicao += 1;
    if (bloco[posicao]?.token === ')') posicao += 1;
    if (maiuscula(bloco[posicao]?.token) === 'AS') return posicao + 2;
    if (bloco[posicao] && /^[a-zA-Z_"]/.test(bloco[posicao].token) && !PALAVRAS_RESERVADAS.has(maiuscula(bloco[posicao].token))) return posicao + 1;
    return posicao;
}

function referenciasDoBloco(bloco, nomesDeCte) {
    const referencias = [];
    let operacao = null;
    let tabelaInserida = null;
    let temUpsert = false;
    for (let indice = 0; indice < bloco.length; indice += 1) {
        const { token, nivel } = bloco[indice];
        if (nivel !== 0) continue;
        const palavra = maiuscula(token);
        const anterior = maiuscula(bloco[indice - 1]?.token);
        if (palavra === 'INSERT' && maiuscula(bloco[indice + 1]?.token) === 'INTO') {
            tabelaInserida = identificadorLimpo(bloco[indice + 2]?.token ?? '').toLowerCase();
            operacao = 'INSERT';
        } else if (palavra === 'UPDATE' && anterior === 'DO') {
            temUpsert = true;
        } else if (palavra === 'UPDATE' && !['FOR', 'KEY'].includes(anterior)) {
            const { referencia } = lerReferencia(bloco, indice + 1);
            operacao = 'UPDATE';
            if (referencia) referencias.push({ ...referencia, papel: 'UPDATE' });
        } else if (palavra === 'FROM' && anterior === 'DELETE') {
            const { referencia } = lerReferencia(bloco, indice + 1);
            operacao = 'DELETE';
            if (referencia) referencias.push({ ...referencia, papel: 'DELETE' });
        } else if (palavra === 'FROM' && anterior !== 'DISTINCT') {
            let posicao = indice + 1;
            for (;;) {
                const lida = lerReferencia(bloco, posicao);
                if (lida.referencia) referencias.push({ ...lida.referencia, papel: 'FROM' });
                posicao = lida.referencia ? lida.posicao : pularFonteSemTabela(bloco, lida.posicao);
                while (bloco[posicao] && bloco[posicao].nivel > 0) posicao += 1;
                if (bloco[posicao]?.token !== ',') break;
                posicao += 1;
            }
        } else if (palavra === 'JOIN') {
            const { referencia } = lerReferencia(bloco, indice + 1);
            if (referencia) referencias.push({ ...referencia, papel: 'JOIN' });
        }
    }
    return {
        referencias: referencias.filter((referencia) => !nomesDeCte.has(referencia.tabela)),
        operacao,
        tabelaInserida,
        temUpsert,
    };
}

function comparacaoDeExclusao(bloco, indice) {
    const operador = bloco[indice + 1]?.token;
    const valor = maiuscula(bloco[indice + 2]?.token);
    if (operador === '=' && valor === 'FALSE') return 'FALSE';
    if (operador === '=' && valor === 'TRUE') return 'TRUE';
    if (maiuscula(operador) === 'IS' && valor === 'FALSE') return 'FALSE';
    if (maiuscula(operador) === 'IS' && valor === 'TRUE') return 'TRUE';
    return null;
}

/** Filtros `is_deleted` do bloco. A atribuição do `SET` de um soft delete (`SET is_deleted = true`) não é filtro. */
function filtrosDoBloco(bloco) {
    const filtros = [];
    let dentroDoSet = false;
    let dentroDoConflito = false;
    for (let indice = 0; indice < bloco.length; indice += 1) {
        const palavra = maiuscula(bloco[indice].token);
        if (bloco[indice].nivel === 0 && palavra === 'CONFLICT') dentroDoConflito = true;
        if (bloco[indice].nivel === 0 && palavra === 'DO') dentroDoConflito = false;
        if (dentroDoConflito) continue;
        if (bloco[indice].nivel === 0 && palavra === 'SET') dentroDoSet = true;
        if (bloco[indice].nivel === 0 && (palavra === 'WHERE' || palavra === 'FROM' || palavra === 'RETURNING')) dentroDoSet = false;
        if (bloco[indice].token.toLowerCase() !== 'is_deleted' || dentroDoSet) continue;
        const valor = comparacaoDeExclusao(bloco, indice);
        if (!valor) continue;
        const qualificada = bloco[indice - 1]?.token === '.';
        filtros.push({ alias: qualificada ? identificadorLimpo(bloco[indice - 2].token).toLowerCase() : null, valor });
    }
    return filtros;
}

function atribuicoesDoBloco(bloco) {
    const colunas = new Map();
    let dentroDoSet = false;
    for (let indice = 0; indice < bloco.length; indice += 1) {
        const palavra = maiuscula(bloco[indice].token);
        if (bloco[indice].nivel === 0 && palavra === 'SET') {
            dentroDoSet = true;
            continue;
        }
        if (bloco[indice].nivel === 0 && (palavra === 'WHERE' || palavra === 'FROM' || palavra === 'RETURNING')) dentroDoSet = false;
        if (dentroDoSet && bloco[indice + 1]?.token === '=') colunas.set(bloco[indice].token.toLowerCase(), maiuscula(bloco[indice + 2]?.token));
    }
    return colunas;
}

/** Analisa um SQL e devolve as referências a tabelas, com a situação do filtro de exclusão de cada uma. */
export function analisarSql(sql) {
    const tokens = tokensSql(sql).filter((token) => !token.startsWith('--') && !token.startsWith('/*'));
    const escopos = separarEscopos(tokens);
    const nomesDeCte = new Set(escopos.flatMap((escopo) => escopo.nomesDeCte ?? []));
    const dinamico = tokens.some((token) => token.includes(DINAMICO));
    const achados = [];
    for (const escopo of escopos) {
        for (const bloco of separarBlocos(escopo)) {
            const { referencias, operacao, tabelaInserida, temUpsert } = referenciasDoBloco(bloco, nomesDeCte);
            const filtros = filtrosDoBloco(bloco);
            const atribuicoes = atribuicoesDoBloco(bloco);
            const unicaReferencia = referencias.length === 1;
            for (const referencia of referencias) {
                const filtrosDaReferencia = filtros.filter((filtro) => filtro.alias === referencia.alias || (filtro.alias === null && unicaReferencia));
                achados.push({
                    ...referencia,
                    filtraExcluido: filtrosDaReferencia.some((filtro) => filtro.valor === 'FALSE'),
                    leExcluido: filtrosDaReferencia.some((filtro) => filtro.valor === 'TRUE'),
                    gravaUpdatedDate: atribuicoes.has('updated_date'),
                    gravaExclusao: atribuicoes.get('is_deleted') === 'FALSE',
                    excluiLinha: atribuicoes.get('is_deleted') === 'TRUE',
                    temDinamico: bloco.some((item) => item.token.includes(DINAMICO)),
                });
            }
            if (operacao === 'INSERT' && tabelaInserida) {
                achados.push({ tabela: tabelaInserida, alias: tabelaInserida, papel: temUpsert ? 'UPSERT' : 'INSERT', filtraExcluido: true, leExcluido: false, gravaUpdatedDate: atribuicoes.has('updated_date'), gravaExclusao: false, excluiLinha: false, temDinamico: false });
            }
        }
    }
    return { achados, dinamico };
}

function nomeDoMetodo(no) {
    let atual = no.parent;
    let nomeDaVariavel = null;
    while (atual) {
        if ((ts.isMethodDeclaration(atual) || ts.isFunctionDeclaration(atual)) && atual.name) return atual.name.getText();
        if (ts.isPropertyDeclaration(atual)) return atual.name.getText();
        if (ts.isVariableDeclaration(atual) && ts.isIdentifier(atual.name)) nomeDaVariavel = atual.name.getText();
        atual = atual.parent;
    }
    return nomeDaVariavel ?? '(arquivo)';
}

function ehLiteralDeTexto(no) {
    return ts.isStringLiteralLike(no) || ts.isTemplateExpression(no);
}

function coletarConstantes(arquivo) {
    const constantes = new Map();
    const visitar = (no) => {
        if (ts.isVariableDeclaration(no) && ts.isIdentifier(no.name) && no.initializer) {
            if (ehLiteralDeTexto(no.initializer)) constantes.set(no.name.text, no.initializer);
        }
        if (ts.isPropertyDeclaration(no) && ts.isIdentifier(no.name) && no.initializer && ehLiteralDeTexto(no.initializer)) constantes.set(no.name.text, no.initializer);
        ts.forEachChild(no, visitar);
    };
    visitar(arquivo);
    return constantes;
}

function pareceSql(texto) {
    const limpo = texto.trim();
    if (/^(SELECT|WITH)\s[\s\S]*\bFROM\b/.test(limpo) && !/^WITH\s+[a-záéíóúãõç]/.test(limpo.replace(/^WITH\s+RECURSIVE/, 'WITH RECURSIVE'))) return true;
    if (/^WITH\s+(RECURSIVE\s+)?\w+\s+AS\s*\(/.test(limpo)) return true;
    if (/^UPDATE\s+[\w$"{}_:]+(\s+(AS\s+)?\w+)?\s+SET\b/.test(limpo)) return true;
    if (/^INSERT\s+INTO\s/.test(limpo)) return true;
    if (/^DELETE\s+FROM\s/.test(limpo)) return true;
    if (/^FROM\s+\w+/.test(limpo)) return true;
    return /^(INNER|LEFT|RIGHT|CROSS|FULL)\s+(OUTER\s+)?JOIN\s/.test(limpo);
}

function ehFragmento(texto) {
    return !/^\s*(SELECT|WITH|UPDATE|INSERT|DELETE)\b/.test(texto);
}

/** Extrai de um arquivo TypeScript cada SQL raiz, com os fragmentos constantes já colocados no lugar. */
export function extrairConsultas(conteudo, caminho = 'arquivo.ts') {
    const arquivo = ts.createSourceFile(caminho, conteudo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const constantes = coletarConstantes(arquivo);
    const consumidos = new Set();

    const resolverExpressao = (expressao, visitados) => {
        if (ts.isParenthesizedExpression(expressao)) return resolverExpressao(expressao.expression, visitados);
        if (ts.isConditionalExpression(expressao)) return `${resolverExpressao(expressao.whenTrue, visitados)} ${resolverExpressao(expressao.whenFalse, visitados)}`;
        if (ts.isBinaryExpression(expressao) && expressao.operatorToken.kind === ts.SyntaxKind.PlusToken) return `${resolverExpressao(expressao.left, visitados)}${resolverExpressao(expressao.right, visitados)}`;
        if (ehLiteralDeTexto(expressao)) return resolverLiteral(expressao, visitados);
        const nome = ts.isIdentifier(expressao) ? expressao.text : ts.isPropertyAccessExpression(expressao) ? expressao.name.text : null;
        if (nome && constantes.has(nome) && !visitados.has(nome)) {
            const alvo = constantes.get(nome);
            consumidos.add(alvo);
            return resolverLiteral(alvo, new Set([...visitados, nome]));
        }
        return ` ${DINAMICO} `;
    };

    function resolverLiteral(literal, visitados) {
        consumidos.add(literal);
        if (ts.isStringLiteralLike(literal)) return literal.text;
        let texto = literal.head.text;
        for (const trecho of literal.templateSpans) texto += resolverExpressao(trecho.expression, visitados) + trecho.literal.text;
        return texto;
    }

    const literais = [];
    const visitar = (no) => {
        if (ehLiteralDeTexto(no)) literais.push(no);
        ts.forEachChild(no, visitar);
    };
    visitar(arquivo);

    // Primeiro resolve os maiores: o que eles consomem deixa de ser raiz.
    const textoResolvido = new Map();
    for (const literal of literais) {
        if (consumidos.has(literal)) continue;
        textoResolvido.set(literal, resolverLiteral(literal, new Set()));
        consumidos.delete(literal);
    }
    const consultas = [];
    for (const [literal, texto] of textoResolvido) {
        if (consumidos.has(literal) || !pareceSql(texto)) continue;
        consultas.push({
            sql: texto,
            metodo: nomeDoMetodo(literal),
            linha: arquivo.getLineAndCharacterOfPosition(literal.getStart(arquivo)).line + 1,
            fragmento: ehFragmento(texto),
            textoDoMetodo: textoDoMetodoEnvolvente(literal),
        });
    }

    function textoDoMetodoEnvolvente(literal) {
        let atual = literal.parent;
        while (atual && !ts.isMethodDeclaration(atual) && !ts.isFunctionDeclaration(atual)) atual = atual.parent;
        if (!atual) return '';
        const partes = [];
        const coletar = (no) => {
            if (ehLiteralDeTexto(no)) partes.push(textoResolvido.get(no) ?? (ts.isStringLiteralLike(no) ? no.text : no.getText()));
            ts.forEachChild(no, coletar);
        };
        coletar(atual);
        return partes.join('\n');
    }

    return consultas;
}

function filtroNoTexto(texto, alias) {
    return new RegExp(`\\b${alias}\\.is_deleted\\s*=\\s*false\\b`, 'i').test(texto);
}

/**
 * Julga uma consulta. Reprova tabela com `is_deleted` que não filtra o excluído e `UPDATE` que não grava `updated_date`.
 * Quando o SQL tem trecho dinâmico (`${condicoes}`), o filtro é procurado nos textos do próprio método.
 */
export function julgarConsulta(consulta, tabelas) {
    const { achados } = analisarSql(consulta.sql);
    const tabelasDaConsulta = [];
    const violacoes = [];
    for (const achado of achados) {
        const colunas = tabelas.get(achado.tabela);
        const eDinamica = achado.tabela.includes(DINAMICO) || achado.tabela.startsWith(':');
        if (achado.papel === 'INSERT') {
            tabelasDaConsulta.push(`${achado.tabela} (INSERT)`);
            continue;
        }
        if (achado.papel === 'UPSERT') {
            tabelasDaConsulta.push(`${achado.tabela} (UPSERT)`);
            if (colunas?.updatedDate && !achado.gravaUpdatedDate) violacoes.push({ regra: 'updated_date', tabela: achado.tabela, papel: achado.papel });
            continue;
        }
        tabelasDaConsulta.push(`${eDinamica ? '(tabela dinâmica)' : achado.tabela}${achado.papel === 'FROM' ? '' : ` (${achado.papel})`}`);
        if (!colunas && !eDinamica) continue;
        if (achado.papel === 'DELETE') {
            violacoes.push({ regra: 'delete-fisico', tabela: achado.tabela, papel: achado.papel });
            continue;
        }
        const leituraDeRestauracao = (METODOS_DE_RESTAURACAO.test(consulta.metodo) && achado.leExcluido)
            || (achado.tabela === 'usuario' && LEITURAS_DE_USUARIO_DO_CHAT.has(consulta.metodo));
        const restauracao = achado.papel === 'UPDATE' && achado.leExcluido && achado.gravaExclusao;
        const filtrada = achado.filtraExcluido
            || ((achado.temDinamico || consulta.fragmento) && filtroNoTexto(`${consulta.textoDoMetodo ?? ''}\n${consulta.sql}`, achado.alias));
        if (colunas?.isDeleted !== false && !filtrada && !leituraDeRestauracao && !restauracao) {
            violacoes.push({ regra: 'is_deleted', tabela: achado.tabela, papel: achado.papel });
        }
        // `SET` montado por fragmentos: a data precisa estar nos textos do próprio método.
        const gravouData = achado.gravaUpdatedDate || (achado.temDinamico && /updated_date\s*=\s*NOW\(\)/i.test(consulta.textoDoMetodo ?? ''));
        if (achado.papel === 'UPDATE' && (colunas?.updatedDate || eDinamica)) {
            if (achado.excluiLinha && gravouData) violacoes.push({ regra: 'exclusao-grava-updated_date', tabela: achado.tabela, papel: achado.papel });
            if (!achado.excluiLinha && !gravouData) violacoes.push({ regra: 'updated_date', tabela: achado.tabela, papel: achado.papel });
        }
    }
    return { tabelas: [...new Set(tabelasDaConsulta)], violacoes };
}

function listarArquivos(pasta, extensao) {
    return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = join(pasta, entrada.name);
        if (entrada.isDirectory()) return entrada.name === 'migrations' || entrada.name === 'testes' ? [] : listarArquivos(caminho, extensao);
        return entrada.name.endsWith(extensao) && !/\.(test|spec)\.ts$/.test(entrada.name) ? [caminho] : [];
    });
}

export function carregarTabelas() {
    const migrations = readdirSync(pastaMigrations).filter((nome) => nome.endsWith('.sql')).sort().map((nome) => readFileSync(join(pastaMigrations, nome), 'utf8'));
    return colunasDasMigrations(migrations);
}

/** Toda consulta do backend (repositórios, services, scripts), julgada. */
export function levantarConsultas() {
    const tabelas = carregarTabelas();
    const consultas = [];
    for (const caminho of listarArquivos(pastaBackend, '.ts')) {
        for (const consulta of extrairConsultas(readFileSync(caminho, 'utf8'), caminho)) {
            consultas.push({ arquivo: relative(raiz, caminho).replaceAll('\\', '/'), ...consulta, ...julgarConsulta(consulta, tabelas) });
        }
    }
    for (const caminho of listarArquivos(pastaBackend, '.sql')) {
        const consulta = { sql: readFileSync(caminho, 'utf8'), metodo: '(script)', linha: 1, fragmento: false };
        consultas.push({ arquivo: relative(raiz, caminho).replaceAll('\\', '/'), ...consulta, ...julgarConsulta(consulta, tabelas) });
    }
    return consultas;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const consultas = levantarConsultas();
    if (process.argv.includes('--json')) {
        console.log(JSON.stringify(consultas, (chave, valor) => (chave === 'textoDoMetodo' ? undefined : valor), 1));
    } else {
        const violacoes = consultas.flatMap((consulta) => consulta.violacoes.map((violacao) => `${consulta.arquivo}:${consulta.linha} (${consulta.metodo}): ${violacao.regra} em ${violacao.tabela} [${violacao.papel}]`));
        console.log(`SQL: ${consultas.length} consulta(s), ${violacoes.length} violação(ões).`);
        if (violacoes.length) {
            violacoes.forEach((violacao) => console.error(violacao));
            process.exitCode = 1;
        }
    }
}
