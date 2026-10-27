import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum, NivelIaEnum, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { PlanoFonteService } from '../../plano/services/plano-fonte.service';
import { PlanoPontoService } from '../../plano/services/plano-ponto.service';
import { PlanoService } from '../../plano/services/plano.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { ChatMensagemLida, ChatMensagemNova, deFonte, paraFonte } from '../domain/chat-mensagem.documento';
import { ArmazenamentoDeChat } from '../repositories/armazenamento-de-chat';
import { OpcoesDeConversa } from './chat.service';
import { ChatPlanoService, LIMITE_CARACTERES_DA_ABA_NO_CONTEXTO, MAXIMO_TOKENS_DO_PLANEJAMENTO, ORIENTACAO_DAS_FONTES, ORIENTACAO_DOS_PONTOS } from './chat-plano.service';

// Conversa do planejamento (task 234): leitura sem dono, acesso pelo plano, instruções por quem fala e o nome de quem disse o quê.

const DESENVOLVEDOR = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 2, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

const PLANO = { id: 7, titulo: 'Relatório mensal', projetoNome: 'Projeto Demo', demandaNome: 'Exportação em PDF', versao: 5, descricaoTecnica: 'Texto técnico.', descricaoCliente: 'Texto do cliente.', documentacao: null };

function mensagem(usuarioId: number, autor: AutorChatEnum, texto: string): ChatMensagemNova {
  return { conversaId: 'plano-7', usuarioId, contexto: ContextoChatEnum.PLANEJAMENTO, autor, texto };
}

function criarServico(opcoes: { historico?: ChatMensagemNova[]; semAcesso?: boolean; plano?: Record<string, unknown>; pontos?: Array<Record<string, unknown>>; fontes?: Array<Record<string, unknown>> } = {}) {
  const lidas: ChatMensagemLida[] = (opcoes.historico ?? []).map((nova, indice) => deFonte(paraFonte(nova, `m${indice}`, new Date(1_000 * indice))));
  const consultas: unknown[] = [];
  const armazenamento = {
    listarConversa: async (consulta: unknown) => {
      consultas.push(consulta);
      return lidas;
    },
  };
  const enviadas: Array<{ usuario: unknown; dto: unknown; opcoes: OpcoesDeConversa }> = [];
  const chatService = {
    enviarMensagem: async (usuario: unknown, dto: unknown, _emitir: unknown, opcoesDeConversa: OpcoesDeConversa) => {
      enviadas.push({ usuario, dto, opcoes: opcoesDeConversa });
    },
  };
  const planoService = {
    recuperar: async () => {
      if (opcoes.semAcesso) throw new ResourceNotFoundException('Plano');
      return { dados: { ...PLANO, ...opcoes.plano } };
    },
  };
  const promptService = { obterAtivo: async (tipo: TipoPromptEnum) => ({ conteudo: `PROMPT ${tipo}` }) };
  const usuarioRepositorio = {
    listarNomesPorIds: async (dto: { usuarioIds: number[] }) => dto.usuarioIds.map((id) => ({ id, nomeCompleto: id === 1 ? 'Dani Dev' : 'Gabi Gestora' })),
  };
  const servico = new ChatPlanoService(
    armazenamento as unknown as ArmazenamentoDeChat,
    chatService as never,
    planoService as unknown as PlanoService,
    promptService as unknown as PromptService,
    usuarioRepositorio as unknown as UsuarioRepository,
    { listar: async () => ({ dados: opcoes.pontos ?? [] }) } as unknown as PlanoPontoService,
    { listarComConteudo: async () => ({ dados: opcoes.fontes ?? [] }) } as unknown as PlanoFonteService,
  );
  return { servico, consultas, enviadas };
}

test('a conversa do plano é lida pelo id do plano, sem filtro de dono, com o nome de cada autor', async () => {
  const { servico, consultas } = criarServico({ historico: [mensagem(1, AutorChatEnum.USUARIO, 'Oi'), mensagem(1, AutorChatEnum.IA, 'Olá'), mensagem(2, AutorChatEnum.USUARIO, 'E aí')] });

  const resposta = await servico.recuperarConversa({ id: 7 }, DESENVOLVEDOR);

  assert.deepEqual(consultas, [{ conversaId: 'plano-7' }]);
  assert.equal(resposta.dados?.conversaId, 'plano-7');
  assert.equal(resposta.dados?.planoId, 7);
  assert.deepEqual(resposta.dados?.mensagens.map((item) => item.texto), ['Oi', 'Olá', 'E aí']);
  assert.deepEqual(resposta.dados?.autores, { 1: 'Dani Dev', 2: 'Gabi Gestora' });
  assert.equal('conteudoBruto' in (resposta.dados?.mensagens[0] ?? {}), false, 'o conteúdo bruto do provedor não sai pela API');
});

test('quem não vê o plano não lê nem escreve na conversa dele (404, nada é lido nem enviado)', async () => {
  const { servico, consultas, enviadas } = criarServico({ semAcesso: true });
  await assert.rejects(() => servico.recuperarConversa({ id: 7 }, DESENVOLVEDOR), ResourceNotFoundException);
  await assert.rejects(() => servico.enviarMensagem({ id: 7 }, { texto: 'Oi' }, DESENVOLVEDOR, () => undefined), ResourceNotFoundException);
  assert.deepEqual(consultas, []);
  assert.deepEqual(enviadas, []);
});

test('o envio usa o contexto, a conversa, o nível analítico, o teto e o escopo de ferramentas do planejamento', async () => {
  const { servico, enviadas } = criarServico();
  await servico.enviarMensagem({ id: 7 }, { texto: 'Escreva a descrição' }, DESENVOLVEDOR, () => undefined);

  const { usuario, dto, opcoes } = enviadas[0];
  assert.equal(usuario, DESENVOLVEDOR);
  assert.deepEqual(dto, { texto: 'Escreva a descrição' });
  assert.equal(opcoes.contexto, ContextoChatEnum.PLANEJAMENTO);
  assert.equal(opcoes.conversaId, 'plano-7');
  assert.equal(opcoes.nivel, NivelIaEnum.ANALITICO);
  assert.equal(opcoes.maximoTokens, MAXIMO_TOKENS_DO_PLANEJAMENTO);
  assert.equal(opcoes.escopoDeFerramentas, 'PLANEJAMENTO');
});

test('as instruções do desenvolvedor trazem o prompt do planejamento, como escrever as duas abas que ele altera, o plano com a descrição do cliente só para leitura e a versão', async () => {
  const { servico, enviadas } = criarServico();
  await servico.enviarMensagem({ id: 7 }, { texto: 'Oi' }, DESENVOLVEDOR, () => undefined);

  const instrucoes = await enviadas[0].opcoes.montarInstrucoes!();

  assert.ok(instrucoes.includes(`PROMPT ${TipoPromptEnum.PLANEJAMENTO}`));
  assert.ok(instrucoes.includes(`PROMPT ${TipoPromptEnum.PLANO_DESCRICAO_TECNICA}`));
  assert.ok(instrucoes.includes(`PROMPT ${TipoPromptEnum.PLANO_DOCUMENTACAO}`));
  assert.equal(instrucoes.includes(`PROMPT ${TipoPromptEnum.PLANO_DESCRICAO_CLIENTE}`), false, 'o prompt de como escrever a aba do cliente não vai numa conversa de desenvolvedor');
  assert.ok(instrucoes.includes('Texto do cliente.'), 'o texto do cliente ele lê (task 254)');
  assert.ok(instrucoes.includes('Abas que esta pessoa pode alterar: DESCRICAO_TECNICA, DOCUMENTACAO.'));
  assert.ok(instrucoes.includes('Texto técnico.'));
  assert.ok(instrucoes.includes('Relatório mensal'));
  assert.ok(instrucoes.includes('Projeto: Projeto Demo.'));
  assert.ok(instrucoes.includes('Demanda ligada: Exportação em PDF.'));
  assert.ok(instrucoes.includes('Versão do documento agora: 5.'));
  assert.ok(instrucoes.includes('### Documentação (aba DOCUMENTACAO)\n(vazia)'));
});

test('as instruções do gestor trazem também o prompt e o texto da aba do cliente', async () => {
  const { servico, enviadas } = criarServico();
  await servico.enviarMensagem({ id: 7 }, { texto: 'Oi' }, GESTOR, () => undefined);

  const instrucoes = await enviadas[0].opcoes.montarInstrucoes!();

  assert.ok(instrucoes.includes(`PROMPT ${TipoPromptEnum.PLANO_DESCRICAO_CLIENTE}`));
  assert.ok(instrucoes.includes('Texto do cliente.'));
});

test('um plano pessoal e sem demanda aparece assim, e uma aba enorme é cortada com o aviso de usar consultar_plano', async () => {
  const grande = 'a'.repeat(LIMITE_CARACTERES_DA_ABA_NO_CONTEXTO + 500);
  const { servico, enviadas } = criarServico({ plano: { projetoNome: null, demandaNome: null, descricaoTecnica: grande } });
  await servico.enviarMensagem({ id: 7 }, { texto: 'Oi' }, DESENVOLVEDOR, () => undefined);

  const instrucoes = await enviadas[0].opcoes.montarInstrucoes!();

  assert.ok(instrucoes.includes('Plano pessoal, sem projeto.'));
  assert.ok(instrucoes.includes('Nenhuma demanda ligada.'));
  assert.ok(instrucoes.includes('[texto cortado: leia o resto com consultar_plano]'));
  assert.equal(instrucoes.includes('a'.repeat(LIMITE_CARACTERES_DA_ABA_NO_CONTEXTO + 1)), false);
});

test('com duas pessoas na conversa o modelo lê o nome de quem falou; com uma só, o texto puro', async () => {
  const duas = criarServico({ historico: [mensagem(1, AutorChatEnum.USUARIO, 'Oi'), mensagem(2, AutorChatEnum.USUARIO, 'Oi também')] });
  await duas.servico.enviarMensagem({ id: 7 }, { texto: 'x' }, DESENVOLVEDOR, () => undefined);
  const lida = (usuarioId: number, texto: string) => deFonte(paraFonte(mensagem(usuarioId, AutorChatEnum.USUARIO, texto), 'm', new Date()));
  assert.equal(duas.enviadas[0].opcoes.rotularMensagemDoUsuario!(lida(2, 'Oi também')), '[Gabi Gestora] Oi também');
  assert.equal(duas.enviadas[0].opcoes.rotularMensagemDoUsuario!(lida(1, 'Oi')), '[Dani Dev] Oi');

  const uma = criarServico({ historico: [mensagem(1, AutorChatEnum.USUARIO, 'Oi')] });
  await uma.servico.enviarMensagem({ id: 7 }, { texto: 'x' }, DESENVOLVEDOR, () => undefined);
  assert.equal(uma.enviadas[0].opcoes.rotularMensagemDoUsuario!(lida(1, 'Oi')), 'Oi');
});

test('as instruções trazem a orientação dos pontos e os pontos abertos com o id, contando os já fechados (task 235)', async () => {
  const ponto = (id: number, situacao: string, rotulo = 'Lacuna', texto = 'Falta definir quem exporta') => ({ id, situacao, rotulo, texto });
  const { servico, enviadas } = criarServico({ pontos: [ponto(4, 'ABERTO'), ponto(5, 'RESOLVIDO', 'Pergunta', 'Qual o formato?'), ponto(6, 'DECISAO', 'Decisão', 'PDF')] });
  await servico.enviarMensagem({ id: 7 }, { texto: 'Oi' }, DESENVOLVEDOR, () => undefined);

  const instrucoes = await enviadas[0].opcoes.montarInstrucoes!();

  assert.ok(instrucoes.includes(ORIENTACAO_DOS_PONTOS));
  assert.ok(instrucoes.includes('Pontos em aberto agora (1; 2 já fechados):'));
  assert.ok(instrucoes.includes('- [id 4] Lacuna: Falta definir quem exporta'));
  assert.equal(instrucoes.includes('Qual o formato?'), false, 'os fechados não entram na lista');
});

test('sem pontos, as instruções dizem que não há nenhum (task 235)', async () => {
  const { servico, enviadas } = criarServico();
  await servico.enviarMensagem({ id: 7 }, { texto: 'Oi' }, DESENVOLVEDOR, () => undefined);
  assert.ok((await enviadas[0].opcoes.montarInstrucoes!()).includes('Pontos em aberto agora (0):\n(nenhum)'));
});

test('as fontes do plano entram nas instruções com o título, quem trouxe e o aviso de que são dado; sem fontes, diz que não há', async () => {
  const semFontes = criarServico();
  await semFontes.servico.enviarMensagem({ id: 7 }, { texto: 'Oi' }, DESENVOLVEDOR, () => undefined);
  assert.ok((await semFontes.enviadas[0].opcoes.montarInstrucoes!()).includes('Fontes do plano (material de fora): (nenhuma)'));

  const { servico, enviadas } = criarServico({
    fontes: [{ id: 3, titulo: 'E-mail do cliente', usuarioNome: 'Gabi Gestora', conteudo: 'Precisamos exportar em PDF.' }],
  });
  await servico.enviarMensagem({ id: 7 }, { texto: 'Oi' }, DESENVOLVEDOR, () => undefined);
  const instrucoes = await enviadas[0].opcoes.montarInstrucoes!();

  assert.ok(instrucoes.includes(ORIENTACAO_DAS_FONTES));
  assert.ok(instrucoes.includes('### [fonte 3] E-mail do cliente (trazida por Gabi Gestora)\nPrecisamos exportar em PDF.'));
});
