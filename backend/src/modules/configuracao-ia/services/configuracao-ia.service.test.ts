import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfiguracaoIaCriarDto, ConfiguracaoIaResumoDto, EsforcoIaEnum, ModoContextoChatEnum, TipoProvedorIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ConfiguracaoIaRepository } from '../repositories/configuracao-ia.repository';
import { ConfiguracaoIaService } from './configuracao-ia.service';

const ADMINISTRADOR = { sub: 1, tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR = { sub: 2, tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 3, tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

const ANTHROPIC = { modeloRapido: 'claude-haiku-5-5', modeloPadrao: 'claude-sonnet-5-5', modeloAnalitico: 'claude-opus-5-5' };

const BASE: ConfiguracaoIaCriarDto = {
  provedor: TipoProvedorIaEnum.ANTHROPIC,
  fallbacks: [],
  modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: ANTHROPIC },
  esforcoAnalitico: EsforcoIaEnum.MEDIO,
  checkinMinimoMinutos: 30,
  checkinMaximoMinutos: 80,
  duracaoRecomendadaMinutos: 90,
  checkinInteligente: true,
  rigorProporcional: true,
  deteccaoAutomatica: true,
  duvidasCodigo: false,
  modoContextoChat: ModoContextoChatEnum.MISTURADO,
  iaDesligada: true,
};

function resumoDe(versao: number, dto: ConfiguracaoIaCriarDto): ConfiguracaoIaResumoDto {
  return { id: versao, versao, usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date(), ...dto };
}

/** Repositório em memória: guarda as versões e conta as leituras da ativa. */
function criarRepositorio() {
  const versoes: ConfiguracaoIaResumoDto[] = [resumoDe(1, BASE)];
  const estado = { leiturasDaAtiva: 0 };
  const repositorio = {
    async recuperarAtiva() {
      estado.leiturasDaAtiva++;
      return versoes[versoes.length - 1];
    },
    async listar() {
      return { itens: [...versoes].reverse(), total: versoes.length };
    },
    async inserirNovaVersao(dto: ConfiguracaoIaCriarDto) {
      const nova = resumoDe(versoes[versoes.length - 1].versao + 1, dto);
      versoes.push(nova);
      return nova;
    },
  } as unknown as ConfiguracaoIaRepository;
  return { repositorio, versoes, estado };
}

test('criar grava a versão seguinte sem alterar a anterior e renova o cache', async () => {
  const { repositorio, versoes, estado } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);

  assert.equal((await servico.obterAtiva()).versao, 1);
  const resposta = await servico.criar({ ...BASE, modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: { ...ANTHROPIC, modeloPadrao: 'claude-sonnet-5-5-novo' } }, iaDesligada: false }, ADMINISTRADOR);

  assert.equal(resposta.dados.versao, 2);
  assert.equal(versoes[0].modelosProvedor.ANTHROPIC?.modeloPadrao, 'claude-sonnet-5-5', 'a versão 1 não muda');
  assert.equal((await servico.obterAtiva()).modelosProvedor.ANTHROPIC?.modeloPadrao, 'claude-sonnet-5-5-novo');
  assert.equal(estado.leiturasDaAtiva, 1, 'a leitura seguinte vem do cache, sem ir ao banco');
});

test('criar leva as duas flags das dúvidas de código para a versão nova e a anterior continua intacta', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);

  const resposta = await servico.criar({ ...BASE, duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO }, ADMINISTRADOR);

  assert.equal(resposta.dados.duvidasCodigo, true);
  assert.equal(resposta.dados.modoContextoChat, ModoContextoChatEnum.SEPARADO);
  assert.equal(versoes[0].duvidasCodigo, false, 'a versão 1 não muda');
  assert.equal(versoes[0].modoContextoChat, ModoContextoChatEnum.MISTURADO);
  const ativa = await servico.obterAtiva();
  assert.equal(ativa.duvidasCodigo, true);
  assert.equal(ativa.modoContextoChat, ModoContextoChatEnum.SEPARADO);
});

test('obterAtiva lê o banco uma vez e depois usa o cache', async () => {
  const { repositorio, estado } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  await servico.obterAtiva();
  await servico.obterAtiva();
  await servico.obterAtiva();
  assert.equal(estado.leiturasDaAtiva, 1);
});

test('intervalo de check-in invertido ou igual é recusado e nada é gravado', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  await assert.rejects(() => servico.criar({ ...BASE, checkinMinimoMinutos: 80, checkinMaximoMinutos: 30 }, ADMINISTRADOR), BusinessException);
  await assert.rejects(() => servico.criar({ ...BASE, checkinMinimoMinutos: 50, checkinMaximoMinutos: 50 }, ADMINISTRADOR), BusinessException);
  assert.equal(versoes.length, 1);
});

const mensagemDe = (erro: BusinessException): string => (erro.getResponse() as { mensagem: string }).mensagem;

const GEMINI = { modeloRapido: 'gemini-flash', modeloPadrao: 'gemini-pro', modeloAnalitico: 'gemini-pro' };
const OPENAI = { modeloRapido: 'gpt-mini', modeloPadrao: 'gpt-5', modeloAnalitico: 'o3' };
const TODOS = { [TipoProvedorIaEnum.ANTHROPIC]: ANTHROPIC, [TipoProvedorIaEnum.GOOGLE]: GEMINI, [TipoProvedorIaEnum.OPENAI]: OPENAI };

test('criar grava a cadeia de fallback na ordem dada, com o mapa de modelos', async () => {
  const { repositorio } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  const resposta = await servico.criar({ ...BASE, fallbacks: [TipoProvedorIaEnum.GOOGLE, TipoProvedorIaEnum.OPENAI], modelosProvedor: TODOS }, ADMINISTRADOR);
  assert.deepEqual(resposta.dados.fallbacks, [TipoProvedorIaEnum.GOOGLE, TipoProvedorIaEnum.OPENAI]);
  assert.deepEqual(resposta.dados.modelosProvedor, TODOS);
});

test('trocar o padrão para o Gemini e voltar: o trio da Anthropic continua no mapa e volta preenchido', async () => {
  const { repositorio } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  const noGemini = await servico.criar({ ...BASE, provedor: TipoProvedorIaEnum.GOOGLE, modelosProvedor: { ...BASE.modelosProvedor, [TipoProvedorIaEnum.GOOGLE]: GEMINI } }, ADMINISTRADOR);
  const deVolta = await servico.criar({ ...BASE, modelosProvedor: noGemini.dados.modelosProvedor }, ADMINISTRADOR);
  assert.equal(deVolta.dados.provedor, TipoProvedorIaEnum.ANTHROPIC);
  assert.deepEqual(deVolta.dados.modelosProvedor.ANTHROPIC, ANTHROPIC);
});

test('provedor padrão com modelo de outro provedor, ou sem modelos, é recusado e nada é gravado', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  await assert.rejects(
    () => servico.criar({ ...BASE, provedor: TipoProvedorIaEnum.OPENAI, modelosProvedor: { [TipoProvedorIaEnum.OPENAI]: ANTHROPIC } }, ADMINISTRADOR),
    (erro: unknown) => erro instanceof BusinessException && /não é de OpenAI/.test(mensagemDe(erro)),
  );
  await assert.rejects(
    () => servico.criar({ ...BASE, provedor: TipoProvedorIaEnum.GOOGLE }, ADMINISTRADOR),
    (erro: unknown) => erro instanceof BusinessException && /Google está na cadeia, mas não tem os modelos/.test(mensagemDe(erro)),
  );
  assert.equal(versoes.length, 1);
});

test('fallback com modelo de outro provedor e provedor repetido na cadeia são recusados', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  await assert.rejects(
    () => servico.criar({ ...BASE, fallbacks: [TipoProvedorIaEnum.GOOGLE], modelosProvedor: { ...TODOS, [TipoProvedorIaEnum.GOOGLE]: { ...GEMINI, modeloPadrao: 'gpt-5' } } }, ADMINISTRADOR),
    BusinessException,
  );
  await assert.rejects(() => servico.criar({ ...BASE, fallbacks: [TipoProvedorIaEnum.GOOGLE, TipoProvedorIaEnum.GOOGLE], modelosProvedor: TODOS }, ADMINISTRADOR), BusinessException);
  await assert.rejects(
    () => servico.criar({ ...BASE, fallbacks: [TipoProvedorIaEnum.ANTHROPIC] }, ADMINISTRADOR),
    (erro: unknown) => erro instanceof BusinessException && /mais de uma vez/.test(mensagemDe(erro)),
  );
  assert.equal(versoes.length, 1);
});

test('os nomes de modelo são gravados sem espaço nas pontas', async () => {
  const { repositorio } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  const resposta = await servico.criar(
    { ...BASE, modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: { modeloRapido: ' claude-haiku-5-5 ', modeloPadrao: 'claude-sonnet-5-5\n', modeloAnalitico: ' Claude-Opus-5-5' } } },
    ADMINISTRADOR,
  );
  assert.deepEqual(resposta.dados.modelosProvedor.ANTHROPIC, { modeloRapido: 'claude-haiku-5-5', modeloPadrao: 'claude-sonnet-5-5', modeloAnalitico: 'Claude-Opus-5-5' });
});

test('só administrador lê, lista e grava; gestor e desenvolvedor são recusados', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  for (const usuario of [GESTOR, DESENVOLVEDOR]) {
    await assert.rejects(() => servico.recuperarAtiva(usuario), UnauthorizedAccessException);
    await assert.rejects(() => servico.listar({}, usuario), UnauthorizedAccessException);
    await assert.rejects(() => servico.criar(BASE, usuario), UnauthorizedAccessException);
  }
  assert.equal(versoes.length, 1);
  assert.equal((await servico.recuperarAtiva(ADMINISTRADOR)).dados.versao, 1);
});

test('listar devolve o histórico paginado, mais nova primeiro', async () => {
  const { repositorio } = criarRepositorio();
  const servico = new ConfiguracaoIaService(repositorio);
  await servico.criar(BASE, ADMINISTRADOR);
  const resposta = await servico.listar({ itensPorPagina: 1 }, ADMINISTRADOR);
  assert.equal(resposta.dados.itens[0].versao, 2);
  assert.equal(resposta.dados.totalItens, 2);
  assert.equal(resposta.dados.totalPaginas, 2);
});
