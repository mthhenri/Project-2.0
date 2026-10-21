import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum, ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { INDICE_MENSAGEM_DIRETA, LIMITE_MARCADORES_DE_LEITURA, MAPEAMENTO_MENSAGEM_DIRETA, codificarCursor } from '../domain/mensagem-direta-consultas';
import { MensagemDiretaFonte, MensagemDiretaNova, paraFonteDireta } from '../domain/mensagem-direta.documento';
import { MensagemDiretaIndiceRepository, ResultadoDaPesquisaDireta } from './mensagem-direta-indice.repository';

// A lógica comum a OpenSearch e Elasticsearch (modelagem §3 e §7), com o cliente em dublê: cria o índice uma vez e de forma idempotente,
// grava um documento por mensagem (nunca reescrito), usa as consultas compartilhadas e traduz falha em BusinessException. O que as consultas
// de fato devolvem só a suíte de contrato, contra o serviço real, prova.

class IndiceFalso extends MensagemDiretaIndiceRepository {
  protected readonly servico = 'Serviço falso';
  existe = false;
  criados: { indice: string; mapeamento: unknown }[] = [];
  documentos = new Map<string, MensagemDiretaFonte>();
  tentativasDeGravar: { indice: string; id: string; documento: any }[] = [];
  pesquisas: { indice: string; consulta: any }[] = [];
  resultado: ResultadoDaPesquisaDireta = { fontes: [], baldes: [] };
  falhaAoExistir: Error | null = null;
  falhaAoCriar: unknown = null;
  falhaAoPesquisar: Error | null = null;
  falhaAoLer: Error | null = null;
  consultasDeExistencia = 0;
  forcarConflito = false;

  protected async existeIndice(): Promise<boolean> {
    this.consultasDeExistencia++;
    if (this.falhaAoExistir) throw this.falhaAoExistir;
    return this.existe;
  }
  protected async criarIndice(indice: string, mapeamento: unknown): Promise<void> {
    if (this.falhaAoCriar) throw this.falhaAoCriar;
    this.criados.push({ indice, mapeamento });
    this.existe = true;
  }
  protected async gravarDocumentoNovo(indice: string, id: string, documento: unknown): Promise<boolean> {
    this.tentativasDeGravar.push({ indice, id, documento });
    if (this.forcarConflito || this.documentos.has(id)) return false;
    this.documentos.set(id, documento as MensagemDiretaFonte);
    return true;
  }
  protected async lerDocumento(_indice: string, id: string): Promise<MensagemDiretaFonte | null> {
    if (this.falhaAoLer) throw this.falhaAoLer;
    return this.documentos.get(id) ?? null;
  }
  protected async pesquisar(indice: string, consulta: unknown): Promise<ResultadoDaPesquisaDireta> {
    if (this.falhaAoPesquisar) throw this.falhaAoPesquisar;
    this.pesquisas.push({ indice, consulta });
    return this.resultado;
  }
}

const UUID = '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10';
const NOVA: MensagemDiretaNova = {
  mensagemId: UUID,
  conversaId: '4-9',
  autor: AutorMensagemDiretaEnum.USUARIO,
  autorUsuarioId: 9,
  texto: 'Oi',
  contemCodigo: false,
  mencoes: [],
  referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }],
};

const fonteNumero = (numero: number): MensagemDiretaFonte =>
  paraFonteDireta({ ...NOVA, mensagemId: `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`, texto: `mensagem ${numero}` }, new Date(Date.UTC(2026, 9, 21, 14, 0, numero)));

const rejeitaComBusiness = (promessa: Promise<unknown>) => assert.rejects(promessa, (erro) => erro instanceof BusinessException);

test('cria o índice uma única vez, mesmo com várias chamadas, e com o mapeamento da modelagem', async () => {
  const indice = new IndiceFalso();
  await indice.gravar(NOVA);
  await indice.gravar({ ...NOVA, mensagemId: '00000000-0000-4000-8000-000000000002' });
  await indice.listarConversasDoUsuario({ usuarioId: 9 });
  assert.equal(indice.criados.length, 1);
  assert.equal(indice.consultasDeExistencia, 1);
  assert.equal(indice.criados[0].indice, INDICE_MENSAGEM_DIRETA);
  assert.deepEqual(indice.criados[0].mapeamento, MAPEAMENTO_MENSAGEM_DIRETA);
});

test('não recria um índice que já existe e tolera outra instância criando ao mesmo tempo', async () => {
  const existente = new IndiceFalso();
  existente.existe = true;
  await existente.gravar(NOVA);
  assert.equal(existente.criados.length, 0);

  const corrida = new IndiceFalso();
  corrida.falhaAoCriar = { body: { error: { type: 'resource_already_exists_exception' } } };
  await assert.doesNotReject(corrida.gravar(NOVA));
});

test('serviço fora do ar na subida não derruba o backend; nas operações vira BusinessException clara', async () => {
  const indice = new IndiceFalso();
  indice.falhaAoExistir = new Error('connection refused');
  await assert.doesNotReject(indice.onModuleInit());
  await rejeitaComBusiness(indice.gravar(NOVA));
  await rejeitaComBusiness(indice.listarConversa({ conversaId: '4-9', limite: 10 }));
  await rejeitaComBusiness(indice.listarConversasDoUsuario({ usuarioId: 9 }));
  await rejeitaComBusiness(indice.contarNaoLidas({ usuarioId: 9, marcadores: [{ conversaId: '4-9', lidaAteDate: null }] }));
  await rejeitaComBusiness(indice.buscar({ usuarioId: 9, texto: 'x' }));
  await rejeitaComBusiness(indice.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 1, porPagina: 10 }));
});

test('uma falha que não é de conexão no meio da operação também vira BusinessException, sem vazar o erro cru', async () => {
  const indice = new IndiceFalso();
  indice.falhaAoPesquisar = new Error('search_phase_execution_exception: detalhe interno');
  await assert.rejects(indice.buscar({ usuarioId: 9, texto: 'x' }), (erro) => {
    assert.ok(erro instanceof BusinessException);
    assert.doesNotMatch(JSON.stringify((erro as BusinessException).getResponse()), /search_phase|detalhe interno/);
    return true;
  });
});

// --- gravar ----------------------------------------------------------------

test('grava um documento com o mensagemId como identificador, os participantes e a data do servidor', async () => {
  const indice = new IndiceFalso();
  const antes = Date.now();
  const { mensagem, jaExistia } = await indice.gravar(NOVA);
  assert.equal(jaExistia, false);
  assert.equal(indice.tentativasDeGravar.length, 1);
  assert.equal(indice.tentativasDeGravar[0].indice, INDICE_MENSAGEM_DIRETA);
  assert.equal(indice.tentativasDeGravar[0].id, UUID);
  assert.deepEqual(indice.tentativasDeGravar[0].documento.participantes, [4, 9]);
  assert.deepEqual(indice.tentativasDeGravar[0].documento.referencias, ['DEMANDA:212']);
  assert.ok(mensagem.createdDate.getTime() >= antes && mensagem.createdDate.getTime() <= Date.now());
  assert.deepEqual(mensagem.referencias, [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }]);
});

test('reenviar o mesmo mensagemId do mesmo autor devolve a mensagem que já estava gravada', async () => {
  const indice = new IndiceFalso();
  const primeira = await indice.gravar(NOVA);
  const repetida = await indice.gravar({ ...NOVA, texto: 'texto alterado no reenvio' });
  assert.equal(repetida.jaExistia, true);
  assert.equal(repetida.mensagem.texto, 'Oi', 'vale o que já estava gravado');
  assert.equal(repetida.mensagem.createdDate.getTime(), primeira.mensagem.createdDate.getTime());
  assert.equal(indice.documentos.size, 1);
});

test('um mensagemId já usado por outro autor ou em outra conversa é recusado, sem devolver a mensagem alheia', async () => {
  const indice = new IndiceFalso();
  await indice.gravar(NOVA);
  await rejeitaComBusiness(indice.gravar({ ...NOVA, autorUsuarioId: 4 }));
  await rejeitaComBusiness(indice.gravar({ ...NOVA, conversaId: '9-12' }));
  await rejeitaComBusiness(indice.gravar({ ...NOVA, autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null }));
  assert.equal(indice.documentos.size, 1);
});

test('valida o documento antes de falar com o serviço: nada é gravado nem o índice é consultado', async () => {
  const indice = new IndiceFalso();
  await rejeitaComBusiness(indice.gravar({ ...NOVA, conversaId: '9-4' }));
  await rejeitaComBusiness(indice.gravar({ ...NOVA, autorUsuarioId: 5 }));
  await rejeitaComBusiness(indice.gravar({ ...NOVA, mensagemId: 'abc' }));
  await rejeitaComBusiness(indice.gravar({ ...NOVA, texto: '   ' }));
  assert.equal(indice.consultasDeExistencia, 0);
  assert.equal(indice.tentativasDeGravar.length, 0);
});

test('o documento que existia na gravação e sumiu na leitura vira indisponível, não uma mensagem inventada', async () => {
  const indice = new IndiceFalso();
  indice.forcarConflito = true; // a gravação diz que o id já existe...
  await rejeitaComBusiness(indice.gravar(NOVA)); // ...e a leitura não o acha
  assert.equal(indice.documentos.size, 0);
});

// --- listar conversa --------------------------------------------------------

test('a página devolve só o limite e o cursor da última devolvida quando o serviço trouxe um a mais', async () => {
  const indice = new IndiceFalso();
  indice.resultado = { fontes: [fonteNumero(5), fonteNumero(4), fonteNumero(3)], baldes: [] };
  const pagina = await indice.listarConversa({ conversaId: '4-9', limite: 2 });
  assert.deepEqual(pagina.mensagens.map((mensagem) => mensagem.texto), ['mensagem 5', 'mensagem 4']);
  assert.equal(pagina.proximoCursor, codificarCursor(fonteNumero(4)));
  assert.equal(indice.pesquisas[0].consulta.size, 3, 'pede um a mais que o limite');
});

test('sem mensagem a mais não há cursor', async () => {
  const indice = new IndiceFalso();
  indice.resultado = { fontes: [fonteNumero(2), fonteNumero(1)], baldes: [] };
  const pagina = await indice.listarConversa({ conversaId: '4-9', limite: 2 });
  assert.equal(pagina.mensagens.length, 2);
  assert.equal(pagina.proximoCursor, null);
  indice.resultado = { fontes: [], baldes: [] };
  assert.deepEqual(await indice.listarConversa({ conversaId: '4-9', limite: 2 }), { mensagens: [], proximoCursor: null });
});

test('o cursor devolvido continua do ponto exato na página seguinte', async () => {
  const indice = new IndiceFalso();
  indice.resultado = { fontes: [fonteNumero(5), fonteNumero(4), fonteNumero(3)], baldes: [] };
  const { proximoCursor } = await indice.listarConversa({ conversaId: '4-9', limite: 2 });
  await indice.listarConversa({ conversaId: '4-9', limite: 2, cursor: proximoCursor! });
  assert.deepEqual(indice.pesquisas[1].consulta.search_after, [Date.UTC(2026, 9, 21, 14, 0, 4), fonteNumero(4).mensagem_id]);
});

test('recusa conversa inválida, limite fora da faixa e cursor adulterado antes de falar com o serviço', async () => {
  const indice = new IndiceFalso();
  await rejeitaComBusiness(indice.listarConversa({ conversaId: '9-4', limite: 10 }));
  await rejeitaComBusiness(indice.listarConversa({ conversaId: '4-9', limite: 0 }));
  await rejeitaComBusiness(indice.listarConversa({ conversaId: '4-9', limite: 101 }));
  await rejeitaComBusiness(indice.listarConversa({ conversaId: '4-9', limite: 1.5 }));
  await rejeitaComBusiness(indice.listarConversa({ conversaId: '4-9', limite: 10, cursor: 'lixo' }));
  assert.equal(indice.pesquisas.length, 0);
});

// --- demais operações -------------------------------------------------------

test('a lista de conversas lê os baldes da agregação', async () => {
  const indice = new IndiceFalso();
  indice.resultado = { fontes: [], baldes: [{ key: '4-9', doc_count: 7, ultima_mensagem: { hits: { hits: [{ _source: fonteNumero(3) }] } } }] };
  const conversas = await indice.listarConversasDoUsuario({ usuarioId: 9 });
  assert.equal(conversas.length, 1);
  assert.equal(conversas[0].conversaId, '4-9');
  assert.equal(conversas[0].totalMensagens, 7);
  assert.equal(conversas[0].ultimaMensagem.texto, 'mensagem 3');
});

test('as não lidas fazem uma consulta só e devolvem zero para a conversa sem balde; sem marcadores nem consultam', async () => {
  const indice = new IndiceFalso();
  indice.resultado = { fontes: [], baldes: [], naoLidas: { '4-9': { doc_count: 3 } } };
  const contagem = await indice.contarNaoLidas({
    usuarioId: 9,
    marcadores: [
      { conversaId: '4-9', lidaAteDate: new Date('2026-10-21T14:00:00Z') },
      { conversaId: '9-12', lidaAteDate: null },
    ],
  });
  assert.deepEqual(contagem, { '4-9': 3, '9-12': 0 });
  assert.equal(indice.pesquisas.length, 1);

  assert.deepEqual(await indice.contarNaoLidas({ usuarioId: 9, marcadores: [] }), {});
  assert.equal(indice.pesquisas.length, 1);
});

test('as não lidas recusam mais conversas do que o limite', async () => {
  const indice = new IndiceFalso();
  const marcadores = Array.from({ length: LIMITE_MARCADORES_DE_LEITURA + 1 }, (_, posicao) => ({ conversaId: `1-${posicao + 2}`, lidaAteDate: null }));
  await rejeitaComBusiness(indice.contarNaoLidas({ usuarioId: 1, marcadores }));
  assert.equal(indice.pesquisas.length, 0);
});

test('a busca devolve as mensagens achadas e recusa texto em branco', async () => {
  const indice = new IndiceFalso();
  indice.resultado = { fontes: [fonteNumero(2), fonteNumero(1)], baldes: [] };
  assert.deepEqual((await indice.buscar({ usuarioId: 9, texto: 'mensagem' })).map((mensagem) => mensagem.texto), ['mensagem 2', 'mensagem 1']);
  await rejeitaComBusiness(indice.buscar({ usuarioId: 9, texto: '  ' }));
});

test('a supervisão devolve as conversas e o total da agregação (zero quando não vem)', async () => {
  const indice = new IndiceFalso();
  indice.resultado = { fontes: [], baldes: [{ key: '4-9', doc_count: 2, ultima_mensagem: { hits: { hits: [{ _source: fonteNumero(2) }] } } }], total: 17 };
  const pagina = await indice.listarTodasConversas({ usuarioIdsExcluidos: [1], pagina: 1, porPagina: 10 });
  assert.equal(pagina.total, 17);
  assert.equal(pagina.conversas.length, 1);
  indice.resultado = { fontes: [], baldes: [] };
  assert.deepEqual(await indice.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 1, porPagina: 10 }), { conversas: [], total: 0 });
  await rejeitaComBusiness(indice.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 0, porPagina: 10 }));
});

test('não expõe exclusão nem alteração de documento', () => {
  const metodos = [MensagemDiretaIndiceRepository.prototype].flatMap((prototipo) => Object.getOwnPropertyNames(prototipo));
  assert.deepEqual(
    metodos.filter((nome) => /exclu|delet|remov|apag|alter|atualiz|update/i.test(nome)),
    [],
  );
});
