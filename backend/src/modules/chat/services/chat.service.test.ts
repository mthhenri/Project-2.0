import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AssuntoChatEnum, AutorChatEnum, ChatEventoDto, ContextoChatEnum, EstadoIaEnum, ModoContextoChatEnum, NivelIaEnum, StatusPropostaIaEnum, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { INSTRUCOES_DE_ASSUNTO, INSTRUCOES_SO_PROJECT } from '../domain/assunto-do-chat';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { IaException } from '../../ia/domain/ia.exception';
import { IaResposta, IaSolicitacao } from '../../ia/domain/ia.tipos';
import { turnoAtual } from '../../ia/domain/turno-ia';
import { IaService } from '../../ia/services/ia.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ChatMensagemLida, ChatMensagemNova, deFonte, paraFonte } from '../domain/chat-mensagem.documento';
import { ArmazenamentoDeChat } from '../repositories/armazenamento-de-chat';
import { TituloDaConversa, TituloParaGravar } from '../domain/chat-consultas';
import { CARACTERES_POR_MENSAGEM_PARA_NOMEAR, ChatService, INSTRUCOES_TITULO, JANELA_DE_MENSAGENS, MAXIMO_DE_VOLTAS, MAXIMO_TOKENS_DO_CHAT, MENSAGENS_PARA_NOMEAR } from './chat.service';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function resposta(parcial: Partial<IaResposta> & { texto?: string }): IaResposta {
  const texto = parcial.texto ?? '';
  return {
    texto,
    blocos: parcial.blocos ?? (texto ? [{ tipo: 'texto', texto }] : []),
    nivel: NivelIaEnum.RAPIDO,
    modelo: 'claude-haiku-5-5',
    tokens: parcial.tokens ?? { entrada: 10, saida: 5, cache: 1 },
    motivoParada: parcial.motivoParada ?? 'fim',
  };
}

function pedidoDeFerramenta(id: string, nome = 'consultar_data_e_hora'): IaResposta {
  return resposta({
    texto: 'Vou consultar. ',
    blocos: [
      { tipo: 'texto', texto: 'Vou consultar. ' },
      { tipo: 'uso_ferramenta', id, nome, entrada: {} },
    ],
    motivoParada: 'uso_ferramenta',
  });
}

interface Cenario {
  /** Cada item é uma chamada ao modelo: devolve a resposta (trechos opcionais) ou lança. */
  chamadas: ((solicitacao: IaSolicitacao, aoTrecho: (trecho: string) => void) => Promise<IaResposta>)[];
  ferramenta?: (nome: string) => { conteudo: string; erro: boolean; propostaId?: number };
  /** As chamadas à IA que a ferramenta faz por baixo e que chegam ao fim (as que falham não entram), como o `IaService` real as registra no turno. */
  iaDaFerramenta?: (nome: string) => IaResposta[];
  estado?: EstadoIaEnum;
  historicoInicial?: ChatMensagemNova[];
  titulosIniciais?: Record<string, string | TituloDaConversa>;
  /** O que a IA devolve ao pedir o nome da conversa (ou lança). */
  titulo?: (solicitacao: IaSolicitacao) => string;
  /** Quantas propostas pendentes a retomada descarta como obsoletas. */
  obsoletas?: number;
  /** A situação atual de cada proposta (por id), como a lê a `PropostaIaService`; sem ela a proposta não é encontrada. */
  propostas?: Record<number, { status: StatusPropostaIaEnum; resultado?: Record<string, unknown> | null }>;
  /** As flags das dúvidas de código da configuração da IA ativa (padrão: desligadas e contexto misturado). */
  configuracao?: { duvidasCodigo?: boolean; modoContextoChat?: ModoContextoChatEnum };
  /** O que a IA devolve na classificação do assunto (ou lança). */
  assunto?: (solicitacao: IaSolicitacao) => string;
}

function montar(cenario: Cenario) {
  const gravadas: ChatMensagemLida[] = [];
  const titulos: Record<string, TituloDaConversa> = Object.fromEntries(
    Object.entries(cenario.titulosIniciais ?? {}).map(([conversaId, valor]) => [conversaId, typeof valor === 'string' ? { titulo: valor, editado: false } : valor]),
  );
  const gravacoesDeTitulo: TituloParaGravar[] = [];
  const geradas: IaSolicitacao[] = [];
  const ordem: string[] = [];
  const repositorio = {
    async gravar(mensagem: ChatMensagemNova) {
      ordem.push(`gravar:${mensagem.autor}`);
      const lida = deFonte(paraFonte(mensagem, `m${gravadas.length + 1}`, new Date(Date.now() + gravadas.length)));
      gravadas.push(lida);
      return lida;
    },
    async listarConversa() {
      return [...gravadas];
    },
    async listarTitulos() {
      return { ...titulos };
    },
    async gravarTitulo(novo: TituloParaGravar) {
      gravacoesDeTitulo.push(novo);
      titulos[novo.conversaId] = { titulo: novo.titulo, editado: novo.editado };
    },
    async listarConversas(consulta: unknown) {
      ordem.push(`conversas:${JSON.stringify(consulta)}`);
      return [
        { key: '7-2026-10-17', doc_count: 4, ultima: { value: Date.parse('2026-10-17T15:00:00Z') }, primeira: { hits: { hits: [{ _source: { texto: 'bom dia' } }] } } },
        { key: '7-2026-10-16', doc_count: 2, ultima: { value: Date.parse('2026-10-16T12:00:00Z') }, primeira: { hits: { hits: [] } } },
      ];
    },
    async buscar(consulta: unknown) {
      ordem.push(`buscar:${JSON.stringify(consulta)}`);
      return [];
    },
  };
  for (const inicial of cenario.historicoInicial ?? []) void repositorio.gravar(inicial);
  ordem.length = 0;

  const solicitacoes: IaSolicitacao[] = [];
  let indice = 0;
  const iaService = {
    async obterEstado() {
      return cenario.estado ?? EstadoIaEnum.NO_AR;
    },
    async gerar(solicitacao: IaSolicitacao) {
      geradas.push(solicitacao);
      const ehClassificacao = solicitacao.instrucoes === INSTRUCOES_DE_ASSUNTO;
      if (ehClassificacao) ordem.push('classificar');
      const texto = ehClassificacao ? (cenario.assunto ? cenario.assunto(solicitacao) : 'SISTEMA') : cenario.titulo ? cenario.titulo(solicitacao) : '"Revisão do webhook."';
      const gerada = resposta({ texto });
      turnoAtual()?.registrar(gerada); // como o `IaService` real: se houvesse um turno aberto, a chamada entraria nele
      return gerada;
    },
    async transmitir(solicitacao: IaSolicitacao, aoTrecho: (trecho: string) => void) {
      ordem.push('ia');
      solicitacoes.push({ ...solicitacao, mensagens: [...solicitacao.mensagens] });
      const chamada = cenario.chamadas[Math.min(indice++, cenario.chamadas.length - 1)];
      const resultado = await chamada(solicitacao, aoTrecho);
      turnoAtual()?.registrar(resultado); // o `IaService` real registra toda chamada bem-sucedida no turno aberto
      return resultado;
    },
  };
  const recusadas: number[] = [];
  const tiposDePrompt: TipoPromptEnum[] = [];
  const servico = new ChatService(
    repositorio as unknown as ArmazenamentoDeChat,
    iaService as unknown as IaService,
    {
      obterAtivo: async (tipo: TipoPromptEnum) => {
        tiposDePrompt.push(tipo);
        return { conteudo: tipo === TipoPromptEnum.DUVIDA_CODIGO ? 'Regras de código.' : 'Você é o assistente.' };
      },
    } as unknown as PromptService,
    {
      listarParaUsuario: () => [{ nome: 'consultar_data_e_hora', descricao: 'd', esquemaEntrada: {} }],
      executar: async (nome: string) => {
        for (const chamadaDaFerramenta of cenario.iaDaFerramenta?.(nome) ?? []) turnoAtual()?.registrar(chamadaDaFerramenta);
        return cenario.ferramenta ? cenario.ferramenta(nome) : { conteudo: '{"data":"2026-10-17"}', erro: false };
      },
    } as unknown as FerramentaIaRegistro,
    {
      recusar: async (id: number) => {
        recusadas.push(id);
        return {};
      },
      expirarObsoletas: async () => cenario.obsoletas ?? 0,
      recuperarPorId: async (id: number) => {
        const proposta = cenario.propostas?.[id];
        if (!proposta) throw new ResourceNotFoundException('Proposta');
        return { dados: { id, status: proposta.status, resultado: proposta.resultado ?? null } };
      },
    } as unknown as PropostaIaService,
    { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService,
    {
      obterAtiva: async () => ({ duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, ...cenario.configuracao }),
    } as unknown as ConfiguracaoIaService,
  );
  return { servico, gravadas, ordem, solicitacoes, recusadas, titulos, gravacoesDeTitulo, geradas, tiposDePrompt };
}

async function enviar(servico: ChatService, texto = 'Oi') {
  const eventos: ChatEventoDto[] = [];
  await servico.enviarMensagem(USUARIO, { texto }, (evento) => eventos.push(evento));
  return eventos;
}

test('grava a mensagem do usuário antes de chamar a IA; o texto transmitido é o da mensagem gravada', async () => {
  const { servico, gravadas, ordem } = montar({
    chamadas: [
      async (_s, aoTrecho) => {
        aoTrecho('Bom ');
        aoTrecho('dia!');
        return resposta({ texto: 'Bom dia!' });
      },
    ],
  });
  const eventos = await enviar(servico);
  assert.deepEqual(ordem, ['gravar:USUARIO', 'ia', 'gravar:IA']);
  assert.deepEqual(eventos.map((evento) => evento.tipo), ['trecho', 'trecho', 'fim']);
  const trechos = eventos.filter((evento) => evento.tipo === 'trecho').map((evento) => (evento as { texto: string }).texto).join('');
  const ia = gravadas[1];
  assert.equal(ia.texto, trechos);
  assert.equal(ia.autor, AutorChatEnum.IA);
  assert.equal(ia.contexto, ContextoChatEnum.CHAT);
  assert.equal(ia.nivel, NivelIaEnum.RAPIDO);
  assert.equal(ia.modelo, 'claude-haiku-5-5');
  assert.equal(ia.tokensEntrada, 10);
  assert.equal(ia.tokensCache, 1);
  const fim = eventos[2] as { tipo: 'fim'; mensagem: { id: string } };
  assert.equal(fim.mensagem.id, ia.id);
  assert.equal('conteudoBruto' in fim.mensagem, false);
});

test('a primeira chamada leva o prompt CONVERSA, as ferramentas do usuário, o nível rápido e a mensagem', async () => {
  const { servico, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'ok' })] });
  await enviar(servico, 'Bom dia');
  assert.equal(solicitacoes[0].nivel, NivelIaEnum.RAPIDO);
  assert.equal(solicitacoes[0].instrucoes, `Você é o assistente.\n\n${INSTRUCOES_SO_PROJECT}`);
  assert.equal(solicitacoes[0].ferramentas?.[0].nome, 'consultar_data_e_hora');
  assert.deepEqual(solicitacoes[0].mensagens, [{ papel: 'usuario', conteudo: 'Bom dia' }]);
});

test('laço de ferramentas: executa, devolve o resultado ao modelo e guarda as trocas do turno', async () => {
  const { servico, gravadas, solicitacoes } = montar({
    chamadas: [
      async (_s, aoTrecho) => { aoTrecho('Vou consultar. '); return pedidoDeFerramenta('t1'); },
      async (_s, aoTrecho) => { aoTrecho('Hoje é sábado.'); return resposta({ texto: 'Hoje é sábado.' }); },
    ],
  });
  const eventos = await enviar(servico, 'Que dia é hoje?');
  assert.deepEqual(
    eventos.map((evento) => (evento.tipo === 'ferramenta' ? `ferramenta:${evento.situacao}` : evento.tipo)),
    ['trecho', 'ferramenta:EXECUTANDO', 'ferramenta:CONCLUIDA', 'trecho', 'trecho', 'fim'],
  );
  // O texto de cada volta vem separado do anterior por um parágrafo em branco, ao vivo e no gravado (task 225).
  assert.deepEqual(
    eventos.filter((evento) => evento.tipo === 'trecho').map((evento) => (evento as { texto: string }).texto),
    ['Vou consultar. ', '\n\n', 'Hoje é sábado.'],
  );
  const segundaChamada = solicitacoes[1].mensagens;
  assert.equal(segundaChamada.length, 3);
  assert.equal(segundaChamada[1].papel, 'ia');
  assert.deepEqual(segundaChamada[2], {
    papel: 'usuario',
    conteudo: [{ tipo: 'resultado_ferramenta', usoId: 't1', conteudo: '{"data":"2026-10-17"}', erro: false }],
  });
  const ia = gravadas[1];
  assert.equal(ia.texto, 'Vou consultar. \n\nHoje é sábado.');
  assert.equal(((ia.conteudoBruto as { mensagens: unknown[] }).mensagens).length, 3);
  assert.equal(ia.tokensEntrada, 20);
});

test('resultado de erro da ferramenta vai ao modelo marcado como erro, e o turno continua', async () => {
  const { servico, solicitacoes } = montar({
    chamadas: [async () => pedidoDeFerramenta('t1'), async () => resposta({ texto: 'Não consegui.' })],
    ferramenta: () => ({ conteudo: '{"erro":"sem permissão"}', erro: true }),
  });
  const eventos = await enviar(servico);
  assert.equal(eventos.some((evento) => evento.tipo === 'ferramenta' && evento.situacao === 'ERRO'), true);
  assert.equal(eventos.at(-1)?.tipo, 'fim');
  const resultado = (solicitacoes[1].mensagens[2].conteudo as { erro?: boolean }[])[0];
  assert.equal(resultado.erro, true);
});

test('proposta criada por uma ferramenta emite o evento e fica ligada à mensagem da IA', async () => {
  const { servico, gravadas } = montar({
    chamadas: [async () => pedidoDeFerramenta('t1', 'propor_atividade'), async () => resposta({ texto: 'Proposta criada.' })],
    ferramenta: () => ({ conteudo: '{"propostaId":42}', erro: false, propostaId: 42 }),
  });
  const eventos = await enviar(servico);
  assert.deepEqual(eventos.find((evento) => evento.tipo === 'proposta'), { tipo: 'proposta', propostaId: 42 });
  assert.deepEqual(gravadas[1].propostaIds, [42]);
});

test('uma volta sem texto não ganha separador, nem ao vivo nem no gravado (task 225)', async () => {
  const { servico, gravadas } = montar({
    chamadas: [async () => pedidoDeFerramenta('t1'), async () => resposta({ texto: '' })],
  });
  const eventos = await enviar(servico, 'Que dia é hoje?');
  assert.deepEqual(eventos.filter((evento) => evento.tipo === 'trecho'), []);
  assert.equal(gravadas[1].texto, 'Vou consultar. ');
});

test('duas propostas na mesma resposta ficam as duas na mensagem, na ordem em que nasceram (task 225)', async () => {
  const propostas = [42, 43];
  let proxima = 0;
  const { servico, gravadas } = montar({
    chamadas: [
      async () => pedidoDeFerramenta('t1', 'propor_atividade'),
      async () => pedidoDeFerramenta('t2', 'propor_atividade'),
      async () => resposta({ texto: 'Duas propostas.' }),
    ],
    ferramenta: () => {
      const propostaId = propostas[proxima++];
      return { conteudo: `{"propostaId":${propostaId}}`, erro: false, propostaId };
    },
  });
  const eventos = await enviar(servico);
  assert.deepEqual(eventos.filter((evento) => evento.tipo === 'proposta'), [{ tipo: 'proposta', propostaId: 42 }, { tipo: 'proposta', propostaId: 43 }]);
  assert.deepEqual(gravadas[1].propostaIds, [42, 43]);
  const fim = eventos.find((evento) => evento.tipo === 'fim');
  assert.deepEqual(fim?.tipo === 'fim' ? fim.mensagem.propostaIds : null, [42, 43], 'o fim leva a lista inteira para a tela');
});

test('resposta sem proposta grava a lista vazia (task 225)', async () => {
  const { servico, gravadas } = montar({ chamadas: [async () => resposta({ texto: 'Oi.' })] });
  await enviar(servico);
  assert.deepEqual(gravadas[1].propostaIds, []);
});

// P-022: o resultado gravado da ferramenta diz "nada foi feito ainda"; o usuário confirma no cartão e a IA, na mensagem seguinte, precisa saber.
function cenarioDeProposta(propostas: Cenario['propostas']): Cenario {
  return {
    chamadas: [async () => pedidoDeFerramenta('t1', 'propor_atividade'), async () => resposta({ texto: 'Proposta criada.' }), async () => resposta({ texto: 'Certo.' })],
    ferramenta: () => ({ conteudo: '{"propostaId":42,"situacao":"PENDENTE","mensagem":"Proposta criada. Nada foi feito ainda: o usuário precisa confirmar no cartão da conversa."}', erro: false, propostaId: 42 }),
    propostas,
  };
}
const resultadosNoContexto = (solicitacao: IaSolicitacao) =>
  solicitacao.mensagens.flatMap((mensagem) => (typeof mensagem.conteudo === 'string' ? [] : mensagem.conteudo)).flatMap((bloco) => (bloco.tipo === 'resultado_ferramenta' ? [bloco.conteudo] : []));

test('proposta confirmada no cartão: a mensagem seguinte leva ao modelo a situação atual, não "nada foi feito ainda"', async () => {
  const { servico, solicitacoes } = montar(cenarioDeProposta({ 42: { status: StatusPropostaIaEnum.CONFIRMADA, resultado: { atividadeId: 9 } } }));
  await enviar(servico, 'cria a atividade Login');
  await enviar(servico, 'e agora?');
  const lidos = resultadosNoContexto(solicitacoes[2]).map((conteudo) => JSON.parse(conteudo) as Record<string, unknown>);
  assert.equal(lidos.length, 1);
  assert.deepEqual([lidos[0]['propostaId'], lidos[0]['situacao'], lidos[0]['resultado']], [42, 'CONFIRMADA', { atividadeId: 9 }]);
  assert.match(String(lidos[0]['mensagem']), /JÁ FOI FEITA/);
});

test('proposta que o usuário recusou ou ainda não decidiu: o modelo vê a situação verdadeira', async () => {
  const recusada = montar(cenarioDeProposta({ 42: { status: StatusPropostaIaEnum.EXPIRADA } }));
  await enviar(recusada.servico, 'cria a atividade Login');
  await enviar(recusada.servico, 'e agora?');
  assert.match(resultadosNoContexto(recusada.solicitacoes[2])[0], /NADA foi feito/);

  const pendente = montar(cenarioDeProposta({ 42: { status: StatusPropostaIaEnum.PENDENTE } }));
  await enviar(pendente.servico, 'cria a atividade Login');
  await enviar(pendente.servico, 'e agora?');
  assert.match(resultadosNoContexto(pendente.solicitacoes[2])[0], /Nada foi feito ainda/);
});

test('proposta que não dá para ler: o contexto segue com o resultado gravado e a conversa não quebra', async () => {
  const { servico, solicitacoes } = montar(cenarioDeProposta(undefined));
  await enviar(servico, 'cria a atividade Login');
  const eventos = await enviar(servico, 'e agora?');
  assert.equal(eventos.at(-1)?.tipo, 'fim');
  assert.match(resultadosNoContexto(solicitacoes[2])[0], /Nada foi feito ainda/);
});

test('passar de 8 voltas vira erro, grava a mensagem do sistema e recusa a proposta pendente', async () => {
  const { servico, gravadas, recusadas, solicitacoes } = montar({
    chamadas: [async () => pedidoDeFerramenta('t')],
    ferramenta: () => ({ conteudo: '{}', erro: false, propostaId: 9 }),
  });
  const eventos = await enviar(servico);
  assert.equal(solicitacoes.length, MAXIMO_DE_VOLTAS);
  assert.equal(eventos.at(-1)?.tipo, 'erro');
  assert.deepEqual(gravadas.map((mensagem) => mensagem.autor), [AutorChatEnum.USUARIO, AutorChatEnum.SISTEMA]);
  assert.equal(recusadas.length, MAXIMO_DE_VOLTAS);
  assert.equal(recusadas[0], 9);
});

test('falha da IA no meio: evento de erro com a mensagem traduzida, usuário preservado, nenhuma mensagem de IA', async () => {
  const { servico, gravadas } = montar({
    chamadas: [
      async (_s, aoTrecho) => {
        aoTrecho('Bom ');
        throw new IaException('INDISPONIVEL', 'A IA está fora do ar no momento');
      },
    ],
  });
  const eventos = await enviar(servico);
  assert.deepEqual(eventos.at(-1), { tipo: 'erro', mensagem: 'A IA está fora do ar no momento' });
  assert.deepEqual(gravadas.map((mensagem) => mensagem.autor), [AutorChatEnum.USUARIO, AutorChatEnum.SISTEMA]);
  assert.equal(gravadas[1].texto, 'A IA está fora do ar no momento');
});

test('erro desconhecido vira a mensagem genérica, sem vazar detalhe', async () => {
  const { servico } = montar({ chamadas: [async () => { throw new Error('chave sk-ant-123 inválida'); }] });
  const eventos = await enviar(servico);
  assert.deepEqual(eventos.at(-1), { tipo: 'erro', mensagem: 'Serviço de IA temporariamente indisponível' });
});

test('IA desligada responde 409 antes de gravar qualquer coisa', async () => {
  const { servico, gravadas } = montar({ chamadas: [async () => resposta({ texto: 'x' })], estado: EstadoIaEnum.DESLIGADA });
  await assert.rejects(enviar(servico), ConflictException);
  assert.equal(gravadas.length, 0);
});

test('uma mensagem por conversa por vez: o segundo envio recebe 409 e a trava é liberada no fim', async () => {
  let liberar: () => void = () => undefined;
  const { servico, gravadas } = montar({
    chamadas: [
      () => new Promise<IaResposta>((resolver) => { liberar = () => resolver(resposta({ texto: 'ok' })); }),
      async () => resposta({ texto: 'de novo' }),
    ],
  });
  const primeira = enviar(servico, 'primeira');
  await new Promise((resolver) => setTimeout(resolver, 10));
  await assert.rejects(enviar(servico, 'segunda'), ConflictException);
  liberar();
  await primeira;
  assert.equal(gravadas.filter((mensagem) => mensagem.autor === AutorChatEnum.USUARIO).length, 1);
  const terceira = await enviar(servico, 'terceira');
  assert.equal(terceira.at(-1)?.tipo, 'fim');
});

test('a trava é liberada mesmo quando a IA falha', async () => {
  const { servico } = montar({ chamadas: [async () => { throw new IaException('LIMITE', 'Limite de uso da IA atingido'); }, async () => resposta({ texto: 'ok' })] });
  await enviar(servico);
  assert.equal((await enviar(servico)).at(-1)?.tipo, 'fim');
});

test('o contexto é limitado às últimas 40 mensagens do dia, começando por um texto do usuário', async () => {
  const historicoInicial: ChatMensagemNova[] = [];
  for (let i = 0; i < 60; i++) {
    historicoInicial.push({
      conversaId: 'x', usuarioId: 7, contexto: ContextoChatEnum.CHAT,
      autor: i % 2 === 0 ? AutorChatEnum.USUARIO : AutorChatEnum.IA, texto: `mensagem ${i}`,
    });
  }
  const { servico, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'ok' })], historicoInicial });
  await enviar(servico, 'a última');
  const enviadas = solicitacoes[0].mensagens;
  assert.ok(enviadas.length <= JANELA_DE_MENSAGENS);
  assert.equal(enviadas[0].papel, 'usuario');
  assert.equal(enviadas.at(-1)?.conteudo, 'a última');
});

test('montarMensagens ignora o sistema, expande as trocas de ferramenta e descarta resultado órfão no começo', () => {
  const { servico } = montar({ chamadas: [] });
  const base = { conversaId: 'x', usuarioId: 7, contexto: ContextoChatEnum.CHAT, createdDate: new Date() } as never;
  const lida = (parcial: Partial<ChatMensagemLida>): ChatMensagemLida => ({ ...(base as object), ...parcial }) as ChatMensagemLida;
  const trocas = [
    { papel: 'ia', conteudo: [{ tipo: 'uso_ferramenta', id: 't', nome: 'f', entrada: {} }] },
    { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 't', conteudo: '{}' }] },
    { papel: 'ia', conteudo: [{ tipo: 'texto', texto: 'pronto' }] },
  ];
  const mensagens = servico.montarMensagens([
    lida({ autor: AutorChatEnum.USUARIO, texto: 'pergunta' }),
    lida({ autor: AutorChatEnum.SISTEMA, texto: 'erro anterior' }),
    lida({ autor: AutorChatEnum.IA, texto: 'pronto', conteudoBruto: { mensagens: trocas } }),
    lida({ autor: AutorChatEnum.IA, texto: 'sem bruto', conteudoBruto: null }),
  ]);
  assert.deepEqual(mensagens.map((mensagem) => mensagem.papel), ['usuario', 'ia', 'usuario', 'ia', 'ia']);
  assert.equal(mensagens.at(-1)?.conteudo, 'sem bruto');

  const cortado = servico.montarMensagens([
    lida({ autor: AutorChatEnum.IA, texto: 'x', conteudoBruto: { mensagens: trocas } }),
    lida({ autor: AutorChatEnum.USUARIO, texto: 'depois' }),
  ]);
  assert.deepEqual(cortado, [{ papel: 'usuario', conteudo: 'depois' }]);
});

test('recuperarHoje devolve a conversa do dia no fuso configurado, sem o conteúdo bruto', async () => {
  const { servico } = montar({
    chamadas: [async () => resposta({ texto: 'oi' })],
  });
  await enviar(servico);
  const hoje = await servico.recuperarHoje(USUARIO);
  assert.match(hoje.dados.conversaId, /^7-\d{4}-\d{2}-\d{2}$/);
  assert.equal(hoje.dados.mensagens.length, 2);
  assert.equal(hoje.dados.mensagens.some((mensagem) => 'conteudoBruto' in mensagem), false);
});

const nomesGerados = (geradas: IaSolicitacao[]) => geradas.filter((solicitacao) => solicitacao.instrucoes === INSTRUCOES_TITULO);
const nomesDe = (titulos: Record<string, TituloDaConversa>) => Object.values(titulos).map((valor) => valor.titulo);

test('dá nome à conversa já na primeira resposta, limpa o que a IA devolve e não o marca como editado', async () => {
  const { servico, titulos, geradas } = montar({ chamadas: [async () => resposta({ texto: 'oi' })] });
  await enviar(servico);
  assert.equal(nomesGerados(geradas).length, 1);
  assert.equal(nomesGerados(geradas)[0].nivel, NivelIaEnum.RAPIDO);
  assert.match(String(nomesGerados(geradas)[0].mensagens[0].conteudo), /Usuário: Oi/);
  assert.deepEqual(Object.values(titulos), [{ titulo: 'Revisão do webhook', editado: false }]);
});

test('na primeira vez o nome atual mandado à IA é o padrão "Chat do dia ..."', async () => {
  const { servico, geradas } = montar({ chamadas: [async () => resposta({ texto: 'oi' })] });
  await enviar(servico);
  assert.match(String(nomesGerados(geradas)[0].mensagens[0].conteudo), /^Nome atual: Chat do dia \d{1,2} de \p{L}+ de \d{4}\n\n/u);
});

test('a cada mensagem nova do usuário o nome é reavaliado e uma mudança de assunto troca o nome', async () => {
  let rodada = 0;
  const { servico, titulos, geradas, gravacoesDeTitulo } = montar({
    chamadas: [async () => resposta({ texto: 'oi' })],
    titulo: (solicitacao) => (solicitacao.instrucoes !== INSTRUCOES_TITULO || ++rodada <= 2 ? 'Revisão do webhook' : 'Relatório mensal'),
  });
  await enviar(servico);
  await enviar(servico, 'de novo');
  assert.equal(nomesGerados(geradas).length, 2);
  assert.equal(gravacoesDeTitulo.length, 1, 'o mesmo nome devolvido pela IA não é gravado de novo');
  assert.match(String(nomesGerados(geradas)[1].mensagens[0].conteudo), /^Nome atual: Revisão do webhook\n\n/);

  await enviar(servico, 'outro assunto');
  assert.equal(gravacoesDeTitulo.length, 2);
  assert.deepEqual(nomesDe(titulos), ['Relatório mensal']);
});

test('a nomeação manda só as últimas mensagens, cada uma cortada: o custo não cresce com a conversa', async () => {
  const longa = 'x'.repeat(CARACTERES_POR_MENSAGEM_PARA_NOMEAR + 200);
  const { servico, geradas } = montar({ chamadas: [async () => resposta({ texto: 'resposta curta' })] });
  for (let volta = 1; volta <= 8; volta++) await enviar(servico, `${volta}-${longa}`);
  const ultimo = String(nomesGerados(geradas).at(-1)!.mensagens[0].conteudo);
  const trechos = ultimo.split('\n\n').slice(1);
  assert.equal(trechos.length, MENSAGENS_PARA_NOMEAR);
  assert.ok(trechos.every((trecho) => trecho.length <= 'Usuário: '.length + CARACTERES_POR_MENSAGEM_PARA_NOMEAR));
  assert.doesNotMatch(ultimo, /Usuário: 1-/);
  assert.match(ultimo, /Usuário: 8-/);
});

test('nome dado pelo usuário nunca é trocado e a IA nem é chamada para nomear', async () => {
  const { servico, titulos, geradas, gravacoesDeTitulo } = montar({ chamadas: [async () => resposta({ texto: 'oi' })] });
  await enviar(servico);
  const conversaId = (await servico.recuperarHoje(USUARIO)).dados.conversaId;
  titulos[conversaId] = { titulo: 'Meu nome', editado: true };
  geradas.length = 0;
  gravacoesDeTitulo.length = 0;
  await enviar(servico, 'mais uma');
  assert.equal(nomesGerados(geradas).length, 0);
  assert.equal(gravacoesDeTitulo.length, 0);
  assert.deepEqual(titulos[conversaId], { titulo: 'Meu nome', editado: true });
});

test('se o usuário renomeia enquanto a IA pensa, o nome dele vence', async () => {
  const montado = montar({
    chamadas: [async () => resposta({ texto: 'oi' })],
    titulo: () => {
      const conversaId = Object.keys(montado.gravadas).length ? montado.gravadas[0].conversaId : '';
      montado.titulos[conversaId] = { titulo: 'Meu nome', editado: true };
      return 'Nome da IA';
    },
  });
  await enviar(montado.servico);
  assert.deepEqual(nomesDe(montado.titulos), ['Meu nome']);
  assert.equal(montado.gravacoesDeTitulo.length, 0);
});

test('o check-in nunca nomeia a conversa', async () => {
  const { servico, geradas, gravacoesDeTitulo } = montar({ chamadas: [async () => resposta({ texto: 'Anotado' })] });
  await servico.enviarMensagem(USUARIO, { texto: 'fiz o login' }, () => undefined, { contexto: ContextoChatEnum.CHECKIN, instrucoesExtras: '[Contexto do check-in]' });
  assert.equal(nomesGerados(geradas).length, 0);
  assert.equal(gravacoesDeTitulo.length, 0);
});

test('falha ao nomear a conversa não atrapalha a resposta', async () => {
  const { servico, titulos } = montar({
    chamadas: [async () => resposta({ texto: 'oi' })],
    titulo: () => {
      throw new Error('IA caiu');
    },
  });
  const eventos = await enviar(servico);
  assert.equal(eventos.at(-1)?.tipo, 'fim');
  assert.deepEqual(titulos, {});
});

test('alterarTituloConversa grava o nome aparado e sem espaços repetidos, marcado como editado, na conversa do dono do token', async () => {
  const { servico, gravacoesDeTitulo } = montar({ chamadas: [], historicoInicial: [{ conversaId: '7-2026-10-17', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'oi' }] });
  const resposta = await servico.alterarTituloConversa({ data: '2026-10-17', titulo: '  Plano   da sprint \n ' }, USUARIO);
  assert.deepEqual(gravacoesDeTitulo, [{ conversaId: '7-2026-10-17', usuarioId: 7, titulo: 'Plano da sprint', editado: true }]);
  assert.deepEqual(resposta.dados, { conversaId: '7-2026-10-17', titulo: 'Plano da sprint', tituloEditado: true });
});

test('alterarTituloConversa em branco volta ao padrão e à renomeação automática', async () => {
  const { servico, gravacoesDeTitulo } = montar({ chamadas: [], historicoInicial: [{ conversaId: '7-2026-10-17', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'oi' }] });
  const resposta = await servico.alterarTituloConversa({ data: '2026-10-17', titulo: '   ' }, USUARIO);
  assert.deepEqual(gravacoesDeTitulo, [{ conversaId: '7-2026-10-17', usuarioId: 7, titulo: '', editado: false }]);
  assert.deepEqual(resposta.dados, { conversaId: '7-2026-10-17', titulo: 'Chat do dia 17 de outubro de 2026', tituloEditado: false });
});

test('alterarTituloConversa: conversa sem mensagens do dono do token (inclusive a de outra pessoa) é 404 e nada é gravado', async () => {
  const { servico, gravacoesDeTitulo } = montar({ chamadas: [] });
  await assert.rejects(() => servico.alterarTituloConversa({ data: '2026-10-17', titulo: 'Invasão' }, USUARIO), ResourceNotFoundException);
  assert.deepEqual(gravacoesDeTitulo, []);
});

test('listarConversas devolve o dia, o trecho inicial e a contagem de cada conversa do dono', async () => {
  const { servico, ordem } = montar({ chamadas: [], titulosIniciais: { '7-2026-10-17': 'Bom dia no projeto' } });
  const resposta = await servico.listarConversas(USUARIO);
  assert.match(ordem[0], /"usuarioId":7/);
  assert.deepEqual(
    resposta.dados.conversas.map((conversa) => [conversa.data, conversa.titulo, conversa.primeiraMensagem, conversa.quantidadeDeMensagens]),
    [['2026-10-17', 'Bom dia no projeto', 'bom dia', 4], ['2026-10-16', 'Chat do dia 16 de outubro de 2026', '', 2]],
  );
  assert.deepEqual(resposta.dados.conversas.map((conversa) => conversa.tituloEditado), [false, false]);
  assert.equal(resposta.dados.conversas[0].ultimaMensagemDate.toISOString(), '2026-10-17T15:00:00.000Z');
});

test('listarConversas devolve se o nome é do usuário e usa o padrão quando o nome gravado está vazio', async () => {
  const { servico } = montar({ chamadas: [], titulosIniciais: { '7-2026-10-17': { titulo: 'Meu nome', editado: true }, '7-2026-10-16': { titulo: '', editado: false } } });
  const conversas = (await servico.listarConversas(USUARIO)).dados.conversas;
  assert.deepEqual(conversas.map((conversa) => [conversa.titulo, conversa.tituloEditado]), [['Meu nome', true], ['Chat do dia 16 de outubro de 2026', false]]);
});

test('recuperarConversa monta o id com o dono do token, nunca com outro, e traz o nome (o padrão se não há)', async () => {
  const { servico } = montar({ chamadas: [] });
  const resposta = await servico.recuperarConversa({ data: '2026-10-10' }, USUARIO);
  assert.equal(resposta.dados.conversaId, '7-2026-10-10');
  assert.equal(resposta.dados.titulo, 'Chat do dia 10 de outubro de 2026');
});

test('buscar repassa o usuário do token e o período', async () => {
  const { servico, ordem } = montar({ chamadas: [] });
  await servico.buscar({ texto: 'descricao', inicio: '2026-10-01T00:00:00.000Z' }, USUARIO);
  assert.match(ordem[0], /"usuarioId":7/);
  assert.match(ordem[0], /"texto":"descricao"/);
  assert.match(ordem[0], /2026-10-01/);
});

// ------------------------------------------------------------------ bom dia proativo (task 147)

async function bomDia(servico: ChatService) {
  const eventos: ChatEventoDto[] = [];
  await servico.iniciarBomDia(USUARIO, (evento) => eventos.push(evento));
  return eventos;
}

test('bom dia: grava só a mensagem da IA e a instrução de abertura vai ao modelo sem virar mensagem do chat', async () => {
  const { servico, gravadas, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'Bom dia! Hoje você tem 2 atividades.' })] });
  const eventos = await bomDia(servico);
  assert.equal(eventos.at(-1)?.tipo, 'fim');
  assert.deepEqual(gravadas.map((mensagem) => mensagem.autor), [AutorChatEnum.IA]);
  assert.match(String(solicitacoes[0].mensagens[0].conteudo), /Abertura do dia/);
  assert.equal(solicitacoes[0].mensagens[0].papel, 'usuario');
});

test('bom dia: só uma vez por dia (a segunda chamada é 409 e não chama o modelo)', async () => {
  const { servico, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'Bom dia!' })] });
  await bomDia(servico);
  await assert.rejects(bomDia(servico), ConflictException);
  assert.equal(solicitacoes.length, 1);
});

test('bom dia: com a IA desligada é 409; com uma resposta da IA já na conversa também', async () => {
  const desligada = montar({ chamadas: [], estado: EstadoIaEnum.DESLIGADA });
  await assert.rejects(bomDia(desligada.servico), ConflictException);
  const jaConversou = montar({ chamadas: [async () => resposta({ texto: 'oi' })] });
  await enviar(jaConversou.servico);
  await assert.rejects(bomDia(jaConversou.servico), ConflictException);
});

test('bom dia: a mensagem seguinte do usuário já leva a abertura e a saudação no contexto', async () => {
  const { servico, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'Bom dia!' }), async () => resposta({ texto: 'Certo.' })] });
  await bomDia(servico);
  await enviar(servico, 'Quero começar pelo login');
  const contexto = solicitacoes[1].mensagens;
  assert.match(String(contexto[0].conteudo), /Abertura do dia/);
  assert.equal(contexto[1].papel, 'ia');
  assert.equal(contexto.at(-1)?.conteudo, 'Quero começar pelo login');
});

test('bom dia: falha avisa pelo evento, mas não grava mensagem do sistema (F5 com a IA fora do ar não empilha erros)', async () => {
  const { servico, gravadas } = montar({
    chamadas: [
      async () => {
        throw new IaException('INDISPONIVEL', 'A IA está fora do ar no momento');
      },
    ],
  });
  const eventos = await bomDia(servico);
  assert.equal(eventos.at(-1)?.tipo, 'erro');
  assert.deepEqual(gravadas, []);
});

// ------------------------------------------------------------------ contexto do check-in (task 149)

async function enviarCheckin(servico: ChatService, texto = 'Mexi na validação do e-mail') {
  const eventos: ChatEventoDto[] = [];
  await servico.enviarMensagem(USUARIO, { texto }, (evento) => eventos.push(evento), { contexto: ContextoChatEnum.CHECKIN, instrucoesExtras: '[Contexto do check-in] rigor X' });
  return eventos;
}

test('check-in: grava as mensagens com o contexto CHECKIN, usa o prompt CHECKIN e soma o contexto às instruções', async () => {
  const { servico, gravadas, solicitacoes, tiposDePrompt, geradas } = montar({ chamadas: [async () => resposta({ texto: 'Entendi. O que mais?' })] });
  const eventos = await enviarCheckin(servico);
  assert.equal(eventos.at(-1)?.tipo, 'fim');
  assert.deepEqual(gravadas.map((mensagem) => [mensagem.autor, mensagem.contexto]), [[AutorChatEnum.USUARIO, ContextoChatEnum.CHECKIN], [AutorChatEnum.IA, ContextoChatEnum.CHECKIN]]);
  assert.deepEqual(tiposDePrompt, [TipoPromptEnum.CHECKIN]);
  assert.match(String(solicitacoes[0].instrucoes), /Você é o assistente\.[\s\S]*\[Contexto do check-in\] rigor X/);
  assert.equal(geradas.length, 0, 'o check-in não dá nome à conversa do chat');
});

test('check-in e chat não se leem: a tela do chat não mostra o check-in e o check-in não vê o chat', async () => {
  const { servico, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'resposta do chat' }), async () => resposta({ texto: 'resposta do check-in' })] });
  await enviar(servico, 'Pergunta do chat');
  await enviarCheckin(servico, 'Resposta do check-in');

  const checkin = solicitacoes[1].mensagens.map((mensagem) => (typeof mensagem.conteudo === 'string' ? mensagem.conteudo : ''));
  assert.deepEqual(checkin, ['Resposta do check-in']);

  const hoje = await servico.recuperarHoje(USUARIO);
  assert.deepEqual(hoje.dados.mensagens.map((mensagem) => mensagem.texto), ['Pergunta do chat', 'resposta do chat']);
});

test('check-in: uma resposta do check-in não conta como o bom dia do chat', async () => {
  const { servico } = montar({ chamadas: [async () => resposta({ texto: 'ok' }), async () => resposta({ texto: 'Bom dia!' })] });
  await enviarCheckin(servico);
  const eventos = await bomDia(servico);
  assert.equal(eventos.at(-1)?.tipo, 'fim');
});

test('sugestões: depois de cada resposta do chat sai o evento com as sugestões da IA; o check-in não pede sugestões', async () => {
  const { servico } = montar({ chamadas: [async () => resposta({ texto: 'Posso criar a atividade.' }), async () => resposta({ texto: 'ok' })], titulo: () => '["Criar a atividade", "Ver as atividades"]' });
  const eventos = await enviar(servico);
  assert.deepEqual(eventos.find((evento) => evento.tipo === 'sugestoes'), { tipo: 'sugestoes', itens: ['Criar a atividade', 'Ver as atividades'] });
  const noCheckin = await enviarCheckin(servico);
  assert.equal(noCheckin.some((evento) => evento.tipo === 'sugestoes'), false);
});

test('sugestões: falha ou resposta inútil do modelo não atrapalha o chat nem emite o evento', async () => {
  const { servico } = montar({ chamadas: [async () => resposta({ texto: 'oi' })], titulo: () => 'não sei sugerir' });
  const eventos = await enviar(servico);
  assert.equal(eventos.at(-1)?.tipo, 'fim');
  assert.equal(eventos.some((evento) => evento.tipo === 'sugestoes'), false);
});

// ------------------------------------------------------------------ retomada depois da queda (task 158)

async function retomar(servico: ChatService) {
  const eventos: ChatEventoDto[] = [];
  await servico.retomarAposQueda(USUARIO, (evento) => eventos.push(evento));
  return eventos;
}

test('retomada: sem conversa hoje ou com a IA desligada é 409 e não chama o modelo', async () => {
  const vazio = montar({ chamadas: [async () => resposta({ texto: 'x' })] });
  await assert.rejects(retomar(vazio.servico), ConflictException);
  assert.equal(vazio.solicitacoes.length, 0);
  const desligada = montar({ chamadas: [], estado: EstadoIaEnum.DESLIGADA });
  await assert.rejects(retomar(desligada.servico), ConflictException);
});

test('retomada: o histórico vai ao modelo, a instrução entra no fim e só a resposta da IA é gravada (a conversa continua a mesma)', async () => {
  const { servico, gravadas, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'Oi!' }), async () => resposta({ texto: 'Você iniciou o login à mão.' })] });
  await enviar(servico, 'Bom dia');
  const antes = gravadas.length;
  const eventos = await retomar(servico);
  assert.equal(eventos.at(-1)?.tipo, 'fim');
  assert.equal(gravadas.length, antes + 1);
  assert.equal(gravadas.at(-1)?.autor, AutorChatEnum.IA);
  const contexto = solicitacoes[1].mensagens;
  assert.equal(contexto[0].conteudo, 'Bom dia');
  assert.match(String(contexto.at(-1)?.conteudo), /Retomada/);
  assert.equal(contexto.at(-1)?.papel, 'usuario');
});

test('retomada: leva as propostas obsoletas descartadas para a instrução', async () => {
  const { servico, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'Oi!' }), async () => resposta({ texto: 'Ok.' })], obsoletas: 2 });
  await enviar(servico, 'Bom dia');
  await retomar(servico);
  assert.match(String(solicitacoes[1].mensagens.at(-1)?.conteudo), /2 propostas pendentes ficaram obsoletas/);
});

test('retomada: a mensagem seguinte do usuário já leva a instrução e a resposta da retomada no contexto', async () => {
  const { servico, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'Oi!' }), async () => resposta({ texto: 'Tudo como estava.' }), async () => resposta({ texto: 'Certo.' })] });
  await enviar(servico, 'Bom dia');
  await retomar(servico);
  await enviar(servico, 'Vamos seguir');
  const contexto = solicitacoes[2].mensagens;
  assert.ok(contexto.some((mensagem) => typeof mensagem.conteudo === 'string' && /Retomada/.test(mensagem.conteudo)));
  assert.equal(contexto.at(-1)?.conteudo, 'Vamos seguir');
});

test('retomada: falha avisa pelo evento e não grava mensagem do sistema', async () => {
  const { servico, gravadas } = montar({
    chamadas: [
      async () => resposta({ texto: 'Oi!' }),
      async () => {
        throw new IaException('INDISPONIVEL', 'A IA está fora do ar no momento');
      },
    ],
  });
  await enviar(servico, 'Bom dia');
  const antes = gravadas.length;
  const eventos = await retomar(servico);
  assert.equal(eventos.at(-1)?.tipo, 'erro');
  assert.equal(gravadas.length, antes);
});

// Task 188 (corrige P-017): o selo da resposta é o maior nível do turno, contando as ferramentas que chamam a IA por baixo.

const chamadaDaIa = (nivel: NivelIaEnum, modelo: string, tokens = { entrada: 100, saida: 50, cache: 7 }) => ({ ...resposta({ texto: 'x', tokens }), nivel, modelo });

test('turno sem ferramenta que chame a IA grava RAPIDO, o modelo e os tokens da própria conversa', async () => {
  const { servico, gravadas } = montar({ chamadas: [async () => resposta({ texto: 'oi' })] });
  await enviar(servico);
  const ia = gravadas.at(-1)!;
  assert.deepEqual([ia.nivel, ia.modelo, ia.tokensEntrada, ia.tokensSaida, ia.tokensCache], [NivelIaEnum.RAPIDO, 'claude-haiku-5-5', 10, 5, 1]);
});

test('ferramenta que chamou o analítico: a mensagem grava ANALITICO, o modelo dele e os tokens somados', async () => {
  const { servico, gravadas } = montar({
    chamadas: [async () => pedidoDeFerramenta('t1', 'descrever_demanda'), async () => resposta({ texto: 'Pronto.' })],
    iaDaFerramenta: () => [chamadaDaIa(NivelIaEnum.ANALITICO, 'claude-opus-5-5')],
  });
  await enviar(servico, 'descreve a demanda');
  const ia = gravadas.at(-1)!;
  assert.equal(ia.nivel, NivelIaEnum.ANALITICO);
  assert.equal(ia.modelo, 'claude-opus-5-5');
  // duas chamadas da conversa (10/5/1 cada) + a da ferramenta (100/50/7); a nomeação e as sugestões, que vêm depois do turno, não entram
  assert.deepEqual([ia.tokensEntrada, ia.tokensSaida, ia.tokensCache], [120, 60, 9]);
});

test('duas ferramentas em níveis diferentes: grava o maior, em qualquer ordem', async () => {
  const { servico, gravadas } = montar({
    chamadas: [async () => pedidoDeFerramenta('t1', 'descrever_demanda'), async () => pedidoDeFerramenta('t2', 'descrever_execucao'), async () => resposta({ texto: 'Pronto.' })],
    iaDaFerramenta: (nome) => [nome === 'descrever_demanda' ? chamadaDaIa(NivelIaEnum.ANALITICO, 'opus') : chamadaDaIa(NivelIaEnum.PADRAO, 'sonnet')],
  });
  await enviar(servico);
  assert.deepEqual([gravadas.at(-1)!.nivel, gravadas.at(-1)!.modelo], [NivelIaEnum.ANALITICO, 'opus']);
});

test('ferramenta que falhou, e por isso não registrou chamada, não soma nem sobe o nível', async () => {
  const { servico, gravadas } = montar({
    chamadas: [async () => pedidoDeFerramenta('t1', 'descrever_demanda'), async () => resposta({ texto: 'Não consegui.' })],
    ferramenta: () => ({ conteudo: 'erro', erro: true }),
    iaDaFerramenta: () => [],
  });
  await enviar(servico);
  const ia = gravadas.at(-1)!;
  assert.deepEqual([ia.nivel, ia.tokensEntrada], [NivelIaEnum.RAPIDO, 20]);
});

test('o check-in também grava o maior nível do turno', async () => {
  const { servico, gravadas } = montar({
    chamadas: [async () => pedidoDeFerramenta('t1', 'descrever_execucao'), async () => resposta({ texto: 'Anotado' })],
    iaDaFerramenta: () => [chamadaDaIa(NivelIaEnum.PADRAO, 'sonnet')],
  });
  await servico.enviarMensagem(USUARIO, { texto: 'fiz o login' }, () => undefined, { contexto: ContextoChatEnum.CHECKIN, instrucoesExtras: '[Contexto do check-in]' });
  assert.equal(gravadas.at(-1)!.nivel, NivelIaEnum.PADRAO);
});

test('o turno acaba com a resposta: a nomeação e as sugestões não entram na conta do selo', async () => {
  const { servico, gravadas, geradas } = montar({ chamadas: [async () => resposta({ texto: 'oi' })] });
  await enviar(servico);
  assert.ok(geradas.length >= 2, 'houve nomeação e sugestões');
  assert.deepEqual([gravadas.at(-1)!.tokensEntrada, gravadas.at(-1)!.tokensSaida], [10, 5]);
});

// ---- Task 191: assunto das mensagens, dúvidas de código e contexto do chat ----

const historicoDeAssuntos = (): ChatMensagemNova[] => [
  { conversaId: 'x', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, assunto: AssuntoChatEnum.SISTEMA, texto: 'quais minhas atividades?' },
  { conversaId: 'x', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.IA, assunto: AssuntoChatEnum.SISTEMA, texto: 'você tem duas' },
  { conversaId: 'x', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, assunto: AssuntoChatEnum.CODIGO, texto: 'como faço um loop em PHP?' },
  { conversaId: 'x', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.IA, assunto: AssuntoChatEnum.CODIGO, texto: 'use foreach' },
];

test('dúvidas de código desligadas: não classifica, grava SISTEMA nas duas mensagens e a conversa leva a recusa fixa', async () => {
  const { servico, gravadas, geradas, solicitacoes, tiposDePrompt } = montar({ chamadas: [async () => resposta({ texto: 'ok' })] });
  await enviar(servico, 'como faço um loop em PHP?');
  assert.equal(geradas.some((solicitacao) => solicitacao.instrucoes === INSTRUCOES_DE_ASSUNTO), false);
  assert.deepEqual(gravadas.map((mensagem) => mensagem.assunto), [AssuntoChatEnum.SISTEMA, AssuntoChatEnum.SISTEMA]);
  assert.equal(solicitacoes[0].instrucoes, `Você é o assistente.\n\n${INSTRUCOES_SO_PROJECT}`);
  assert.equal(tiposDePrompt.includes(TipoPromptEnum.DUVIDA_CODIGO), false);
  assert.equal(solicitacoes[0].ferramentas?.length, 1, 'as ferramentas continuam disponíveis');
});

test('dúvidas de código ligadas: classifica antes de gravar (nível rápido, sem ferramentas, teto pequeno) e grava o assunto nas duas mensagens', async () => {
  const { servico, gravadas, geradas, ordem, solicitacoes, tiposDePrompt } = montar({
    configuracao: { duvidasCodigo: true },
    assunto: () => 'CODIGO',
    chamadas: [async () => resposta({ texto: 'use foreach' })],
  });
  await enviar(servico, 'como faço um loop em PHP?');
  assert.deepEqual(ordem.slice(0, 4), ['classificar', 'gravar:USUARIO', 'ia', 'gravar:IA']);
  const classificacao = geradas.find((solicitacao) => solicitacao.instrucoes === INSTRUCOES_DE_ASSUNTO)!;
  assert.equal(classificacao.nivel, NivelIaEnum.RAPIDO);
  assert.equal(classificacao.ferramentas, undefined);
  assert.equal(classificacao.maximoTokens, 10);
  assert.match(String(classificacao.mensagens[0].conteudo), /Pergunta atual: como faço um loop em PHP\?/);
  assert.deepEqual(gravadas.map((mensagem) => mensagem.assunto), [AssuntoChatEnum.CODIGO, AssuntoChatEnum.CODIGO]);
  assert.equal(solicitacoes[0].instrucoes, 'Você é o assistente.\n\nRegras de código.');
  assert.ok(tiposDePrompt.includes(TipoPromptEnum.DUVIDA_CODIGO));
});

test('dúvidas de código ligadas: pergunta do sistema grava SISTEMA nas duas mensagens', async () => {
  const { servico, gravadas } = montar({ configuracao: { duvidasCodigo: true }, assunto: () => 'SISTEMA', chamadas: [async () => resposta({ texto: 'ok' })] });
  await enviar(servico, 'quais minhas atividades de hoje?');
  assert.deepEqual(gravadas.map((mensagem) => mensagem.assunto), [AssuntoChatEnum.SISTEMA, AssuntoChatEnum.SISTEMA]);
});

test('a classificação olha as últimas mensagens para "e em C#?" seguir o assunto anterior', async () => {
  const { servico, geradas } = montar({ configuracao: { duvidasCodigo: true }, assunto: () => 'CODIGO', chamadas: [async () => resposta({ texto: 'ok' })], historicoInicial: historicoDeAssuntos() });
  await enviar(servico, 'e em C#?');
  const pedido = String(geradas.find((solicitacao) => solicitacao.instrucoes === INSTRUCOES_DE_ASSUNTO)!.mensagens[0].conteudo);
  assert.match(pedido, /Usuário: como faço um loop em PHP\?/);
  assert.match(pedido, /IA: use foreach/);
  assert.ok(pedido.endsWith('Pergunta atual: e em C#?'));
});

test('falha da classificação nunca derruba o chat: vale o assunto da última mensagem marcada do dia', async () => {
  const { servico, gravadas, solicitacoes } = montar({
    configuracao: { duvidasCodigo: true },
    assunto: () => {
      throw new IaException('INDISPONIVEL', 'fora do ar');
    },
    chamadas: [async () => resposta({ texto: 'em C# é assim' })],
    historicoInicial: historicoDeAssuntos(),
  });
  const eventos = await enviar(servico, 'e em C#?');
  assert.equal(eventos.at(-1)?.tipo, 'fim');
  assert.equal(solicitacoes.length, 1);
  assert.deepEqual(gravadas.slice(-2).map((mensagem) => mensagem.assunto), [AssuntoChatEnum.CODIGO, AssuntoChatEnum.CODIGO]);
});

test('falha da classificação sem nenhuma mensagem marcada cai em SISTEMA; resposta que não é um assunto também', async () => {
  const falhar = (): string => {
    throw new Error('boom');
  };
  for (const assunto of [falhar, () => 'talvez']) {
    const { servico, gravadas } = montar({ configuracao: { duvidasCodigo: true }, assunto, chamadas: [async () => resposta({ texto: 'ok' })] });
    await enviar(servico, 'oi');
    assert.deepEqual(gravadas.map((mensagem) => mensagem.assunto), [AssuntoChatEnum.SISTEMA, AssuntoChatEnum.SISTEMA]);
  }
});

test('contexto SEPARADO manda ao modelo só o histórico do assunto da pergunta atual; MISTURADO manda tudo', async () => {
  const separado = montar({ configuracao: { duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO }, assunto: () => 'CODIGO', chamadas: [async () => resposta({ texto: 'ok' })], historicoInicial: historicoDeAssuntos() });
  await enviar(separado.servico, 'e em C#?');
  assert.deepEqual(separado.solicitacoes[0].mensagens.map((mensagem) => mensagem.conteudo), ['como faço um loop em PHP?', 'use foreach', 'e em C#?']);

  const doSistema = montar({ configuracao: { duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO }, assunto: () => 'SISTEMA', chamadas: [async () => resposta({ texto: 'ok' })], historicoInicial: historicoDeAssuntos() });
  await enviar(doSistema.servico, 'e as execuções?');
  assert.deepEqual(doSistema.solicitacoes[0].mensagens.map((mensagem) => mensagem.conteudo), ['quais minhas atividades?', 'você tem duas', 'e as execuções?']);

  const misturado = montar({ configuracao: { duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.MISTURADO }, assunto: () => 'CODIGO', chamadas: [async () => resposta({ texto: 'ok' })], historicoInicial: historicoDeAssuntos() });
  await enviar(misturado.servico, 'e em C#?');
  assert.deepEqual(misturado.solicitacoes[0].mensagens.map((mensagem) => mensagem.conteudo), [
    'quais minhas atividades?', 'você tem duas', 'como faço um loop em PHP?', 'use foreach', 'e em C#?',
  ]);
});

test('mensagem antiga sem assunto conta como SISTEMA no contexto SEPARADO', async () => {
  const antigas: ChatMensagemNova[] = [
    { conversaId: 'x', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'antiga do sistema' },
    { conversaId: 'x', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.IA, texto: 'resposta antiga' },
  ];
  const { servico, solicitacoes } = montar({ configuracao: { modoContextoChat: ModoContextoChatEnum.SEPARADO }, chamadas: [async () => resposta({ texto: 'ok' })], historicoInicial: antigas });
  await enviar(servico, 'mais uma');
  assert.deepEqual(solicitacoes[0].mensagens.map((mensagem) => mensagem.conteudo), ['antiga do sistema', 'resposta antiga', 'mais uma']);
});

test('o check-in não classifica, não é marcado e não leva a recusa nem o prompt de código', async () => {
  const { servico, gravadas, geradas, solicitacoes } = montar({ configuracao: { duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO }, assunto: () => 'CODIGO', chamadas: [async () => resposta({ texto: 'ok' })] });
  await servico.enviarMensagem(USUARIO, { texto: 'fiz o login' }, () => undefined, { contexto: ContextoChatEnum.CHECKIN, instrucoesExtras: '[Contexto do check-in]' });
  assert.equal(geradas.some((solicitacao) => solicitacao.instrucoes === INSTRUCOES_DE_ASSUNTO), false);
  assert.deepEqual(gravadas.map((mensagem) => mensagem.assunto), [null, null]);
  assert.equal(solicitacoes[0].instrucoes, 'Você é o assistente.\n\n[Contexto do check-in]');
});

test('a resposta de código tem teto de 4096 tokens por chamada', async () => {
  assert.equal(MAXIMO_TOKENS_DO_CHAT, 4096);
  const { servico, solicitacoes } = montar({ chamadas: [async () => resposta({ texto: 'ok' })] });
  await enviar(servico);
  assert.equal(solicitacoes[0].maximoTokens, 4096);
});

test('a retomada segue o modo de contexto e o assunto da última mensagem marcada', async () => {
  const { servico, solicitacoes } = montar({
    configuracao: { duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO },
    chamadas: [async () => resposta({ texto: 'retomando' })],
    historicoInicial: historicoDeAssuntos(),
  });
  await servico.retomarAposQueda(USUARIO, () => undefined);
  const textos = solicitacoes[0].mensagens.map((mensagem) => (typeof mensagem.conteudo === 'string' ? mensagem.conteudo : ''));
  assert.deepEqual(textos.slice(0, 2), ['como faço um loop em PHP?', 'use foreach']);
  assert.equal(textos.some((texto) => texto.includes('quais minhas atividades?')), false);
});
