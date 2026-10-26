import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PlanoPublicacaoService } from './plano-publicacao.service';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { PlanoAbaEnum, TipoUsuarioEnum } from '@project20/shared';

// Publicar o plano na demanda e "nasceu do plano" (task 237): permissões, aba do cliente, texto vazio, versão, pendência de trecho e data.

const DEV = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 3, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

function planoBase(sobrescrita: Record<string, unknown> = {}) {
  return {
    id: 7, titulo: 'Plano', projetoId: 10, projetoNome: 'Projeto', demandaId: 20, demandaNome: 'Demanda', publicacaoData: null,
    criadorId: 1, criadorNome: 'Criador', isSolo: false, isArquivado: false,
    descricaoTecnica: 'Técnica nova', descricaoCliente: 'Cliente nova', documentacao: 'Doc nova',
    versao: 3, createdDate: 'a', updatedDate: 'b', ...sobrescrita,
  };
}

interface Cenario {
  plano?: Record<string, unknown>;
  demanda?: Record<string, unknown> | null;
  pendentes?: number;
  /** Quem não pode editar a demanda: a `DemandaService.alterar` recusa. */
  demandaRecusa?: boolean;
  planosDaDemanda?: Array<Record<string, unknown>>;
  /** Ids dos planos que a pessoa pode acessar (`PlanoService.podeAcessar`). */
  acessiveis?: number[];
}

function criarServico(cenario: Cenario = {}) {
  const chamadas: Array<{ metodo: string; argumento: unknown }> = [];
  const servico = Object.create(PlanoPublicacaoService.prototype) as Record<string, unknown>;
  servico.planoService = {
    recuperar:   async () => ({ dados: planoBase(cenario.plano) }),
    podeAcessar: async (plano: { id: number }) => (cenario.acessiveis ?? [7]).includes(plano.id),
  };
  servico.planoRepositorio = {
    marcarPublicacao: async (argumento: unknown) => {
      chamadas.push({ metodo: 'marcarPublicacao', argumento });
      return '2026-10-26T12:00:00.000Z';
    },
    listarPorDemanda: async () => cenario.planosDaDemanda ?? [planoBase()],
  };
  servico.demandaService = {
    alterar: async (argumento: unknown) => {
      chamadas.push({ metodo: 'alterar', argumento });
      if (cenario.demandaRecusa) throw new UnauthorizedAccessException('Você só pode editar demandas das quais é membro');
      return { dados: {} };
    },
  };
  servico.demandaRepositorio = {
    recuperar: async () => ('demanda' in cenario ? cenario.demanda : { id: 20, descricaoTecnica: null, descricaoCliente: null, documentacao: null }),
  };
  servico.propostaIaRepositorio = { contarPendentesDoPlano: async () => cenario.pendentes ?? 0 };
  return { servico: servico as unknown as PlanoPublicacaoService, chamadas };
}

const gravacao = (chamadas: Array<{ metodo: string; argumento: unknown }>) => chamadas.find((chamada) => chamada.metodo === 'alterar')?.argumento;

test('publicar: grava os textos escolhidos pela DemandaService e marca a data', async () => {
  const { servico, chamadas } = criarServico();
  const resposta = await servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DESCRICAO_TECNICA, PlanoAbaEnum.DOCUMENTACAO] }, DEV);
  assert.deepEqual(gravacao(chamadas), { id: 20, descricaoTecnica: 'Técnica nova', documentacao: 'Doc nova' });
  assert.deepEqual(chamadas.map((chamada) => chamada.metodo), ['alterar', 'marcarPublicacao']);
  assert.deepEqual(resposta.dados.abasPublicadas, [PlanoAbaEnum.DESCRICAO_TECNICA, PlanoAbaEnum.DOCUMENTACAO]);
  assert.equal(resposta.dados.publicacaoData, '2026-10-26T12:00:00.000Z');
});

test('publicar: desenvolvedor não publica a descrição do cliente; gestor publica', async () => {
  const dev = criarServico();
  await assert.rejects(() => dev.servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DESCRICAO_CLIENTE] }, DEV), UnauthorizedAccessException);
  assert.equal(gravacao(dev.chamadas), undefined);

  const gestor = criarServico();
  await gestor.servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DESCRICAO_CLIENTE] }, GESTOR);
  assert.deepEqual(gravacao(gestor.chamadas), { id: 20, descricaoCliente: 'Cliente nova' });
});

test('publicar: quem não edita a demanda é recusado pela DemandaService e a data não é marcada', async () => {
  const { servico, chamadas } = criarServico({ demandaRecusa: true });
  await assert.rejects(() => servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DOCUMENTACAO] }, DEV), UnauthorizedAccessException);
  assert.equal(chamadas.some((chamada) => chamada.metodo === 'marcarPublicacao'), false);
});

test('publicar: texto vazio no plano não apaga o da demanda sem escolha explícita', async () => {
  const cenario = { plano: { documentacao: '' }, demanda: { id: 20, descricaoTecnica: null, descricaoCliente: null, documentacao: 'Texto da demanda' } };
  const recusado = criarServico(cenario);
  await assert.rejects(() => recusado.servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DOCUMENTACAO] }, DEV), BusinessException);
  assert.equal(gravacao(recusado.chamadas), undefined);

  const escolhido = criarServico(cenario);
  await escolhido.servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DOCUMENTACAO], abasParaApagar: [PlanoAbaEnum.DOCUMENTACAO] }, DEV);
  assert.deepEqual(gravacao(escolhido.chamadas), { id: 20, documentacao: null });
});

test('publicar: aba igual à da demanda não é gravada; se todas são iguais, recusa', async () => {
  const demanda = { id: 20, descricaoTecnica: 'Técnica nova', descricaoCliente: null, documentacao: null };
  const { servico, chamadas } = criarServico({ demanda });
  const resposta = await servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DESCRICAO_TECNICA, PlanoAbaEnum.DOCUMENTACAO] }, DEV);
  assert.deepEqual(gravacao(chamadas), { id: 20, documentacao: 'Doc nova' });
  assert.deepEqual(resposta.dados.abasPublicadas, [PlanoAbaEnum.DOCUMENTACAO]);

  await assert.rejects(() => servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DESCRICAO_TECNICA] }, DEV), BusinessException);
});

test('publicar: versão diferente da que a pessoa viu é recusada com 409; plano sem demanda também', async () => {
  const { servico, chamadas } = criarServico();
  await assert.rejects(() => servico.publicar({ id: 7, versao: 2, abas: [PlanoAbaEnum.DOCUMENTACAO] }, DEV), ConflictException);
  assert.equal(gravacao(chamadas), undefined);

  const semDemanda = criarServico({ plano: { demandaId: null } });
  await assert.rejects(() => semDemanda.servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DOCUMENTACAO] }, DEV), BusinessException);
});

test('publicar: demanda que sumiu é "não encontrada"', async () => {
  const { servico } = criarServico({ demanda: null });
  await assert.rejects(() => servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DOCUMENTACAO] }, DEV), ResourceNotFoundException);
});

test('publicar: devolve quantas alterações de trecho da IA ficaram pendentes (de fora da publicação)', async () => {
  const { servico } = criarServico({ pendentes: 2 });
  const resposta = await servico.publicar({ id: 7, versao: 3, abas: [PlanoAbaEnum.DOCUMENTACAO] }, DEV);
  assert.equal(resposta.dados.trechosPendentes, 2);
});

test('recuperarOrigem: devolve o primeiro plano que a pessoa pode ver; sem nenhum, null', async () => {
  const planos = [planoBase({ id: 8, titulo: 'Solo de outra pessoa' }), planoBase({ id: 7, titulo: 'Plano do projeto', publicacaoData: '2026-10-25T10:00:00.000Z' })];
  const { servico } = criarServico({ planosDaDemanda: planos, acessiveis: [7] });
  const origem = (await servico.recuperarOrigem({ demandaId: 20 }, DEV)).dados;
  assert.deepEqual(origem, { id: 7, titulo: 'Plano do projeto', projetoNome: 'Projeto', publicacaoData: '2026-10-25T10:00:00.000Z' });

  const nenhum = criarServico({ planosDaDemanda: planos, acessiveis: [] });
  assert.equal((await nenhum.servico.recuperarOrigem({ demandaId: 20 }, DEV)).dados, null);
});
