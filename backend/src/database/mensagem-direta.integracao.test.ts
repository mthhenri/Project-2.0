import * as assert from 'node:assert/strict';
import { testarComBanco, ConexaoTeste } from '../testes/banco-teste';
import { criarUsuario, DATA_BASE_TESTE } from '../testes/fabricas';

// Schema do chat entre colaboradores (migration 0050, task 205): as constraints existem e funcionam. Não há repository ainda; o que
// este teste protege é o que a service e os repositories das próximas tasks vão assumir (unicidade, CHECKs e FKs).

const UNICO = '23505';
const CHECK = '23514';
const CHAVE_ESTRANGEIRA = '23503';
const ID_QUE_NAO_EXISTE = 2_000_000_000;

/** Executa o SQL num savepoint e espera a falha de banco com o código dado (uma falha dentro da transação do teste a abortaria). */
async function esperarFalha(conexao: ConexaoTeste, codigo: string, sql: string, parametros: Record<string, unknown>): Promise<void> {
  await assert.rejects(
    conexao.transaction(async (savepoint) => {
      await savepoint.raw(sql, parametros as any);
    }),
    (erro: { code?: string }) => erro.code === codigo,
    `era esperada a falha ${codigo}`,
  );
}

const INSERIR_LEITURA = `
  INSERT INTO mensagem_direta_leitura
    (created_date, updated_date, is_deleted, conversa_id, usuario_id, outro_usuario_id, lida_ate_date, silenciada)
  SELECT :dataBase::timestamptz, :dataBase::timestamptz, :excluida::boolean, :conversaId::varchar, :usuarioId::integer,
         :outroUsuarioId::integer, NULL::timestamptz, false
  RETURNING id`;

function leitura(conversaId: string, usuarioId: number, outroUsuarioId: number, excluida = false) {
  return { dataBase: DATA_BASE_TESTE, excluida, conversaId, usuarioId, outroUsuarioId };
}

const INSERIR_PREFERENCIA = `
  INSERT INTO mensagem_direta_preferencia
    (created_date, updated_date, is_deleted, usuario_id, avisos_ativos, aviso_desktop_ativo, som_ativo, silenciado_ate_date, atalho_global)
  SELECT :dataBase::timestamptz, :dataBase::timestamptz, :excluida::boolean, :usuarioId::integer, true, true, false,
         NULL::timestamptz, 'Ctrl+Shift+Space'
  RETURNING id`;

const INSERIR_SUPERVISAO = `
  INSERT INTO mensagem_direta_supervisao
    (created_date, updated_date, is_deleted, leitor_usuario_id, conversa_id, usuario_menor_id, usuario_maior_id, participantes_avisados)
  SELECT :dataBase::timestamptz, :dataBase::timestamptz, false, :leitorId::integer, :conversaId::varchar, :menorId::integer,
         :maiorId::integer, true
  RETURNING id`;

testarComBanco('mensagem_direta_leitura: aceita a linha de cada pessoa da conversa, e só uma ativa por pessoa e conversa', async (conexao) => {
  const menor = await criarUsuario(conexao);
  const maior = await criarUsuario(conexao);
  const conversaId = `${Math.min(menor.id, maior.id)}-${Math.max(menor.id, maior.id)}`;

  await conexao.raw(INSERIR_LEITURA, leitura(conversaId, menor.id, maior.id) as any);
  await conexao.raw(INSERIR_LEITURA, leitura(conversaId, maior.id, menor.id) as any);
  await esperarFalha(conexao, UNICO, INSERIR_LEITURA, leitura(conversaId, menor.id, maior.id));

  // A linha excluída (soft delete) libera a pessoa para uma nova.
  await conexao.raw('UPDATE mensagem_direta_leitura SET is_deleted = true WHERE conversa_id = :conversaId AND usuario_id = :usuarioId', {
    conversaId,
    usuarioId: menor.id,
  });
  await conexao.raw(INSERIR_LEITURA, leitura(conversaId, menor.id, maior.id) as any);
});

testarComBanco('mensagem_direta_leitura: recusa a mesma pessoa nos dois lados, conversa_id que não bate com os ids e usuário que não existe', async (conexao) => {
  const menor = await criarUsuario(conexao);
  const maior = await criarUsuario(conexao);
  const conversaId = `${Math.min(menor.id, maior.id)}-${Math.max(menor.id, maior.id)}`;

  await esperarFalha(conexao, CHECK, INSERIR_LEITURA, leitura(`${menor.id}-${menor.id}`, menor.id, menor.id));
  await esperarFalha(conexao, CHECK, INSERIR_LEITURA, leitura(`${maior.id}-${menor.id}`, menor.id, maior.id));
  await esperarFalha(conexao, CHECK, INSERIR_LEITURA, leitura(`${conversaId}x`, menor.id, maior.id));
  await esperarFalha(conexao, CHAVE_ESTRANGEIRA, INSERIR_LEITURA, leitura(`${menor.id}-${ID_QUE_NAO_EXISTE}`, menor.id, ID_QUE_NAO_EXISTE));
});

testarComBanco('mensagem_direta_preferencia: uma linha ativa por usuário e FK para usuario', async (conexao) => {
  const usuario = await criarUsuario(conexao);
  const outro = await criarUsuario(conexao);

  await conexao.raw(INSERIR_PREFERENCIA, { dataBase: DATA_BASE_TESTE, excluida: false, usuarioId: usuario.id });
  await conexao.raw(INSERIR_PREFERENCIA, { dataBase: DATA_BASE_TESTE, excluida: false, usuarioId: outro.id });
  await esperarFalha(conexao, UNICO, INSERIR_PREFERENCIA, { dataBase: DATA_BASE_TESTE, excluida: false, usuarioId: usuario.id });
  await esperarFalha(conexao, CHAVE_ESTRANGEIRA, INSERIR_PREFERENCIA, { dataBase: DATA_BASE_TESTE, excluida: false, usuarioId: ID_QUE_NAO_EXISTE });

  await conexao.raw('UPDATE mensagem_direta_preferencia SET is_deleted = true WHERE usuario_id = :usuarioId', { usuarioId: usuario.id });
  await conexao.raw(INSERIR_PREFERENCIA, { dataBase: DATA_BASE_TESTE, excluida: false, usuarioId: usuario.id });
});

testarComBanco('mensagem_direta_supervisao: grava a abertura com os dois participantes em ordem e recusa o que não é consistente', async (conexao) => {
  const gestor = await criarUsuario(conexao);
  const menor = await criarUsuario(conexao);
  const maior = await criarUsuario(conexao);
  const conversaId = `${menor.id}-${maior.id}`;
  const base = { dataBase: DATA_BASE_TESTE, leitorId: gestor.id, conversaId, menorId: menor.id, maiorId: maior.id };

  await conexao.raw(INSERIR_SUPERVISAO, base);
  await conexao.raw(INSERIR_SUPERVISAO, base); // abrir de novo é outra linha (cada abertura é auditada)

  await esperarFalha(conexao, CHECK, INSERIR_SUPERVISAO, { ...base, conversaId: `${maior.id}-${menor.id}`, menorId: maior.id, maiorId: menor.id });
  await esperarFalha(conexao, CHECK, INSERIR_SUPERVISAO, { ...base, conversaId: `${menor.id}-${menor.id}`, maiorId: menor.id });
  await esperarFalha(conexao, CHECK, INSERIR_SUPERVISAO, { ...base, conversaId: '1-2' });
  await esperarFalha(conexao, CHAVE_ESTRANGEIRA, INSERIR_SUPERVISAO, { ...base, leitorId: ID_QUE_NAO_EXISTE });
  await esperarFalha(conexao, CHAVE_ESTRANGEIRA, INSERIR_SUPERVISAO, {
    ...base,
    conversaId: `${menor.id}-${ID_QUE_NAO_EXISTE}`,
    maiorId: ID_QUE_NAO_EXISTE,
  });
});

testarComBanco('as três tabelas atualizam updated_date no UPDATE (trigger)', async (conexao) => {
  const gestor = await criarUsuario(conexao);
  const menor = await criarUsuario(conexao);
  const maior = await criarUsuario(conexao);
  const conversaId = `${menor.id}-${maior.id}`;

  await conexao.raw(INSERIR_LEITURA, leitura(conversaId, menor.id, maior.id) as any);
  await conexao.raw(INSERIR_PREFERENCIA, { dataBase: DATA_BASE_TESTE, excluida: false, usuarioId: menor.id });
  await conexao.raw(INSERIR_SUPERVISAO, { dataBase: DATA_BASE_TESTE, leitorId: gestor.id, conversaId, menorId: menor.id, maiorId: maior.id });

  for (const [tabela, alteracao] of [
    ['mensagem_direta_leitura', 'silenciada = true'],
    ['mensagem_direta_preferencia', 'som_ativo = true'],
    ['mensagem_direta_supervisao', 'participantes_avisados = false'],
  ]) {
    await conexao.raw(`UPDATE ${tabela} SET ${alteracao}`);
    const { rows } = await conexao.raw(`SELECT ${tabela}.created_date < ${tabela}.updated_date AS alterada FROM ${tabela}`);
    assert.equal(rows[0].alterada, true, `${tabela}: updated_date não foi alterado`);
  }
});

testarComBanco('as três tabelas têm os campos de BaseEntity e nenhuma coluna tem DEFAULT (fora o id)', async (conexao) => {
  const tabelas = ['mensagem_direta_leitura', 'mensagem_direta_preferencia', 'mensagem_direta_supervisao'];
  const { rows } = await conexao.raw(
    `SELECT information_schema.columns.table_name AS tabela, information_schema.columns.column_name AS coluna,
            information_schema.columns.column_default AS padrao, information_schema.columns.is_nullable AS anulavel
     FROM information_schema.columns
     WHERE information_schema.columns.table_schema = 'public' AND information_schema.columns.table_name = ANY(:tabelas)`,
    { tabelas } as any,
  );

  for (const tabela of tabelas) {
    const colunas = rows.filter((linha: { tabela: string }) => linha.tabela === tabela);
    const nomes = colunas.map((linha: { coluna: string }) => linha.coluna);
    for (const base of ['id', 'created_date', 'updated_date', 'is_deleted', 'deleted_date']) {
      assert.ok(nomes.includes(base), `${tabela} sem a coluna ${base}`);
    }
    const comPadrao = colunas.filter((linha: { coluna: string; padrao: string | null }) => linha.coluna !== 'id' && linha.padrao !== null);
    assert.deepEqual(comPadrao.map((linha: { coluna: string }) => linha.coluna), [], `${tabela} tem coluna com DEFAULT`);
    for (const obrigatoria of ['created_date', 'updated_date', 'is_deleted']) {
      const coluna = colunas.find((linha: { coluna: string }) => linha.coluna === obrigatoria);
      assert.equal(coluna.anulavel, 'NO', `${tabela}.${obrigatoria} deveria ser NOT NULL`);
    }
  }
});
