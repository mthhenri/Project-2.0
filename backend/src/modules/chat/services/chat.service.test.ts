import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ChatEventoDto, ContextoChatEnum, EstadoIaEnum, NivelIaEnum, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { IaException } from '../../ia/domain/ia.exception';
import { IaResposta, IaSolicitacao } from '../../ia/domain/ia.tipos';
import { IaService } from '../../ia/services/ia.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ChatMensagemLida, ChatMensagemNova, deFonte, paraFonte } from '../domain/chat-mensagem.documento';
import { ArmazenamentoDeChat } from '../repositories/armazenamento-de-chat';
import { ChatService, INSTRUCOES_TITULO, JANELA_DE_MENSAGENS, MAXIMO_DE_VOLTAS } from './chat.service';

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
  estado?: EstadoIaEnum;
  historicoInicial?: ChatMensagemNova[];
  titulosIniciais?: Record<string, string>;
  /** O que a IA devolve ao pedir o nome da conversa (ou lança). */
  titulo?: () => string;
  /** Quantas propostas pendentes a retomada descarta como obsoletas. */
  obsoletas?: number;
}

function montar(cenario: Cenario) {
  const gravadas: ChatMensagemLida[] = [];
  const titulos: Record<string, string> = { ...(cenario.titulosIniciais ?? {}) };
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
    async gravarTitulo(conversaId: string, _usuarioId: number, titulo: string) {
      titulos[conversaId] = titulo;
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
      return resposta({ texto: cenario.titulo ? cenario.titulo() : '"Revisão do webhook."' });
    },
    async transmitir(solicitacao: IaSolicitacao, aoTrecho: (trecho: string) => void) {
      ordem.push('ia');
      solicitacoes.push({ ...solicitacao, mensagens: [...solicitacao.mensagens] });
      const chamada = cenario.chamadas[Math.min(indice++, cenario.chamadas.length - 1)];
      return chamada(solicitacao, aoTrecho);
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
        return { conteudo: 'Você é o assistente.' };
      },
    } as unknown as PromptService,
    {
      listarParaUsuario: () => [{ nome: 'consultar_data_e_hora', descricao: 'd', esquemaEntrada: {} }],
      executar: async (nome: string) => (cenario.ferramenta ? cenario.ferramenta(nome) : { conteudo: '{"data":"2026-10-17"}', erro: false }),
    } as unknown as FerramentaIaRegistro,
    {
      recusar: async (id: number) => {
        recusadas.push(id);
        return {};
      },
      expirarObsoletas: async () => cenario.obsoletas ?? 0,
    } as unknown as PropostaIaService,
    { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService,
  );
  return { servico, gravadas, ordem, solicitacoes, recusadas, titulos, geradas, tiposDePrompt };
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
  assert.equal(solicitacoes[0].instrucoes, 'Você é o assistente.');
  assert.equal(solicitacoes[0].ferramentas?.[0].nome, 'consultar_data_e_hora');
  assert.deepEqual(solicitacoes[0].mensagens, [{ papel: 'usuario', conteudo: 'Bom dia' }]);
});

test('laço de ferramentas: executa, devolve o resultado ao modelo e guarda as trocas do turno', async () => {
  const { servico, gravadas, solicitacoes } = montar({
    chamadas: [async () => pedidoDeFerramenta('t1'), async (_s, aoTrecho) => { aoTrecho('Hoje é sábado.'); return resposta({ texto: 'Hoje é sábado.' }); }],
  });
  const eventos = await enviar(servico, 'Que dia é hoje?');
  assert.deepEqual(
    eventos.map((evento) => (evento.tipo === 'ferramenta' ? `ferramenta:${evento.situacao}` : evento.tipo)),
    ['ferramenta:EXECUTANDO', 'ferramenta:CONCLUIDA', 'trecho', 'fim'],
  );
  const segundaChamada = solicitacoes[1].mensagens;
  assert.equal(segundaChamada.length, 3);
  assert.equal(segundaChamada[1].papel, 'ia');
  assert.deepEqual(segundaChamada[2], {
    papel: 'usuario',
    conteudo: [{ tipo: 'resultado_ferramenta', usoId: 't1', conteudo: '{"data":"2026-10-17"}', erro: false }],
  });
  const ia = gravadas[1];
  assert.equal(ia.texto, 'Vou consultar. Hoje é sábado.');
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
  assert.equal(gravadas[1].propostaId, 42);
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

test('dá nome à conversa depois da primeira resposta, só uma vez, e limpa o que a IA devolve', async () => {
  const { servico, titulos, geradas: todasAsGeradas } = montar({ chamadas: [async () => resposta({ texto: 'oi' })] });
  const geradas = () => todasAsGeradas.filter((solicitacao) => solicitacao.instrucoes === INSTRUCOES_TITULO);
  await enviar(servico);
  assert.equal(geradas().length, 1);
  assert.equal(geradas()[0].nivel, NivelIaEnum.RAPIDO);
  assert.match(String(geradas()[0].mensagens[0].conteudo), /Usuário: Oi/);
  assert.deepEqual(Object.values(titulos), ['Revisão do webhook']);
  await enviar(servico, 'de novo');
  assert.equal(geradas().length, 1);
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

test('listarConversas devolve o dia, o trecho inicial e a contagem de cada conversa do dono', async () => {
  const { servico, ordem } = montar({ chamadas: [], titulosIniciais: { '7-2026-10-17': 'Bom dia no projeto' } });
  const resposta = await servico.listarConversas(USUARIO);
  assert.match(ordem[0], /"usuarioId":7/);
  assert.deepEqual(
    resposta.dados.conversas.map((conversa) => [conversa.data, conversa.titulo, conversa.primeiraMensagem, conversa.quantidadeDeMensagens]),
    [['2026-10-17', 'Bom dia no projeto', 'bom dia', 4], ['2026-10-16', null, '', 2]],
  );
  assert.equal(resposta.dados.conversas[0].ultimaMensagemDate.toISOString(), '2026-10-17T15:00:00.000Z');
});

test('recuperarConversa monta o id com o dono do token, nunca com outro', async () => {
  const { servico } = montar({ chamadas: [] });
  const resposta = await servico.recuperarConversa({ data: '2026-10-10' }, USUARIO);
  assert.equal(resposta.dados.conversaId, '7-2026-10-10');
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
