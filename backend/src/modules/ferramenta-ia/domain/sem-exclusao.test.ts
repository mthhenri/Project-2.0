import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { sugereExclusao } from './sem-exclusao';

// "A IA não exclui dados": nenhuma ferramenta nem tipo de proposta pode ter nome que sugira exclusão.

test('nomes que sugerem exclusão são recusados, em qualquer caixa', () => {
  for (const nome of ['excluir_atividade', 'apagar_execucao', 'remover_tag', 'deletar_demanda', 'eliminar_projeto', 'descartar_rascunho', 'EXCLUIR', 'Remover_Membro', 'propor_apagar_pad']) {
    assert.equal(sugereExclusao(nome), true, nome);
  }
});

test('nomes de ferramentas legítimas passam', () => {
  for (const nome of ['consultar_data_e_hora', 'listar_minhas_atividades', 'propor_criar_atividade', 'propor_iniciar_execucao', 'propor_atribuir_tag', 'consultar_pad']) {
    assert.equal(sugereExclusao(nome), false, nome);
  }
});
