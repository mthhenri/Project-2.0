import * as assert from 'node:assert/strict';
import * as shared from '@project20/shared';
import { testarComBanco } from '../testes/banco-teste';

// Todo enum do `shared` com tabela de referência `tipo_*` tem, depois das migrations, exatamente os mesmos
// valores na coluna `codigo` (SYSTEM.SPEC.md §5.4 e SCHEMA.md): o repositório traduz `codigo ⇄ id` e um valor sem
// linha na tabela quebra o INSERT.
const ENUM_POR_TABELA: Record<string, Record<string, string>> = {
  tipo_usuario: shared.TipoUsuarioEnum,
  tipo_usuario_status: shared.TipoUsuarioStatusEnum,
  tipo_projeto_status: shared.TipoProjetoStatusEnum,
  tipo_demanda_status: shared.TipoDemandaStatusEnum,
  tipo_atividade_status: shared.TipoAtividadeStatusEnum,
  tipo_atividade_prioridade: shared.TipoAtividadePrioridadeEnum,
  tipo_dia_nao_util: shared.TipoDiaNaoUtilEnum,
  tipo_dia_nao_util_duracao: shared.TipoDiaNaoUtilDuracaoEnum,
  tipo_anotacao: shared.TipoAnotacaoEnum,
  tipo_provedor_ia: shared.TipoProvedorIaEnum,
  tipo_prompt: shared.TipoPromptEnum,
  tipo_proposta_ia: shared.TipoPropostaIaEnum,
  tipo_proposta_ia_status: shared.StatusPropostaIaEnum,
  tipo_plano_ponto_situacao: shared.TipoPlanoPontoSituacaoEnum,
};

for (const [tabela, enumeracao] of Object.entries(ENUM_POR_TABELA)) {
  testarComBanco(`${tabela}: os códigos da tabela são exatamente os valores do enum`, async (conexao) => {
    const { rows } = await conexao.raw(`SELECT ${tabela}.codigo FROM ${tabela} WHERE ${tabela}.is_deleted = false`);
    const daTabela = rows.map((linha: { codigo: string }) => linha.codigo).sort();
    const doEnum = Object.values(enumeracao).sort();
    assert.deepEqual(daTabela, doEnum);
  });
}

testarComBanco('toda tabela tipo_* do banco tem enum correspondente no shared (ou está listada como sem enum)', async (conexao) => {
  const { rows } = await conexao.raw(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE 'tipo\\_%' ESCAPE '\\'`);
  const semEnum = rows.map((linha: { table_name: string }) => linha.table_name).filter((nome: string) => !(nome in ENUM_POR_TABELA));
  assert.deepEqual(semEnum, [], `tabelas de referência sem enum no shared: ${semEnum.join(', ')}`);
});
