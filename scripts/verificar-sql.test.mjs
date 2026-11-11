import assert from 'node:assert/strict';
import test from 'node:test';
import { analisarSql, carregarTabelas, colunasDasMigrations, extrairConsultas, julgarConsulta, levantarConsultas } from './verificar-sql.mjs';

const tabelas = new Map([
    ['usuario', { isDeleted: true, updatedDate: true }],
    ['demanda', { isDeleted: true, updatedDate: true }],
    ['atividade', { isDeleted: true, updatedDate: true }],
    ['execucao', { isDeleted: true, updatedDate: true }],
]);

function violacoes(sql, metodo = 'qualquer') {
    return julgarConsulta({ sql, metodo, fragmento: false }, tabelas).violacoes.map((violacao) => `${violacao.regra}:${violacao.tabela}`);
}

test('reprova SELECT, JOIN, subconsulta, EXISTS e CTE sem o filtro, em cada tabela', () => {
    assert.deepEqual(violacoes('SELECT id FROM usuario'), ['is_deleted:usuario']);
    assert.deepEqual(
        violacoes('SELECT atividade.id FROM atividade INNER JOIN execucao ON execucao.atividade_id = atividade.id WHERE atividade.is_deleted = false'),
        ['is_deleted:execucao'],
    );
    assert.deepEqual(
        violacoes('SELECT (SELECT COUNT(*) FROM execucao WHERE execucao.id = 1) FROM usuario WHERE usuario.is_deleted = false'),
        ['is_deleted:execucao'],
    );
    assert.deepEqual(violacoes('SELECT 1 WHERE EXISTS (SELECT 1 FROM demanda WHERE demanda.id = 1)'), ['is_deleted:demanda']);
    assert.deepEqual(
        violacoes('WITH RECURSIVE arvore AS (SELECT id FROM demanda WHERE is_deleted = false UNION ALL SELECT filho.id FROM demanda AS filho INNER JOIN arvore ON filho.demanda_pai_id = arvore.id) SELECT * FROM arvore'),
        ['is_deleted:demanda'],
    );
});

test('aceita o filtro no ON, no WHERE, sem qualificar em tabela única e com alias', () => {
    assert.deepEqual(violacoes('SELECT id FROM usuario WHERE is_deleted = false'), []);
    assert.deepEqual(violacoes('SELECT atividade.id FROM atividade INNER JOIN execucao ON execucao.atividade_id = atividade.id AND execucao.is_deleted = false WHERE atividade.is_deleted = false'), []);
    assert.deepEqual(violacoes('SELECT dono.id FROM usuario AS dono WHERE dono.is_deleted = false'), []);
    assert.deepEqual(violacoes('SELECT dono.id FROM usuario dono LEFT JOIN demanda ON demanda.id = 1 AND demanda.is_deleted = false WHERE (dono.is_deleted = false)'), []);
});

test('o filtro de outra tabela ou o filtro sem qualificar em junção não valem', () => {
    assert.deepEqual(
        violacoes('SELECT usuario.id FROM usuario INNER JOIN demanda ON demanda.id = 1 WHERE is_deleted = false'),
        ['is_deleted:usuario', 'is_deleted:demanda'],
    );
});

test('não confunde FROM de função, CTE própria, tabela do catálogo nem função de conjunto', () => {
    assert.deepEqual(violacoes(`SELECT EXTRACT(EPOCH FROM usuario.created_date) FROM usuario WHERE usuario.is_deleted = false`), []);
    assert.deepEqual(violacoes('SELECT TRIM(BOTH FROM nome), a IS DISTINCT FROM b FROM usuario WHERE is_deleted = false'), []);
    assert.deepEqual(violacoes('WITH usuario AS (SELECT 1 AS id) SELECT id FROM usuario'), []);
    assert.deepEqual(violacoes('SELECT table_name FROM information_schema.tables'), []);
    assert.deepEqual(violacoes('SELECT dia FROM generate_series(1, 2) AS dia'), []);
    assert.deepEqual(violacoes('SELECT id FROM usuario WHERE is_deleted = false FOR UPDATE'), []);
});

test('UPDATE filtra o excluído; UPDATE ... FROM vale para as duas tabelas; o SET de exclusão não conta como filtro', () => {
    assert.deepEqual(violacoes('UPDATE usuario SET nome = :nome, updated_date = NOW() WHERE id = :id'), ['is_deleted:usuario']);
    assert.deepEqual(violacoes('UPDATE usuario SET nome = :nome, updated_date = NOW() WHERE id = :id AND is_deleted = false'), []);
    assert.deepEqual(violacoes('UPDATE usuario SET is_deleted = true, deleted_date = NOW() WHERE id = :id'), ['is_deleted:usuario']);
    assert.deepEqual(violacoes('UPDATE usuario SET is_deleted = true, deleted_date = NOW() WHERE id = :id AND is_deleted = false'), []);
    assert.deepEqual(
        violacoes('UPDATE atividade SET nome = :nome, updated_date = NOW() FROM demanda WHERE demanda.id = atividade.demanda_id AND atividade.is_deleted = false'),
        ['is_deleted:demanda'],
    );
});

test('UPDATE sem updated_date é reprovado; exclusão não pode gravar a data; restauração grava', () => {
    assert.deepEqual(violacoes('UPDATE usuario SET nome = :nome WHERE id = :id AND is_deleted = false'), ['updated_date:usuario']);
    assert.deepEqual(violacoes('UPDATE usuario SET is_deleted = true, deleted_date = NOW(), updated_date = NOW() WHERE id = :id AND is_deleted = false'), ['exclusao-grava-updated_date:usuario']);
    assert.deepEqual(violacoes('UPDATE usuario SET is_deleted = false, deleted_date = NULL WHERE id = :id AND is_deleted = true'), ['updated_date:usuario']);
    assert.deepEqual(violacoes('UPDATE usuario SET is_deleted = false, deleted_date = NULL, updated_date = NOW() WHERE id = :id AND is_deleted = true'), []);
});

test('CTE que altera dado é cobrada como qualquer outra', () => {
    assert.deepEqual(violacoes('WITH alterada AS (UPDATE usuario SET nome = :nome WHERE id = 1 RETURNING id) SELECT id FROM alterada'), ['is_deleted:usuario', 'updated_date:usuario']);
    assert.deepEqual(violacoes('WITH removida AS (DELETE FROM usuario WHERE id = 1 RETURNING id) SELECT id FROM removida'), ['delete-fisico:usuario']);
});

test('tabela depois de vírgula, de função de conjunto ou de subconsulta também é cobrada', () => {
    assert.deepEqual(violacoes('SELECT 1 FROM jsonb_each(:x) AS par, usuario'), ['is_deleted:usuario']);
    assert.deepEqual(violacoes('SELECT 1 FROM (SELECT 1 AS um) AS sub, usuario'), ['is_deleted:usuario']);
});

test('tabela vinda de parâmetro precisa do filtro', () => {
    assert.deepEqual(julgarConsulta({ sql: 'SELECT id FROM :tabela: WHERE id = 1', metodo: 'x', fragmento: false }, tabelas).violacoes.map((violacao) => violacao.regra), ['is_deleted']);
    assert.deepEqual(julgarConsulta({ sql: 'SELECT id FROM :tabela: WHERE id = 1 AND is_deleted = false', metodo: 'x', fragmento: false }, tabelas).violacoes, []);
});

test('UPDATE com apelido sem AS é reconhecido', () => {
    assert.equal(extrairConsultas("const c = `UPDATE usuario alvo SET nome = 'x' WHERE alvo.id = 1`;").length, 1);
});

test('o WHERE do ON CONFLICT não conta como filtro de leitura', () => {
    assert.deepEqual(
        violacoes('INSERT INTO usuario (nome) SELECT demanda.nome FROM demanda ON CONFLICT (nome) WHERE is_deleted = false DO UPDATE SET nome = EXCLUDED.nome, updated_date = NOW()'),
        ['is_deleted:demanda'],
    );
});

test('upsert com DO UPDATE grava a data', () => {
    assert.deepEqual(violacoes('INSERT INTO usuario (nome) SELECT :nome ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome'), ['updated_date:usuario']);
    assert.deepEqual(violacoes('INSERT INTO usuario (nome) SELECT :nome ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome, updated_date = NOW()'), []);
    assert.deepEqual(violacoes('INSERT INTO usuario (nome) SELECT :nome'), []);
});

test('SET dinâmico precisa ter a data nos textos do próprio método', () => {
    const fonte = (inicial) => `
        class Repositorio {
            async alterar() {
                const setClauses = ['${inicial}'];
                return this.executarConsulta(\`UPDATE usuario SET \${setClauses.join(', ')} WHERE usuario.id = :id AND usuario.is_deleted = false\`);
            }
        }
    `;
    assert.deepEqual(julgarConsulta(extrairConsultas(fonte('updated_date = NOW()'))[0], tabelas).violacoes, []);
    assert.deepEqual(julgarConsulta(extrairConsultas(fonte('versao = versao + 1'))[0], tabelas).violacoes.map((violacao) => violacao.regra), ['updated_date']);
});

test('UNION: cada ramo precisa do próprio filtro', () => {
    assert.deepEqual(violacoes('SELECT id FROM usuario WHERE is_deleted = false UNION ALL SELECT id FROM demanda'), ['is_deleted:demanda']);
});

test('isenções fechadas: leitura de restauração, restauração e as leituras de usuário do chat', () => {
    assert.deepEqual(violacoes('SELECT id FROM usuario WHERE id = :id AND is_deleted = true', 'recuperarExcluido'), []);
    assert.deepEqual(violacoes('SELECT id FROM usuario WHERE id = :id', 'recuperarExcluido'), ['is_deleted:usuario'], 'sem procurar a linha excluída não é restauração');
    assert.deepEqual(violacoes('SELECT usuario.id FROM usuario INNER JOIN demanda ON demanda.id = 1 WHERE usuario.is_deleted = true', 'recuperarExcluido'), ['is_deleted:demanda'], 'a isenção não alcança a junção');
    assert.deepEqual(violacoes('SELECT id FROM usuario WHERE id = :id AND is_deleted = true', 'recuperar'), ['is_deleted:usuario']);
    assert.deepEqual(violacoes('UPDATE usuario SET is_deleted = false, deleted_date = NULL, updated_date = NOW() WHERE id = :id AND is_deleted = true'), []);
    assert.deepEqual(violacoes('SELECT usuario.id FROM usuario WHERE usuario.id = 1', 'listarTiposPorIds'), []);
    assert.deepEqual(
        violacoes('SELECT demanda.id FROM demanda WHERE demanda.id = 1', 'listarTiposPorIds'),
        ['is_deleted:demanda'],
        'a isenção é só da tabela usuario',
    );
});

test('DELETE físico é sempre reprovado', () => {
    assert.deepEqual(violacoes('DELETE FROM usuario WHERE id = :id'), ['delete-fisico:usuario']);
});

test('tabela sem is_deleted não é cobrada', () => {
    const semColuna = new Map([['log_tecnico', { isDeleted: false, updatedDate: false }]]);
    assert.deepEqual(julgarConsulta({ sql: 'SELECT id FROM log_tecnico', metodo: 'x', fragmento: false }, semColuna).violacoes, []);
});

test('extrai SQL do TypeScript, junta os fragmentos constantes e dá nome ao método', () => {
    const consultas = extrairConsultas(`
        const JUNCOES = \`INNER JOIN demanda ON demanda.id = atividade.demanda_id AND demanda.is_deleted = false\`;
        class Repositorio {
            async listar() {
                return this.executarConsulta(\`SELECT atividade.id FROM atividade \${JUNCOES} WHERE atividade.is_deleted = false\`);
            }
        }
    `);
    assert.equal(consultas.length, 1);
    assert.equal(consultas[0].metodo, 'listar');
    assert.match(consultas[0].sql, /INNER JOIN demanda/);
    assert.deepEqual(julgarConsulta(consultas[0], tabelas).violacoes, []);
});

test('condição montada por fragmentos é procurada nos textos do próprio método', () => {
    const fonte = (filtro) => `
        class Repositorio {
            async listar() {
                const condicoes = ['${filtro}'];
                return this.executarConsulta(\`SELECT id FROM usuario WHERE \${condicoes.join(' AND ')}\`);
            }
        }
    `;
    assert.deepEqual(julgarConsulta(extrairConsultas(fonte('usuario.is_deleted = false'))[0], tabelas).violacoes, []);
    assert.deepEqual(julgarConsulta(extrairConsultas(fonte('usuario.ativo = true'))[0], tabelas).violacoes.map((violacao) => violacao.regra), ['is_deleted']);
});

test('analisarSql ignora comentário e literal', () => {
    const { achados } = analisarSql(`SELECT 'FROM usuario' -- FROM demanda
        FROM execucao WHERE is_deleted = false`);
    assert.deepEqual(achados.map((achado) => achado.tabela), ['execucao']);
});

test('colunasDasMigrations acompanha criação, renomeação e remoção, só no UP', () => {
    const colunas = colunasDasMigrations([
        '-- UP\nCREATE TABLE antiga (id INT, is_deleted BOOLEAN, updated_date TIMESTAMPTZ);\n-- DOWN\nDROP TABLE antiga;',
        '-- UP\nALTER TABLE antiga RENAME TO nova;',
        '-- UP\nCREATE TABLE sem_coluna (id INT);\nCREATE TABLE temporaria (id INT, is_deleted BOOLEAN);\nDROP TABLE temporaria;',
    ]);
    assert.deepEqual([...colunas.keys()].sort(), ['nova', 'sem_coluna']);
    assert.equal(colunas.get('nova').isDeleted, true);
    assert.equal(colunas.get('sem_coluna').isDeleted, false);
});

test('o código real está limpo e as tabelas de negócio vieram das migrations', () => {
    assert.equal(carregarTabelas().get('execucao')?.isDeleted, true);
    const falhas = levantarConsultas().flatMap((consulta) => consulta.violacoes.map((violacao) => `${consulta.arquivo}:${consulta.linha} ${violacao.regra} ${violacao.tabela}`));
    assert.deepEqual(falhas, []);
});
