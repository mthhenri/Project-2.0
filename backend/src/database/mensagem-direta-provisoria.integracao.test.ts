import * as assert from 'node:assert/strict';
import { testarComBanco, ConexaoTeste } from '../testes/banco-teste';
import { DATA_BASE_TESTE } from '../testes/fabricas';

// Tabela provisória das mensagens entre colaboradores (migration 0051, task 207): as constraints existem e funcionam. O comportamento do
// armazenamento é provado pela suíte de contrato (`mensagem-direta-postgres.repository.integracao.test.ts`); aqui ficam o schema e a marca
// de "provisória", que o plano de remoção usa.

const UNICO = '23505';
const CHECK = '23514';
const UUID_UM = '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10';
const UUID_DOIS = '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a11';

async function esperarFalha(conexao: ConexaoTeste, codigo: string, sql: string, parametros: Record<string, unknown>): Promise<void> {
    await assert.rejects(
        conexao.transaction(async (savepoint) => {
            await savepoint.raw(sql, parametros as any);
        }),
        (erro: { code?: string }) => erro.code === codigo,
        `era esperada a falha ${codigo}`,
    );
}

const INSERIR_MENSAGEM = `
  INSERT INTO mensagem_direta
    (created_date, updated_date, is_deleted, mensagem_id, conversa_id, conversa_tipo, usuario_menor_id, usuario_maior_id, autor_usuario_id, autor, texto,
     contem_codigo, mencoes, referencias)
  SELECT :dataBase::timestamptz, :dataBase::timestamptz, false, :mensagemId::uuid, :conversaId::varchar, 'DIRETA', :menorId::integer, :maiorId::integer,
         :menorId::integer, 'USUARIO', 'Oi', false, CAST('{}' AS integer[]), CAST('{DEMANDA:212}' AS text[])
  RETURNING id`;

// A mensagem de grupo (migration 0087, task 246): sem participantes, com o grupo; `conversa_id` é `G<grupo_id>`.
const INSERIR_MENSAGEM_DE_GRUPO = `
  INSERT INTO mensagem_direta
    (created_date, updated_date, is_deleted, mensagem_id, conversa_id, conversa_tipo, grupo_id, autor_usuario_id, autor, texto,
     contem_codigo, mencoes, referencias)
  SELECT :dataBase::timestamptz, :dataBase::timestamptz, false, :mensagemId::uuid, :conversaId::varchar, :conversaTipo::varchar, :grupoId::integer,
         4, 'USUARIO', 'Oi', false, CAST('{}' AS integer[]), CAST('{}' AS text[])
  RETURNING id`;

const mensagemDeGrupo = (mensagemId: string, conversaId: string, conversaTipo: string, grupoId: number) => ({ dataBase: DATA_BASE_TESTE, mensagemId, conversaId, conversaTipo, grupoId });

const mensagem = (mensagemId: string, conversaId: string, menorId: number, maiorId: number) => ({ dataBase: DATA_BASE_TESTE, mensagemId, conversaId, menorId, maiorId });

testarComBanco('mensagem_direta: o mensagem_id é único (mesmo excluído) e não exige usuário cadastrado', async (conexao) => {
    await conexao.raw(INSERIR_MENSAGEM, mensagem(UUID_UM, '900000001-900000002', 900000001, 900000002) as any);
    await esperarFalha(conexao, UNICO, INSERIR_MENSAGEM, mensagem(UUID_UM, '900000001-900000003', 900000001, 900000003));
    await conexao.raw(INSERIR_MENSAGEM, mensagem(UUID_DOIS, '900000001-900000002', 900000001, 900000002) as any);
    await conexao.raw(`
        UPDATE mensagem_direta
        SET
            is_deleted = true
        WHERE
            mensagem_id = :mensagemId::uuid
    `, { mensagemId: UUID_UM });
    await esperarFalha(conexao, UNICO, INSERIR_MENSAGEM, mensagem(UUID_UM, '900000001-900000002', 900000001, 900000002));
});

testarComBanco('mensagem_direta: recusa participantes fora de ordem ou iguais e conversa_id que não bate com os ids', async (conexao) => {
    await esperarFalha(conexao, CHECK, INSERIR_MENSAGEM, mensagem(UUID_UM, '9-4', 9, 4));
    await esperarFalha(conexao, CHECK, INSERIR_MENSAGEM, mensagem(UUID_UM, '4-4', 4, 4));
    await esperarFalha(conexao, CHECK, INSERIR_MENSAGEM, mensagem(UUID_UM, '4-9x', 4, 9));
    await esperarFalha(conexao, CHECK, INSERIR_MENSAGEM, mensagem(UUID_UM, '4-10', 4, 9));
    await conexao.raw(INSERIR_MENSAGEM, mensagem(UUID_UM, '4-9', 4, 9) as any);
});

testarComBanco('mensagem_direta: a mensagem de grupo exige o grupo e o conversa_id G<grupo_id>; o tipo e o formato se excluem', async (conexao) => {
    await conexao.raw(INSERIR_MENSAGEM_DE_GRUPO, mensagemDeGrupo(UUID_UM, 'G7', 'GRUPO', 7) as any);
    await esperarFalha(conexao, CHECK, INSERIR_MENSAGEM_DE_GRUPO, mensagemDeGrupo(UUID_DOIS, 'G8', 'GRUPO', 7));
    await esperarFalha(conexao, CHECK, INSERIR_MENSAGEM_DE_GRUPO, mensagemDeGrupo(UUID_DOIS, '4-9', 'GRUPO', 7));
    await esperarFalha(conexao, CHECK, INSERIR_MENSAGEM_DE_GRUPO, mensagemDeGrupo(UUID_DOIS, 'G7', 'DIRETA', 7));
    await esperarFalha(conexao, CHECK, INSERIR_MENSAGEM, { ...mensagem(UUID_DOIS, 'G7', 4, 9) });
});

testarComBanco('mensagem_direta: guarda os arrays de menções e referências', async (conexao) => {
    await conexao.raw(INSERIR_MENSAGEM, mensagem(UUID_UM, '4-9', 4, 9) as any);
    await conexao.raw(`
        UPDATE mensagem_direta
        SET
            contem_codigo = true,
            mencoes = CAST(:mencoes AS integer[])
        WHERE
            mensagem_id = :mensagemId::uuid
    `, {
        mensagemId: UUID_UM,
        mencoes: [4, 9],
    });
    const { rows } = await conexao.raw(`
        SELECT
            mencoes,
            referencias
        FROM
            mensagem_direta
        WHERE
            mensagem_id = :mensagemId::uuid
    `, { mensagemId: UUID_UM });
    assert.deepEqual(rows[0].mencoes, [4, 9]);
    assert.deepEqual(rows[0].referencias, ['DEMANDA:212']);
});

testarComBanco('mensagem_direta tem os campos de BaseEntity, nenhuma coluna tem DEFAULT (fora o id) e a tabela está marcada como provisória', async (conexao) => {
    const { rows } = await conexao.raw(
        `
            SELECT
                information_schema.columns.column_name AS coluna,
                information_schema.columns.column_default AS padrao,
                information_schema.columns.is_nullable AS anulavel
            FROM
                information_schema.columns
            WHERE
                information_schema.columns.table_schema = 'public'
                AND information_schema.columns.table_name = 'mensagem_direta'
        `,
    );
    const nomes = rows.map((linha: { coluna: string }) => linha.coluna);
    for (const base of ['id', 'created_date', 'updated_date', 'is_deleted', 'deleted_date']) assert.ok(nomes.includes(base), `sem a coluna ${base}`);
    assert.deepEqual(rows.filter((linha: { coluna: string; padrao: string | null }) => linha.coluna !== 'id' && linha.padrao !== null).map((linha: { coluna: string }) => linha.coluna), []);
    for (const obrigatoria of ['created_date', 'updated_date', 'is_deleted', 'mensagem_id', 'conversa_id', 'conversa_tipo', 'texto', 'mencoes', 'referencias']) {
        assert.equal(rows.find((linha: { coluna: string }) => linha.coluna === obrigatoria).anulavel, 'NO', `${obrigatoria} deveria ser NOT NULL`);
    }
    const { rows: comentario } = await conexao.raw(`
        SELECT
            obj_description('mensagem_direta'::regclass, 'pg_class') AS texto
    `);
    assert.match(comentario[0].texto, /PROVISÓRIA \(task 207\)/);
});
