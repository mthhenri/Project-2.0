import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum, NivelIaEnum } from '@project20/shared';
import {
  MAPEAMENTO_CHAT_MENSAGEM, montarConsultaBusca, montarConsultaConversa, montarConsultaConversas, limparTitulo, montarConsultaTitulos,
  deBaldesDeTokens, diaSeguinte, montarConsultaTokens,
} from './chat-consultas';
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

  it('os títulos são sempre os do dono', () => {
    const consulta = montarConsultaTitulos({ usuarioId: 7, conversaIds: ['7-2026-10-17'] });
    assert.deepEqual(consulta.query.bool.filter, [{ term: { usuario_id: 7 } }, { terms: { conversa_id: ['7-2026-10-17'] } }]);
  });

  it('o título sai sem aspas, ponto final, marcação e quebra de linha, e dentro do limite', () => {
    assert.equal(limparTitulo('"Revisão do webhook."'), 'Revisão do webhook');
    assert.equal(limparTitulo('**Cadastro de login**\nOutra linha'), 'Cadastro de login');
    assert.equal(limparTitulo('   '), '');
    assert.equal(limparTitulo('x'.repeat(100)).length, 60);
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
    propostaIds: [3],
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

describe('soma de tokens da aba Custos (task 202)', () => {
  const RECORTE = { dataInicio: '2026-10-01', dataFim: '2026-10-31', fusoHorario: 'America/Sao_Paulo' };

  it('o dia seguinte atravessa fim de mês e de ano', () => {
    assert.equal(diaSeguinte('2026-10-31'), '2026-11-01');
    assert.equal(diaSeguinte('2026-12-31'), '2027-01-01');
    assert.equal(diaSeguinte('2028-02-28'), '2028-02-29');
  });

  it('a consulta filtra só mensagem com tokens e modelo, no intervalo e no fuso, e agrega por período e modelo', () => {
    const consulta = montarConsultaTokens({ ...RECORTE, porMes: false });
    assert.equal(consulta.size, 0);
    assert.deepEqual(consulta.query.bool.filter, [
      { exists: { field: 'tokens_entrada' } },
      { exists: { field: 'modelo' } },
      { range: { created_date: { gte: '2026-10-01', lt: '2026-11-01', format: 'yyyy-MM-dd', time_zone: 'America/Sao_Paulo' } } },
    ]);
    assert.deepEqual(consulta.aggs.periodos.date_histogram, { field: 'created_date', calendar_interval: 'day', format: 'yyyy-MM-dd', time_zone: 'America/Sao_Paulo', min_doc_count: 1 });
    assert.equal(consulta.aggs.periodos.aggs.modelos.terms.field, 'modelo');
    assert.deepEqual(Object.keys(consulta.aggs.periodos.aggs.modelos.aggs), ['entrada', 'saida', 'cache']);
  });

  it('por mês, o histograma é mensal', () => {
    const { date_histogram: histograma } = montarConsultaTokens({ ...RECORTE, dataInicio: '2026-01-01', dataFim: '2026-12-31', porMes: true }).aggs.periodos;
    assert.equal(histograma.calendar_interval, 'month');
    assert.equal(histograma.format, 'yyyy-MM');
  });

  it('os baldes viram uma linha por período e modelo, com soma ausente valendo zero', () => {
    assert.deepEqual(
      deBaldesDeTokens([
        { key_as_string: '2026-10-05', modelos: { buckets: [{ key: 'haiku', doc_count: 3, entrada: { value: 100 }, saida: { value: 20 }, cache: { value: null } }] } },
        { key_as_string: '2026-10-06', modelos: { buckets: [{ key: 'sonnet', doc_count: 1, entrada: { value: 5 }, saida: { value: null }, cache: { value: 2 } }] } },
      ]),
      [
        { periodo: '2026-10-05', modelo: 'haiku', mensagens: 3, tokensEntrada: 100, tokensSaida: 20, tokensCache: 0 },
        { periodo: '2026-10-06', modelo: 'sonnet', mensagens: 1, tokensEntrada: 5, tokensSaida: 0, tokensCache: 2 },
      ],
    );
    assert.deepEqual(deBaldesDeTokens([]), []);
  });
});
