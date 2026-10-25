import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AssuntoChatEnum, AutorChatEnum, ContextoChatEnum, NivelIaEnum } from '@project20/shared';
import { ChatMensagemNova, deFonte, paraFonte, paraResumo } from './chat-mensagem.documento';

// O documento de mensagem do chat (SYSTEM.SPEC.md §12 `chat`): a forma do índice usa os nomes da modelagem (snake_case), a da API não
// leva o conteúdo bruto do provedor.

const CRIADA_EM = new Date('2026-10-17T15:30:00.000Z');

const completa: ChatMensagemNova = {
  conversaId: '7-2026-10-17', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.IA, assunto: AssuntoChatEnum.CODIGO, texto: 'Pronto',
  nivel: NivelIaEnum.RAPIDO, modelo: 'modelo-x', tokensEntrada: 10, tokensSaida: 20, tokensCache: 5,
  propostaIds: [3, 8], execucaoId: 4, atividadeId: 5, demandaId: 6, conteudoBruto: [{ type: 'text', text: 'Pronto' }],
};

test('paraFonte: usa os nomes da modelagem, o id e a data de criação em ISO', () => {
  assert.deepEqual(paraFonte(completa, 'id-1', CRIADA_EM), {
    mensagem_id: 'id-1', conversa_id: '7-2026-10-17', usuario_id: 7, contexto: 'CHAT', autor: 'IA', assunto: 'CODIGO', texto: 'Pronto',
    nivel: 'RAPIDO', modelo: 'modelo-x', tokens_entrada: 10, tokens_saida: 20, tokens_cache: 5,
    proposta_id: 3, propostas_ids: [3, 8], execucao_id: 4, atividade_id: 5, demanda_id: 6, conteudo_bruto: [{ type: 'text', text: 'Pronto' }],
    created_date: '2026-10-17T15:30:00.000Z',
  });
});

test('paraFonte: todo campo opcional que faltar vira null (nunca undefined)', () => {
  const fonte = paraFonte({ conversaId: 'c', usuarioId: 1, contexto: ContextoChatEnum.CHECKIN, autor: AutorChatEnum.USUARIO, texto: 'Oi' }, 'id', CRIADA_EM);
  for (const campo of ['assunto', 'nivel', 'modelo', 'tokens_entrada', 'tokens_saida', 'tokens_cache', 'proposta_id', 'execucao_id', 'atividade_id', 'demanda_id', 'conteudo_bruto'] as const) {
    assert.equal(fonte[campo], null, campo);
  }
  assert.deepEqual(fonte.propostas_ids, [], 'sem propostas, a lista vai vazia');
});

test('paraFonte guarda o zero (tokens 0 não viram null)', () => {
  const fonte = paraFonte({ ...completa, tokensEntrada: 0, propostaIds: [0] }, 'id', CRIADA_EM);
  assert.equal(fonte.tokens_entrada, 0);
  assert.equal(fonte.proposta_id, 0);
});

test('deFonte: ida e volta devolve a mensagem com os nomes da API e a data como Date', () => {
  const lida = deFonte(paraFonte(completa, 'id-1', CRIADA_EM));
  assert.equal(lida.id, 'id-1');
  assert.equal(lida.conversaId, '7-2026-10-17');
  assert.equal(lida.usuarioId, 7);
  assert.equal(lida.contexto, ContextoChatEnum.CHAT);
  assert.equal(lida.autor, AutorChatEnum.IA);
  assert.equal(lida.nivel, NivelIaEnum.RAPIDO);
  assert.equal(lida.tokensEntrada, 10);
  assert.deepEqual(lida.propostaIds, [3, 8]);
  assert.deepEqual(lida.conteudoBruto, [{ type: 'text', text: 'Pronto' }]);
  assert.ok(lida.createdDate instanceof Date);
  assert.equal(lida.createdDate.toISOString(), '2026-10-17T15:30:00.000Z');
});

test('assunto: ida e volta preserva a marca; documento antigo, sem o campo, é lido como null', () => {
  assert.equal(deFonte(paraFonte(completa, 'id', CRIADA_EM)).assunto, AssuntoChatEnum.CODIGO);
  const { assunto: _assunto, ...antigo } = paraFonte(completa, 'id', CRIADA_EM);
  assert.equal(deFonte(antigo).assunto, null);
});

test('deFonte: nivel ausente continua null', () => {
  const lida = deFonte(paraFonte({ conversaId: 'c', usuarioId: 1, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'Oi' }, 'id', CRIADA_EM));
  assert.equal(lida.nivel, null);
  assert.equal(lida.conteudoBruto, null);
});

test('paraResumo: remove o conteúdo bruto do provedor e mantém o resto', () => {
  const resumo = paraResumo(deFonte(paraFonte(completa, 'id-1', CRIADA_EM)));
  assert.equal('conteudoBruto' in resumo, false);
  assert.equal(resumo.texto, 'Pronto');
  assert.equal(resumo.id, 'id-1');
});

test('paraFonte: a primeira proposta continua em proposta_id e a lista inteira vai em propostas_ids (task 225)', () => {
  const fonte = paraFonte({ ...completa, propostaIds: [5, 6, 7] }, 'id', CRIADA_EM);
  assert.equal(fonte.proposta_id, 5);
  assert.deepEqual(fonte.propostas_ids, [5, 6, 7]);
});

test('deFonte: a mensagem de antes da task 225, só com proposta_id, é lida como uma lista de um', () => {
  const fonte = paraFonte(completa, 'id', CRIADA_EM);
  const antiga = { ...fonte, proposta_id: 9 } as Record<string, unknown>;
  delete antiga['propostas_ids'];
  assert.deepEqual(deFonte(antiga as unknown as typeof fonte).propostaIds, [9]);
  assert.deepEqual(deFonte({ ...fonte, proposta_id: 9, propostas_ids: null }).propostaIds, [9]);
});

test('deFonte: sem proposta nenhuma a lista vem vazia, nunca nula', () => {
  const fonte = paraFonte({ ...completa, propostaIds: [] }, 'id', CRIADA_EM);
  assert.deepEqual(deFonte(fonte).propostaIds, []);
  assert.deepEqual(deFonte({ ...fonte, propostas_ids: undefined, proposta_id: null }).propostaIds, []);
});
