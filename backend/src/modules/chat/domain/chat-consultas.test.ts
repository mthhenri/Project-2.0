import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum, NivelIaEnum } from '@project20/shared';
import { MAPEAMENTO_CHAT_MENSAGEM, montarConsultaBusca, montarConsultaConversa, montarConsultaConversas } from './chat-consultas';
import { ChatMensagemNova, deFonte, paraFonte, paraResumo } from './chat-mensagem.documento';

describe('consultas do chat', () => {
  it('a conversa filtra por conversa e por dono e ordena por data', () => {
    const consulta = montarConsultaConversa({ conversaId: '7-2026-10-17', usuarioId: 7 });
    assert.deepEqual(consulta.query.bool.filter, [{ term: { conversa_id: '7-2026-10-17' } }, { term: { usuario_id: 7 } }]);
    assert.deepEqual(consulta.sort, [{ created_date: 'asc' }]);
  });

  it('a busca sempre filtra pelo dono, e só inclui o período informado', () => {
    const semPeriodo = montarConsultaBusca({ usuarioId: 7, texto: 'descricao' });
    assert.equal(semPeriodo.query.bool.filter.length, 1);
    const comPeriodo = montarConsultaBusca({ usuarioId: 7, texto: 'descricao', inicio: new Date('2026-10-01T00:00:00Z') });
    assert.deepEqual(comPeriodo.query.bool.filter[1], { range: { created_date: { gte: '2026-10-01T00:00:00.000Z' } } });
    assert.deepEqual(comPeriodo.query.bool.filter[0], { term: { usuario_id: 7 } });
  });

  it('a lista de conversas filtra por dono e só pelo chat, agrupa por conversa e traz a mais recente primeiro', () => {
    const consulta = montarConsultaConversas({ usuarioId: 7 });
    assert.deepEqual(consulta.query.bool.filter, [{ term: { usuario_id: 7 } }, { term: { contexto: 'CHAT' } }]);
    assert.equal(consulta.size, 0);
    assert.deepEqual(consulta.aggs.conversas.terms.order, { _key: 'desc' });
    assert.equal(consulta.aggs.conversas.terms.field, 'conversa_id');
  });

  it('o mapeamento tira acento e não indexa o conteúdo bruto', () => {
    assert.ok(MAPEAMENTO_CHAT_MENSAGEM.settings.analysis.analyzer.texto_pt.filter.includes('asciifolding'));
    assert.equal(MAPEAMENTO_CHAT_MENSAGEM.mappings.properties.conteudo_bruto.enabled, false);
    assert.equal(MAPEAMENTO_CHAT_MENSAGEM.mappings.properties.texto.analyzer, 'texto_pt');
  });
});

describe('documento da mensagem', () => {
  const nova: ChatMensagemNova = {
    conversaId: '7-2026-10-17',
    usuarioId: 7,
    contexto: ContextoChatEnum.CHAT,
    autor: AutorChatEnum.IA,
    texto: 'Bom dia!',
    nivel: NivelIaEnum.RAPIDO,
    modelo: 'claude-haiku-5-5',
    tokensEntrada: 10,
    tokensSaida: 4,
    propostaId: 3,
    conteudoBruto: [{ type: 'text', text: 'Bom dia!' }],
  };

  it('ida e volta preserva os campos e completa os opcionais com nulo', () => {
    const criadaEm = new Date('2026-10-17T12:00:00Z');
    const lida = deFonte(paraFonte(nova, 'abc', criadaEm));
    assert.equal(lida.id, 'abc');
    assert.equal(lida.texto, 'Bom dia!');
    assert.equal(lida.nivel, NivelIaEnum.RAPIDO);
    assert.equal(lida.tokensCache, null);
    assert.equal(lida.execucaoId, null);
    assert.equal(lida.createdDate.getTime(), criadaEm.getTime());
    assert.deepEqual(lida.conteudoBruto, nova.conteudoBruto);
  });

  it('o resumo da API não leva o conteúdo bruto', () => {
    const resumo = paraResumo(deFonte(paraFonte(nova, 'abc', new Date())));
    assert.equal('conteudoBruto' in resumo, false);
  });
});
