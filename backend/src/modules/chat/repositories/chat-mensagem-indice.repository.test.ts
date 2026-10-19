import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import {
  INDICE_CHAT_CONVERSA, INDICE_CHAT_MENSAGEM, MAPEAMENTO_CHAT_CONVERSA, MAPEAMENTO_CHAT_MENSAGEM,
  LIMITE_BUSCA, LIMITE_CONVERSAS,
} from '../domain/chat-consultas';
import { paraFonte } from '../domain/chat-mensagem.documento';
import { ChatMensagemIndiceRepository, ResultadoDaPesquisa } from './chat-mensagem-indice.repository';

// A lógica comum a OpenSearch e Elasticsearch (SYSTEM.SPEC.md §12 `chat`), com o cliente em dublê: cria os índices uma vez e de
// forma idempotente, grava um documento por mensagem (nunca reescrito), usa as consultas compartilhadas e traduz falha em
// BusinessException. Os dois repositories específicos já têm os seus testes.

class IndiceFalso extends ChatMensagemIndiceRepository {
  protected readonly servico = 'Serviço falso';
  existentes = new Set<string>();
  criados: { indice: string; mapeamento: unknown }[] = [];
  camposAcrescentados: { indice: string; propriedades: unknown }[] = [];
  gravados: { indice: string; id: string; documento: any }[] = [];
  pesquisas: { indice: string; consulta: any }[] = [];
  resultado: ResultadoDaPesquisa = { fontes: [], baldes: [] };
  falhaAoExistir: Error | null = null;
  falhaAoCriar: Error | null = null;
  falhaAoGravar: Error | null = null;
  falhaAoPesquisar: Error | null = null;
  consultasDeExistencia = 0;

  protected async existeIndice(indice: string): Promise<boolean> {
    this.consultasDeExistencia++;
    if (this.falhaAoExistir) throw this.falhaAoExistir;
    return this.existentes.has(indice);
  }
  protected async criarIndice(indice: string, mapeamento: unknown): Promise<void> {
    if (this.falhaAoCriar) throw this.falhaAoCriar;
    this.criados.push({ indice, mapeamento });
    this.existentes.add(indice);
  }
  protected async acrescentarCampos(indice: string, propriedades: unknown): Promise<void> {
    this.camposAcrescentados.push({ indice, propriedades });
  }
  protected async gravarDocumento(indice: string, id: string, documento: unknown): Promise<void> {
    if (this.falhaAoGravar) throw this.falhaAoGravar;
    this.gravados.push({ indice, id, documento });
  }
  protected async pesquisar(indice: string, consulta: unknown): Promise<ResultadoDaPesquisa> {
    if (this.falhaAoPesquisar) throw this.falhaAoPesquisar;
    this.pesquisas.push({ indice, consulta });
    return this.resultado;
  }
}

const NOVA = { conversaId: '7-2026-10-17', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'Oi' };

test('um índice de mensagens que já existe ganha os campos posteriores (assunto) a cada subida, sem ser recriado', async () => {
  const indice = new IndiceFalso();
  indice.existentes.add(INDICE_CHAT_MENSAGEM);
  await indice.gravar(NOVA);
  assert.deepEqual(indice.criados.map((criado) => criado.indice), [INDICE_CHAT_CONVERSA]);
  assert.deepEqual(indice.camposAcrescentados, [{ indice: INDICE_CHAT_MENSAGEM, propriedades: { assunto: { type: 'keyword' } } }]);
});

test('a primeira operação cria os dois índices com os mapeamentos compartilhados; as seguintes não conferem de novo', async () => {
  const indice = new IndiceFalso();
  await indice.gravar(NOVA);
  await indice.gravar(NOVA);
  assert.deepEqual(indice.criados, [
    { indice: INDICE_CHAT_MENSAGEM, mapeamento: MAPEAMENTO_CHAT_MENSAGEM },
    { indice: INDICE_CHAT_CONVERSA, mapeamento: MAPEAMENTO_CHAT_CONVERSA },
  ]);
  assert.equal(indice.consultasDeExistencia, 2);
});

test('índice que já existe não é recriado (subir de novo não falha nem duplica)', async () => {
  const indice = new IndiceFalso();
  indice.existentes = new Set([INDICE_CHAT_MENSAGEM, INDICE_CHAT_CONVERSA]);
  await indice.gravar(NOVA);
  assert.deepEqual(indice.criados, []);
});

test('outra instância criou o índice no meio (resource_already_exists_exception): segue sem erro', async () => {
  const indice = new IndiceFalso();
  indice.falhaAoCriar = Object.assign(new Error('x'), { body: { error: { type: 'resource_already_exists_exception' } } });
  const gravada = await indice.gravar(NOVA);
  assert.equal(gravada.texto, 'Oi');
});

test('outra falha ao criar o índice vira BusinessException e a criação é tentada de novo na chamada seguinte', async () => {
  const indice = new IndiceFalso();
  indice.falhaAoCriar = new Error('connection refused');
  await assert.rejects(() => indice.gravar(NOVA), BusinessException);
  indice.falhaAoCriar = null;
  await indice.gravar(NOVA);
  assert.equal(indice.criados.length, 2);
});

test('gravar: um documento por mensagem no índice de mensagens, com id próprio, e devolve a mensagem lida', async () => {
  const indice = new IndiceFalso();
  const primeira = await indice.gravar(NOVA);
  const segunda = await indice.gravar({ ...NOVA, texto: 'Outra' });

  assert.equal(indice.gravados.length, 2);
  assert.ok(indice.gravados.every((gravado) => gravado.indice === INDICE_CHAT_MENSAGEM));
  assert.notEqual(primeira.id, segunda.id);
  assert.equal(indice.gravados[0].id, primeira.id);
  assert.equal(indice.gravados[0].documento.mensagem_id, primeira.id);
  assert.equal(indice.gravados[0].documento.usuario_id, 7);
  assert.equal(primeira.texto, 'Oi');
  assert.ok(primeira.createdDate instanceof Date);
});

test('gravarTitulo: um documento por conversa, com o id da conversa (gravar de novo troca o título)', async () => {
  const indice = new IndiceFalso();
  await indice.gravarTitulo({ conversaId: '7-2026-10-17', usuarioId: 7, titulo: 'Cadastro de parceiros', editado: false });
  assert.equal(indice.gravados[0].indice, INDICE_CHAT_CONVERSA);
  assert.equal(indice.gravados[0].id, '7-2026-10-17');
  assert.equal(indice.gravados[0].documento.titulo, 'Cadastro de parceiros');
  assert.equal(indice.gravados[0].documento.titulo_editado, false);
  assert.equal(indice.gravados[0].documento.usuario_id, 7);
});

test('gravarTitulo: o nome do usuário grava titulo_editado verdadeiro, e o mapeamento da conversa declara o campo (task 192)', async () => {
  const indice = new IndiceFalso();
  await indice.gravarTitulo({ conversaId: '7-2026-10-17', usuarioId: 7, titulo: 'Meu nome', editado: true });
  assert.equal(indice.gravados[0].documento.titulo_editado, true);
  assert.deepEqual((MAPEAMENTO_CHAT_CONVERSA.mappings.properties as Record<string, unknown>).titulo_editado, { type: 'boolean' });
});

test('listarTitulos: lista vazia devolve {} sem nem falar com o serviço; senão, indexa o título por conversa', async () => {
  const indice = new IndiceFalso();
  assert.deepEqual(await indice.listarTitulos({ usuarioId: 7, conversaIds: [] }), {});
  assert.equal(indice.consultasDeExistencia, 0);

  indice.resultado = { fontes: [{ conversa_id: 'a', titulo: 'Um', titulo_editado: true }, { conversa_id: 'b' }] as never, baldes: [] };
  // Documento anterior à task 192 (sem `titulo_editado`) conta como não editado.
  assert.deepEqual(await indice.listarTitulos({ usuarioId: 7, conversaIds: ['a', 'b'] }), { a: { titulo: 'Um', editado: true }, b: { titulo: '', editado: false } });
  assert.equal(indice.pesquisas[0].indice, INDICE_CHAT_CONVERSA);
});

test('listarConversa filtra pela conversa e pelo dono, em ordem crescente', async () => {
  const indice = new IndiceFalso();
  indice.resultado = { fontes: [paraFonte(NOVA, 'id-1', new Date('2026-10-17T10:00:00Z'))], baldes: [] };
  const lidas = await indice.listarConversa({ conversaId: '7-2026-10-17', usuarioId: 7 });
  assert.equal(lidas.length, 1);
  assert.equal(lidas[0].id, 'id-1');
  const { indice: nome, consulta } = indice.pesquisas[0];
  assert.equal(nome, INDICE_CHAT_MENSAGEM);
  assert.deepEqual(consulta.query.bool.filter, [{ term: { conversa_id: '7-2026-10-17' } }, { term: { usuario_id: 7 } }]);
  assert.deepEqual(consulta.sort, [{ created_date: 'asc' }]);
});

test('buscar: todas as palavras, só do dono, relevância e depois a mais recente, com período e limite', async () => {
  const indice = new IndiceFalso();
  const inicio = new Date('2026-10-01T00:00:00Z');
  const fim = new Date('2026-10-31T00:00:00Z');
  await indice.buscar({ usuarioId: 7, texto: 'descrição cadastro', inicio, fim });
  const { consulta } = indice.pesquisas[0];
  assert.equal(consulta.size, LIMITE_BUSCA);
  assert.deepEqual(consulta.query.bool.must, [{ match: { texto: { query: 'descrição cadastro', operator: 'and' } } }]);
  assert.deepEqual(consulta.query.bool.filter[0], { term: { usuario_id: 7 } });
  assert.deepEqual(consulta.query.bool.filter[1], { range: { created_date: { gte: inicio.toISOString(), lte: fim.toISOString() } } });
  assert.deepEqual(consulta.sort, [{ _score: 'desc' }, { created_date: 'desc' }]);
});

test('buscar sem período não manda filtro de data', async () => {
  const indice = new IndiceFalso();
  await indice.buscar({ usuarioId: 7, texto: 'x' });
  assert.equal(indice.pesquisas[0].consulta.query.bool.filter.length, 1);
});

test('listarConversas: só o contexto CHAT do dono, agregando por conversa da mais recente, e devolve os baldes', async () => {
  const indice = new IndiceFalso();
  const balde = { key: '7-2026-10-17', doc_count: 2, ultima: { value: 1 }, primeira: { hits: { hits: [{ _source: { texto: 'Oi' } }] } } };
  indice.resultado = { fontes: [], baldes: [balde] };
  assert.deepEqual(await indice.listarConversas({ usuarioId: 7 }), [balde]);
  const { consulta } = indice.pesquisas[0];
  assert.deepEqual(consulta.query.bool.filter, [{ term: { usuario_id: 7 } }, { term: { contexto: 'CHAT' } }]);
  assert.equal(consulta.aggs.conversas.terms.size, LIMITE_CONVERSAS);
  assert.deepEqual(consulta.aggs.conversas.terms.order, { _key: 'desc' });
});

test('falha ao gravar, pesquisar ou conferir o índice vira a mensagem clara de chat indisponível, sem vazar o erro do serviço', async () => {
  const comFalha = (ajuste: (indice: IndiceFalso) => void) => { const indice = new IndiceFalso(); ajuste(indice); return indice; };
  const mensagemDe = (erro: unknown) => JSON.stringify((erro as BusinessException).getResponse());
  const casos: [string, IndiceFalso, (indice: IndiceFalso) => Promise<unknown>][] = [
    ['gravar', comFalha((indice) => { indice.falhaAoGravar = new Error('segredo-interno'); }), (indice) => indice.gravar(NOVA)],
    ['gravarTitulo', comFalha((indice) => { indice.falhaAoGravar = new Error('segredo-interno'); }), (indice) => indice.gravarTitulo({ conversaId: 'c', usuarioId: 7, titulo: 'T', editado: false })],
    ['listarConversa', comFalha((indice) => { indice.falhaAoPesquisar = new Error('segredo-interno'); }), (indice) => indice.listarConversa({ conversaId: 'c', usuarioId: 7 })],
    ['buscar', comFalha((indice) => { indice.falhaAoPesquisar = new Error('segredo-interno'); }), (indice) => indice.buscar({ usuarioId: 7, texto: 'x' })],
    ['listarConversas', comFalha((indice) => { indice.falhaAoExistir = new Error('segredo-interno'); }), (indice) => indice.listarConversas({ usuarioId: 7 })],
  ];
  for (const [nome, indice, operacao] of casos) {
    await assert.rejects(() => operacao(indice), (erro: unknown) => erro instanceof BusinessException && /indisponível/.test(mensagemDe(erro)) && !/segredo-interno/.test(mensagemDe(erro)), nome);
  }
});

test('onModuleInit: serviço fora do ar na subida não derruba o backend', async () => {
  const indice = new IndiceFalso();
  indice.falhaAoExistir = new Error('connection refused');
  await assert.doesNotReject(() => indice.onModuleInit());
});

test('onModuleInit cria os índices quando o serviço está no ar', async () => {
  const indice = new IndiceFalso();
  await indice.onModuleInit();
  assert.equal(indice.criados.length, 2);
});

test('não expõe exclusão nem alteração de mensagem', () => {
  const metodos = Object.getOwnPropertyNames(ChatMensagemIndiceRepository.prototype);
  assert.deepEqual(metodos.filter((nome) => /exclu|delet|remov|apag|alter|atualiz|update/i.test(nome)), []);
});
