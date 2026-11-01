import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { formatarArquivoSql, formatarSqlDoArquivo, listarFontesSql, listarRepositorios, tokensSql } from './formatar-sql.mjs';

test('formata PostgreSQL preservando parâmetros, casts, literais e aliases', () => {
    const fonte = `const consulta = \`SELECT usuario.id, 'a  b''c' AS "Nome Completo", :inicio::date FROM usuario WHERE is_deleted = false AND usuario.id = :usuarioId\`;`;
    const resultado = formatarSqlDoArquivo(fonte);
    assert.match(resultado, /SELECT\n {4} {4}usuario.id,/);
    assert.match(resultado, /'a {2}b''c'/);
    assert.match(resultado, /:inicio::date/);
    assert.equal(formatarSqlDoArquivo(resultado), resultado);
});

test('preserva mensagens, padrões de busca, SQL em comentário e strings sem contexto SQL', () => {
    const fonte = '// SELECT não é consulta\nconst mensagem = `Falha: ${erro}`;\nconst busca = `%${texto}%`;\nconst alias = "nomeCompleto";\n';
    assert.equal(formatarSqlDoArquivo(fonte), fonte);
});

test('não confunde metadados de colunas e SQL de fixture com consultas executadas', () => {
    const metadados = 'const COLUNAS_RELATORIO = [{ titulo: "Nome completo", campo: "nomeCompleto" }];';
    assert.equal(formatarSqlDoArquivo(metadados), metadados);
    const fixture = 'const fonte = `SELECT id, nome FROM usuario`;\nconst esperado = "SELECT 1";';
    assert.equal(formatarSqlDoArquivo(fixture, 'parser.test.ts'), fixture);
    assert.notEqual(formatarSqlDoArquivo('conexao.raw(`SELECT id, nome FROM usuario`);', 'consulta.test.ts'), 'conexao.raw(`SELECT id, nome FROM usuario`);');
});

test('suporta bindings Knex de valor, identificador e casts adjacentes', () => {
    const fonte = "conexao.raw('SELECT :coluna: FROM :tabela: WHERE id = :id AND data = :inicio::date'); conexao.raw('CREATE DATABASE ??');";
    const resultado = formatarSqlDoArquivo(fonte);
    assert.match(resultado, /:coluna:/);
    assert.match(resultado, /:inicio::date/);
    assert.match(resultado, /CREATE DATABASE \?\?/);
    assert.equal(formatarSqlDoArquivo(resultado), resultado);
});

test('formata SQL operacional e o corpo DO preservando strings e fluxo procedural', () => {
    const fonte = "-- script\nDO $seed$\nDECLARE\n  nome text := 'a  b';\nBEGIN\n  IF true THEN\n    INSERT INTO usuario (nome, is_deleted) SELECT nome, false;\n  END IF;\nEND;\n$seed$;\n";
    const resultado = formatarArquivoSql(fonte);
    assert.match(resultado, /\n {4}nome text := 'a {2}b';/);
    assert.match(resultado, /INSERT INTO\n {12}usuario/);
    assert.equal(formatarArquivoSql(resultado), resultado);
});

function assinaturaDaArvore(conteudo) {
    const arquivo = ts.createSourceFile('fonte.ts', conteudo, ts.ScriptTarget.Latest, true);
    function assinar(no) {
        if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) return ['literal', tokensSql(no.text)];
        if (ts.isTemplateExpression(no)) {
            const sql = no.head.text + no.templateSpans.map((trecho, indice) => `__interpolacao_${indice}__${trecho.literal.text}`).join('');
            return ['template', tokensSql(sql), no.templateSpans.map((trecho) => assinar(trecho.expression))];
        }
        if (ts.isTemplateHead(no) || ts.isTemplateMiddle(no) || ts.isTemplateTail(no)) return [no.kind, tokensSql(no.text)];
        const filhos = [];
        ts.forEachChild(no, (filho) => { filhos.push(assinar(filho)); });
        return filhos.length ? [no.kind, filhos] : [no.kind, no.getText(arquivo)];
    }
    return assinar(arquivo);
}

test('preserva expressões interpoladas, inclusive SQL aninhado e parâmetros dinâmicos', () => {
    const fonte = 'const consulta = `${ULTIMA(`SELECT id, texto FROM mensagem_direta WHERE ${filtros.join(" AND ")}`)} ORDER BY ${campo} ${direcao}`;';
    const resultado = formatarSqlDoArquivo(fonte);
    assert.match(resultado, /\$\{ULTIMA\(`/);
    assert.match(resultado, /\$\{filtros.join\(" AND "\)\}/);
    assert.match(resultado, /\$\{campo\}/);
    assert.match(resultado, /\$\{direcao\}/);
    assert.equal(formatarSqlDoArquivo(resultado), resultado);
});

test('formata fragmentos de colunas, junções e condições sem modificar seu conteúdo', () => {
    const fonte = 'const COLUNAS = `usuario.id, usuario.nome AS "nomeCompleto"`;\nconst JUNCAO = `FROM usuario INNER JOIN atividade ON atividade.usuario_id = usuario.id`;\ncondicoes.push("usuario.is_deleted = false AND usuario.id = :id");';
    const resultado = formatarSqlDoArquivo(fonte);
    assert.match(resultado, /usuario.id,\n/);
    assert.match(resultado, /INNER JOIN/);
    assert.equal(formatarSqlDoArquivo(resultado), resultado);
});

test('preserva barras e espaços significativos em strings SQL e quebras CRLF', () => {
    const fonte = 'const consulta = `SELECT regexp_replace(texto, \'[[:space:]]+\', \'a  b\', \'g\') FROM mensagem WHERE texto LIKE \'%\\\\_%\'`;\r\n';
    const resultado = formatarSqlDoArquivo(fonte);
    assert.match(resultado, /'a {2}b'/);
    assert.match(resultado, /'%\\\\_%'/);
    assert.ok(!/(?<!\r)\n/.test(resultado));
    assert.equal(formatarSqlDoArquivo(resultado), resultado);
});

test('tokens distinguem literais e parâmetros, aceitando apenas whitespace externo', () => {
    assert.deepEqual(tokensSql("SELECT :nome, 'a  b', \"c d\""), tokensSql("SELECT\n :nome , 'a  b' , \"c d\""));
    assert.notDeepEqual(tokensSql("SELECT 'a  b'"), tokensSql("SELECT 'a b'"));
    assert.notDeepEqual(tokensSql('SELECT :nome'), tokensSql('SELECT :outroNome'));
});

test('todos os repositories reais são formatáveis e o resultado é idempotente', () => {
    const arquivos = listarRepositorios();
    assert.ok(arquivos.length > 20);
    for (const caminho of arquivos) {
        const resultado = formatarSqlDoArquivo(readFileSync(caminho, 'utf8'), caminho);
        assert.equal(formatarSqlDoArquivo(resultado, caminho), resultado, caminho);
    }
});

test('fontes executáveis reais preservam árvore TS, tokens SQL e idempotência', () => {
    for (const caminho of listarFontesSql()) {
        const original = readFileSync(caminho, 'utf8');
        if (caminho.endsWith('.sql')) {
            const resultado = formatarArquivoSql(original);
            assert.equal(formatarArquivoSql(resultado), resultado, caminho);
        } else {
            const resultado = formatarSqlDoArquivo(original, caminho);
            assert.deepEqual(assinaturaDaArvore(resultado), assinaturaDaArvore(original), caminho);
            assert.equal(formatarSqlDoArquivo(resultado, caminho), resultado, caminho);
        }
    }
});

test('não reformata fragmento devolvido por método nem a instrução LISTEN, que são comparados por texto', () => {
    const fragmento = 'function paginar() {\n    return `LIMIT ${itensPorPagina} OFFSET ${deslocamento}`;\n}\n';
    assert.equal(formatarSqlDoArquivo(fragmento), fragmento);
    const escuta = 'await cliente.query(`LISTEN ${canal}`);\n';
    assert.equal(formatarSqlDoArquivo(escuta), escuta);
});
