import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { format } from 'sql-formatter';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const opcoes = {
    language: 'postgresql',
    tabWidth: 4,
    keywordCase: 'preserve',
    functionCase: 'preserve',
    dataTypeCase: 'preserve',
    identifierCase: 'preserve',
    expressionWidth: 50,
    // Knex também usa :identificador: e ?? para identificadores, além de :valor.
    paramTypes: { custom: [{ regex: ':[a-zA-Z_][a-zA-Z_0-9]*(?::(?!:))?|\\?\\??' }] },
};

/** Tokens exatos: ignora apenas espaços fora de literais, identificadores e comentários. */
export function tokensSql(sql) {
    const tokens = [];
    const padrao = /\s+|--[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:''|\\[\s\S]|[^'])*'|"(?:""|[^"])*"|\$([a-zA-Z_][\w]*)?\$[\s\S]*?\$\1\$|:[a-zA-Z_][\w]*:(?!:)|:[a-zA-Z_][\w]*|\?\?|[a-zA-Z_][\w$]*|\d+(?:\.\d+)?|::|>=|<=|<>|!=|\|\||@@|->>|->|[\s\S]/g;
    for (const token of sql.matchAll(padrao)) {
        if (!/^\s+$/.test(token[0])) tokens.push(token[0]);
    }
    return tokens;
}

// O literal é o valor devolvido por um `return`, direto ou por ternário, parênteses, `??` ou `||`.
function ehValorRetornado(no) {
    let atual = no;
    while (atual.parent) {
        const pai = atual.parent;
        if (ts.isReturnStatement(pai)) return true;
        const transparente = ts.isParenthesizedExpression(pai)
            || (ts.isConditionalExpression(pai) && pai.condition !== atual)
            || (ts.isBinaryExpression(pai) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(pai.operatorToken.kind));
        if (!transparente) return false;
        atual = pai;
    }
    return false;
}

function contextoDoLiteral(no, arquivo) {
    let ancestral = no.parent;
    while (ancestral && !ts.isStatement(ancestral)) {
        if (ts.isVariableDeclaration(ancestral)) return ancestral.initializer === no ? ancestral.name.getText(arquivo) : '';
        if (ts.isCallExpression(ancestral)) {
            const primeiroArgumento = ancestral.arguments[0];
            return primeiroArgumento && no.pos >= primeiroArgumento.pos && no.end <= primeiroArgumento.end
                ? ancestral.expression.getText(arquivo) : '';
        }
        ancestral = ancestral.parent;
    }
    return '';
}

function ehSql(texto, contexto) {
    return /^\s*(?:\(*\s*(?:SELECT|WITH|INSERT\s+INTO|UPDATE|DELETE\s+FROM|EXISTS|SET\s+TIME\s+ZONE|CREATE\s+DATABASE)\b|(?:INNER|LEFT|RIGHT|CROSS)\s+JOIN\b|FROM\b|(?:ORDER\s+BY|LIMIT)\b)/i.test(texto)
        || /(?:executarConsulta|executarComando|\.raw|\.query)$/.test(contexto)
        || /^(?:COLUNAS(?:_|$)|JUNCOES?(?:_|$)|FILTROS?(?:_|$)|PARTICIPA_DA_CONVERSA|PLANO_DE_PROJETO_ATIVO|SELECIONAR_PRIORIDADE|SELECT_PLANO)/.test(contexto)
        || /^(?:condicoes|setClauses|atribuicoes|condicoesExtras)\.push$/.test(contexto);
}

function formatarTrecho(sql, contexto) {
    const colunas = /^COLUNAS(?:_|$)/.test(contexto);
    const entrada = colunas ? `SELECT ${sql}` : sql;
    let resultado = format(entrada, opcoes).trim();
    if (colunas) resultado = resultado.replace(/^SELECT\s+/, '').replace(/^ {4}/gm, '');
    if (JSON.stringify(tokensSql(sql)) !== JSON.stringify(tokensSql(resultado))) {
        throw new Error(`O formatador alterou tokens SQL (${contexto || 'consulta'}).`);
    }
    return resultado;
}

/** Formata somente literais reconhecidos de SQL; o restante da árvore TypeScript é preservado. */
function formatarPassagem(conteudo, caminho) {
    const arquivo = ts.createSourceFile(caminho, conteudo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (arquivo.parseDiagnostics.length) throw new Error(`TypeScript inválido: ${caminho}`);
    const quebra = conteudo.includes('\r\n') ? '\r\n' : '\n';

    function transformar(no) {
        const inicio = ts.isSourceFile(no) ? 0 : no.getStart(arquivo);
        const fim = no.getEnd();
        const filhos = [];
        ts.forEachChild(no, (filho) => { filhos.push(filho); });
        let original = conteudo.slice(inicio, fim);
        for (const filho of filhos.reverse()) {
            original = original.slice(0, filho.getStart(arquivo) - inicio)
                + transformar(filho) + original.slice(filho.getEnd() - inicio);
        }
        if (!ts.isStringLiteral(no) && !ts.isNoSubstitutionTemplateLiteral(no) && !ts.isTemplateExpression(no)) return original;
        if (ts.isTaggedTemplateExpression(no.parent) || ts.isImportDeclaration(no.parent)) return original;

        const contexto = contextoDoLiteral(no, arquivo);
        // Fragmento devolvido por um método (ex.: `LIMIT ${n} OFFSET ${m}`) é um valor comparado por chamadores e testes: não se reformata.
        if (!contexto && ehValorRetornado(no)) return original;
        // SQL como dado de um teste (parser, prompt, fixture) não é uma consulta executada.
        if (/\.(?:test|spec)\.ts$/.test(caminho) && !/(?:executarConsulta|executarComando|\.raw|\.query)$/.test(contexto)) return original;
        const interpolacoes = [];
        let texto;
        if (ts.isTemplateExpression(no)) {
            texto = no.head.text;
            for (const trecho of no.templateSpans) {
                let marcador = `__project20_sql_interpolacao_${interpolacoes.length}__`;
                while (original.includes(marcador)) marcador += '_';
                interpolacoes.push({ marcador, expressao: transformar(trecho.expression) });
                texto += marcador + trecho.literal.text;
            }
        } else texto = no.text;
        if (!texto.trim() || !ehSql(texto, contexto)) return original;
        // `LISTEN canal` aparece em pg_stat_activity.query e é localizado por igualdade de texto (publicador-postgres): precisa ficar numa linha.
        if (/^\s*(?:UN)?LISTEN\b/i.test(texto)) return original;

        let formatado;
        try { formatado = formatarTrecho(texto, contexto); }
        catch (erro) {
            const linha = arquivo.getLineAndCharacterOfPosition(inicio).line + 1;
            throw new Error(`${caminho}:${linha}: ${erro.message}`, { cause: erro });
        }
        // Mantém separação em fragmentos concatenados sem espaço no consumidor.
        if (/^\s/.test(texto)) formatado = '\n' + formatado;
        if (/\s$/.test(texto)) formatado += '\n';
        const linhaInicio = conteudo.lastIndexOf('\n', inicio - 1) + 1;
        const indentacao = conteudo.slice(linhaInicio, inicio).match(/^\s*/)[0];
        const corpo = formatado.trim();
        const multiline = corpo.includes('\n') || ts.isTemplateExpression(no) || ts.isNoSubstitutionTemplateLiteral(no);
        let resultado;
        if (multiline) {
            const escapado = corpo.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
            resultado = '`' + quebra + escapado.split('\n').map((linha) => indentacao + '    ' + linha).join(quebra) + quebra + indentacao + '`';
        } else {
            const aspas = original[0];
            resultado = aspas + formatado.replace(/\\/g, '\\\\').replace(new RegExp(aspas, 'g'), '\\' + aspas).replace(/\n/g, '\\n') + aspas;
        }
        for (const { marcador, expressao } of interpolacoes) resultado = resultado.replace(marcador, () => '${' + expressao + '}');
        return resultado;
    }
    return transformar(arquivo);
}

export function formatarSqlDoArquivo(conteudo, caminho = 'consulta.repository.ts') {
    // Templates aninhados adotam a margem da SQL externa na passagem seguinte.
    for (let passagem = 0; passagem < 10; passagem++) {
        const formatado = formatarPassagem(conteudo, caminho);
        if (formatado === conteudo) return formatado;
        conteudo = formatado;
    }
    throw new Error(`A formatação SQL não convergiu: ${caminho}`);
}

export function listarRepositorios(pasta = join(raiz, 'backend/src')) {
    return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = join(pasta, entrada.name);
        return entrada.isDirectory() ? listarRepositorios(caminho) : entrada.name.endsWith('.repository.ts') ? [caminho] : [];
    }).sort();
}

export function listarFontesSql(pasta = join(raiz, 'backend/src')) {
    return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = join(pasta, entrada.name);
        if (entrada.isDirectory()) return entrada.name === 'migrations' ? [] : listarFontesSql(caminho);
        return /\.(?:ts|sql)$/.test(entrada.name) ? [caminho] : [];
    }).sort();
}

function formatarCorpoProcedural(corpo) {
    const linhas = corpo.split('\n');
    const margens = linhas.filter((linha) => /^ +\S/.test(linha)).map((linha) => linha.match(/^ +/)[0].length);
    const unidade = Math.min(...margens);
    const normalizadas = linhas.map((linha) => linha.replace(/^ +/, (espacos) => ' '.repeat(espacos.length * 4 / unidade)));
    for (let indice = 0; indice < normalizadas.length; indice++) {
        if (!/^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|SELECT\s+.*\bINTO\b)/i.test(normalizadas[indice])) continue;
        const inicio = indice;
        let consulta = normalizadas[indice];
        const fimDoComando = (sql) => [...sql.matchAll(/--[^\n]*|'(?:''|[^'])*'|;/g)].find((token) => token[0] === ';');
        while (!fimDoComando(consulta) && indice + 1 < normalizadas.length) consulta += '\n' + normalizadas[++indice];
        const fim = fimDoComando(consulta);
        if (!fim || consulta.slice(fim.index + 1).trim()) throw new Error('Comando procedural ambíguo; formatação recusada.');
        const margem = normalizadas[inicio].match(/^\s*/)[0];
        const formatadas = formatarTrecho(consulta.trim(), 'SQL do corpo procedural').split('\n').map((linha) => margem + linha);
        normalizadas.splice(inicio, indice - inicio + 1, ...formatadas);
        indice = inicio + formatadas.length - 1;
    }
    const resultado = normalizadas.join('\n');
    if (JSON.stringify(tokensSql(corpo)) !== JSON.stringify(tokensSql(resultado))) throw new Error('Tokens do corpo procedural alterados.');
    return resultado;
}

export function formatarArquivoSql(conteudo) {
    const quebra = conteudo.includes('\r\n') ? '\r\n' : '\n';
    let sql = conteudo.replace(/\r\n/g, '\n');
    const bloco = /\bDO (\$(?:[a-zA-Z_][a-zA-Z_0-9]*)?\$)([\s\S]*?)\1;/g;
    const corpos = [];
    sql = sql.replace(bloco, (_, delimitador, corpo) => {
        let marcador = `__project20_corpo_${corpos.length}__`;
        while (sql.includes(marcador)) marcador += '_';
        corpos.push({ marcador, delimitador, corpo: formatarCorpoProcedural(corpo) });
        return `DO '${marcador}';`;
    });
    let resultado = formatarTrecho(sql, 'arquivo SQL');
    for (const { marcador, delimitador, corpo } of corpos) resultado = resultado.replace(`'${marcador}'`, () => delimitador + corpo + delimitador);
    return resultado.replace(/\n/g, quebra) + quebra;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const verificar = process.argv.includes('--check');
    const argumentos = process.argv.slice(2).filter((argumento) => argumento !== '--check');
    if (argumentos.some((argumento) => argumento.startsWith('-'))) throw new Error('Uso: node scripts/formatar-sql.mjs [--check] [arquivo.repository.ts ...]');
    const arquivos = argumentos.length ? argumentos.map((caminho) => resolve(caminho)) : listarFontesSql();
    const alterados = [];
    for (const caminho of arquivos) {
        if (!/\.(?:ts|sql)$/.test(caminho) || /[\\/]migrations[\\/]/.test(caminho)) throw new Error(`Fora do escopo SQL: ${caminho}`);
        const original = readFileSync(caminho, 'utf8');
        const formatado = caminho.endsWith('.sql') ? formatarArquivoSql(original) : formatarSqlDoArquivo(original, caminho);
        if (formatado !== original) {
            alterados.push(caminho);
            if (!verificar) writeFileSync(caminho, formatado);
        }
    }
    console.log(`SQL: ${arquivos.length} fontes; ${alterados.length} ${verificar ? 'fora do padrão' : 'formatados'}.`);
    if (verificar && alterados.length) {
        for (const caminho of alterados) console.error(caminho);
        process.exitCode = 1;
    }
}
