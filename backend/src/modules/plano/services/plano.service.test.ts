import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PlanoService } from './plano.service';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { PlanoAbaEnum, TipoUsuarioEnum } from '@project20/shared';

// Regras do plano (task 232): acesso (projeto, solo, amplo), aba do cliente, versão, ligar demanda, arquivar e excluir.

const CRIADOR_DEV = { sub: 1, login: 'criador', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const COLEGA_DEV = { sub: 2, login: 'colega', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR_CRIADOR = { sub: 1, login: 'criador', tipo: TipoUsuarioEnum.GESTOR } as never;
const GESTOR = { sub: 3, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 4, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;

function planoBase(sobrescrita: Record<string, unknown> = {}) {
  return {
    id: 7, titulo: 'Plano', projetoId: 10, projetoNome: 'Projeto', demandaId: null, demandaNome: null, publicacaoData: null,
    criadorId: 1, criadorNome: 'Criador', isSolo: false, isArquivado: false,
    descricaoTecnica: null, descricaoCliente: 'Texto do cliente', documentacao: null,
    versao: 3, createdDate: 'a', updatedDate: 'b', ...sobrescrita,
  };
}

interface Cenario {
  plano?: unknown;
  /** Usuários (ids) com acesso ao projeto como desenvolvedor. */
  comAcessoAoProjeto?: number[];
  /** Usuários (ids) membros da demanda. */
  membros?: number[];
  demanda?: unknown;
  projeto?: unknown;
  alterarDevolve?: unknown;
}

function demandaBase(sobrescrita: Record<string, unknown> = {}) {
  return { id: 20, projetoId: 10, descricaoTecnica: null, descricaoCliente: null, documentacao: null, ...sobrescrita };
}

function criarServico(cenario: Cenario = {}) {
  const chamadas: Array<{ metodo: string; argumento: unknown }> = [];
  const registrar = (metodo: string, retorno?: unknown) => async (argumento: unknown) => {
    chamadas.push({ metodo, argumento });
    return retorno;
  };
  const servico = Object.create(PlanoService.prototype) as Record<string, unknown>;
  servico.planoRepositorio = {
    inserir:         registrar('inserir', { id: 7 }),
    recuperar:       async () => ('plano' in cenario ? cenario.plano : planoBase()),
    listar:          registrar('listar', [{ id: 7 }]),
    alterar:         async (argumento: unknown) => {
      chamadas.push({ metodo: 'alterar', argumento });
      return 'alterarDevolve' in cenario ? cenario.alterarDevolve : { id: 7, titulo: 'Plano', versao: 4, updatedDate: 'c' };
    },
    marcarSolo:      registrar('marcarSolo', { id: 7, isSolo: true }),
    arquivar:        registrar('arquivar', { id: 7, isArquivado: true }),
    atribuirProjeto: registrar('atribuirProjeto', true),
    ligarDemanda:    registrar('ligarDemanda'),
    excluir:         registrar('excluir'),
  };
  servico.demandaRepositorio = {
    recuperar:            async () => ('demanda' in cenario ? cenario.demanda : demandaBase()),
    validarMembro:        async (dto: { usuarioId: number }) => (cenario.membros ?? []).includes(dto.usuarioId),
    validarAcessoProjeto: async (dto: { usuarioId: number }) => (cenario.comAcessoAoProjeto ?? []).includes(dto.usuarioId),
  };
  servico.projetoRepositorio = {
    recuperar: async () => ('projeto' in cenario ? cenario.projeto : { id: 10 }),
  };
  return { servico: servico as unknown as PlanoService, chamadas };
}

const metodos = (chamadas: Array<{ metodo: string }>) => chamadas.map((chamada) => chamada.metodo);

// ---------------------------------------------------------------------------
// Acesso
// ---------------------------------------------------------------------------

test('recuperar: plano de projeto — desenvolvedor sem acesso ao projeto recebe "não encontrado"; com acesso, gestor e administrador recebem', async () => {
  const sem = criarServico();
  await assert.rejects(() => sem.servico.recuperar({ id: 7 }, COLEGA_DEV), ResourceNotFoundException);

  const com = criarServico({ comAcessoAoProjeto: [2] });
  assert.equal((await com.servico.recuperar({ id: 7 }, COLEGA_DEV)).dados.id, 7);
  assert.equal((await sem.servico.recuperar({ id: 7 }, GESTOR)).dados.id, 7);
  assert.equal((await sem.servico.recuperar({ id: 7 }, ADMINISTRADOR)).dados.id, 7);
});

test('recuperar: plano solo é só do criador — nem gestor, nem administrador, nem colega com acesso', async () => {
  const { servico } = criarServico({ plano: planoBase({ isSolo: true }), comAcessoAoProjeto: [1, 2] });
  for (const outro of [COLEGA_DEV, GESTOR, ADMINISTRADOR]) {
    await assert.rejects(() => servico.recuperar({ id: 7 }, outro), ResourceNotFoundException);
  }
  assert.equal((await servico.recuperar({ id: 7 }, CRIADOR_DEV)).dados.id, 7);
});

test('recuperar: plano amplo é só do criador', async () => {
  const { servico } = criarServico({ plano: planoBase({ projetoId: null }) });
  await assert.rejects(() => servico.recuperar({ id: 7 }, ADMINISTRADOR), ResourceNotFoundException);
  assert.equal((await servico.recuperar({ id: 7 }, CRIADOR_DEV)).dados.id, 7);
});

test('recuperar: plano inexistente é "não encontrado"', async () => {
  const { servico } = criarServico({ plano: null });
  await assert.rejects(() => servico.recuperar({ id: 7 }, GESTOR), ResourceNotFoundException);
});

test('recuperar: a descrição do cliente não vai para o desenvolvedor, mas vai para gestor e administrador', async () => {
  const { servico } = criarServico({ comAcessoAoProjeto: [1] });
  const paraDev = (await servico.recuperar({ id: 7 }, CRIADOR_DEV)).dados;
  assert.equal('descricaoCliente' in paraDev, false);
  assert.equal(paraDev.versao, 3);
  assert.equal((await servico.recuperar({ id: 7 }, GESTOR)).dados.descricaoCliente, 'Texto do cliente');
  assert.equal((await servico.recuperar({ id: 7 }, ADMINISTRADOR)).dados.descricaoCliente, 'Texto do cliente');
});

test('listar: repassa a pessoa, o tipo e os filtros ao repository', async () => {
  const { servico, chamadas } = criarServico();
  await servico.listar({ busca: 'rel', incluirArquivados: true, projetoId: 10 }, GESTOR);
  await servico.listar({}, COLEGA_DEV);
  assert.deepEqual(chamadas[0].argumento, { usuarioId: 3, ehGestor: true, busca: 'rel', incluirArquivados: true, projetoId: 10 });
  assert.equal((chamadas[1].argumento as { ehGestor: boolean }).ehGestor, false);
});

// ---------------------------------------------------------------------------
// Alterar (versão e aba do cliente)
// ---------------------------------------------------------------------------

test('alterar: grava com a versão lida e devolve a versão nova', async () => {
  const { servico, chamadas } = criarServico({ comAcessoAoProjeto: [2] });
  const resposta = await servico.alterar({ id: 7, versao: 3, documentacao: 'Novo' }, COLEGA_DEV);
  assert.equal(resposta.dados.versao, 4);
  assert.deepEqual(chamadas.find((chamada) => chamada.metodo === 'alterar')?.argumento, { id: 7, versao: 3, documentacao: 'Novo' });
});

test('alterar: gravação sobre versão mais nova é recusada com ConflictException (409)', async () => {
  const { servico } = criarServico({ comAcessoAoProjeto: [2], alterarDevolve: null });
  await assert.rejects(() => servico.alterar({ id: 7, versao: 2, documentacao: 'Velho' }, COLEGA_DEV), ConflictException);
});

test('alterar: desenvolvedor não grava a descrição do cliente; gestor grava', async () => {
  const dev = criarServico({ comAcessoAoProjeto: [2] });
  await assert.rejects(() => dev.servico.alterar({ id: 7, versao: 3, descricaoCliente: 'x' }, COLEGA_DEV), UnauthorizedAccessException);
  assert.deepEqual(metodos(dev.chamadas), []);

  const gestor = criarServico();
  await gestor.servico.alterar({ id: 7, versao: 3, descricaoCliente: 'x' }, GESTOR);
  assert.deepEqual(metodos(gestor.chamadas), ['alterar']);
});

test('alterar: sem nenhum campo é recusado; quem não acessa o plano não grava', async () => {
  const { servico, chamadas } = criarServico({ comAcessoAoProjeto: [2] });
  await assert.rejects(() => servico.alterar({ id: 7, versao: 3 }, COLEGA_DEV), BusinessException);
  const semAcesso = criarServico();
  await assert.rejects(() => semAcesso.servico.alterar({ id: 7, versao: 3, titulo: 'x' }, COLEGA_DEV), ResourceNotFoundException);
  assert.deepEqual([...metodos(chamadas), ...metodos(semAcesso.chamadas)], []);
});

// ---------------------------------------------------------------------------
// Solo, arquivar, excluir
// ---------------------------------------------------------------------------

test('marcarSolo: só o criador marca e desmarca', async () => {
  const { servico, chamadas } = criarServico({ comAcessoAoProjeto: [1, 2] });
  await assert.rejects(() => servico.marcarSolo({ id: 7, isSolo: true }, COLEGA_DEV), UnauthorizedAccessException);
  await assert.rejects(() => servico.marcarSolo({ id: 7, isSolo: true }, GESTOR), UnauthorizedAccessException);
  assert.deepEqual(metodos(chamadas), []);

  const resposta = await servico.marcarSolo({ id: 7, isSolo: true }, CRIADOR_DEV);
  assert.equal(resposta.dados.isSolo, true);
  assert.deepEqual(chamadas[0].argumento, { id: 7, isSolo: true });
});

test('arquivar e excluir: criador, gestor e administrador; colega desenvolvedor não', async () => {
  const { servico, chamadas } = criarServico({ comAcessoAoProjeto: [1, 2] });
  await assert.rejects(() => servico.arquivar({ id: 7, isArquivado: true }, COLEGA_DEV), UnauthorizedAccessException);
  await assert.rejects(() => servico.excluir({ id: 7 }, COLEGA_DEV), UnauthorizedAccessException);

  for (const autorizado of [CRIADOR_DEV, GESTOR, ADMINISTRADOR]) {
    await servico.arquivar({ id: 7, isArquivado: true }, autorizado);
    await servico.excluir({ id: 7 }, autorizado);
  }
  assert.deepEqual(metodos(chamadas), ['arquivar', 'excluir', 'arquivar', 'excluir', 'arquivar', 'excluir']);
});

// ---------------------------------------------------------------------------
// Criar
// ---------------------------------------------------------------------------

test('criar: plano amplo (sem projeto nem demanda) usa o título padrão e é do criador', async () => {
  const { servico, chamadas } = criarServico();
  const resposta = await servico.criar({}, CRIADOR_DEV);
  assert.deepEqual(chamadas[0], { metodo: 'inserir', argumento: { titulo: 'Plano sem título', projetoId: null, usuarioId: 1 } });
  assert.deepEqual(resposta.dados, { id: 7, titulo: 'Plano sem título', projetoId: null, demandaId: null, isSolo: false, versao: 1 });
});

test('criar: plano de projeto exige acesso ao projeto do desenvolvedor, e o projeto precisa existir', async () => {
  const semAcesso = criarServico();
  await assert.rejects(() => semAcesso.servico.criar({ titulo: ' Meu ', projetoId: 10 }, CRIADOR_DEV), UnauthorizedAccessException);

  const semProjeto = criarServico({ projeto: null });
  await assert.rejects(() => semProjeto.servico.criar({ projetoId: 10 }, GESTOR), ResourceNotFoundException);

  const comAcesso = criarServico({ comAcessoAoProjeto: [1] });
  const resposta = await comAcesso.servico.criar({ titulo: ' Meu ', projetoId: 10 }, CRIADOR_DEV);
  assert.equal(resposta.dados.titulo, 'Meu');
  assert.equal(resposta.dados.projetoId, 10);
  assert.deepEqual(metodos(semAcesso.chamadas), []);
});

test('criar: com demanda, o plano nasce no projeto da demanda e a liga; sem ser membro, desenvolvedor é recusado', async () => {
  const naoMembro = criarServico({ comAcessoAoProjeto: [1] });
  await assert.rejects(() => naoMembro.servico.criar({ demandaId: 20 }, CRIADOR_DEV), UnauthorizedAccessException);
  assert.deepEqual(metodos(naoMembro.chamadas), []);

  const membro = criarServico({ membros: [1], comAcessoAoProjeto: [1] });
  const resposta = await membro.servico.criar({ demandaId: 20 }, CRIADOR_DEV);
  assert.equal(resposta.dados.projetoId, 10);
  assert.equal(resposta.dados.demandaId, 20);
  assert.deepEqual(metodos(membro.chamadas), ['inserir', 'ligarDemanda']);
});

test('criar: demanda de outro projeto que o informado é recusada', async () => {
  const { servico, chamadas } = criarServico({ demanda: demandaBase({ projetoId: 99 }) });
  await assert.rejects(() => servico.criar({ projetoId: 10, demandaId: 20 }, GESTOR), BusinessException);
  assert.deepEqual(metodos(chamadas), []);
});

// ---------------------------------------------------------------------------
// Ligar demanda
// ---------------------------------------------------------------------------

test('ligarDemanda: aba vazia começa com o texto da demanda; aba já escrita não é sobrescrita', async () => {
  const { servico, chamadas } = criarServico({
    plano: planoBase({ descricaoTecnica: 'Já escrito', descricaoCliente: null, documentacao: '' }),
    demanda: demandaBase({ descricaoTecnica: 'Da demanda T', descricaoCliente: 'Da demanda C', documentacao: 'Da demanda D' }),
  });
  const resposta = await servico.ligarDemanda({ id: 7, demandaId: 20 }, GESTOR);

  assert.deepEqual(resposta.dados.abasPreenchidas, [PlanoAbaEnum.DESCRICAO_CLIENTE, PlanoAbaEnum.DOCUMENTACAO]);
  assert.equal(resposta.dados.versao, 4);
  assert.deepEqual(chamadas[0], { metodo: 'alterar', argumento: { id: 7, versao: 3, descricaoCliente: 'Da demanda C', documentacao: 'Da demanda D' } });
  assert.deepEqual(chamadas[1], { metodo: 'ligarDemanda', argumento: { planoId: 7, demandaId: 20 } });
});

test('ligarDemanda: demanda sem texto não grava o documento, só liga', async () => {
  const { servico, chamadas } = criarServico();
  const resposta = await servico.ligarDemanda({ id: 7, demandaId: 20 }, GESTOR);
  assert.deepEqual(resposta.dados.abasPreenchidas, []);
  assert.deepEqual(metodos(chamadas), ['ligarDemanda']);
});

test('ligarDemanda: versão do plano mudou no meio do caminho — recusa e não liga', async () => {
  const { servico, chamadas } = criarServico({
    demanda: demandaBase({ descricaoTecnica: 'Texto' }),
    alterarDevolve: null,
  });
  await assert.rejects(() => servico.ligarDemanda({ id: 7, demandaId: 20 }, GESTOR), ConflictException);
  assert.deepEqual(metodos(chamadas), ['alterar']);
});

test('ligarDemanda: desenvolvedor só liga demanda que edita (membro); a demanda precisa ser do projeto do plano', async () => {
  const naoMembro = criarServico({ comAcessoAoProjeto: [2] });
  await assert.rejects(() => naoMembro.servico.ligarDemanda({ id: 7, demandaId: 20 }, COLEGA_DEV), UnauthorizedAccessException);

  const outroProjeto = criarServico({ demanda: demandaBase({ projetoId: 99 }) });
  await assert.rejects(() => outroProjeto.servico.ligarDemanda({ id: 7, demandaId: 20 }, GESTOR), BusinessException);

  const inexistente = criarServico({ demanda: null });
  await assert.rejects(() => inexistente.servico.ligarDemanda({ id: 7, demandaId: 20 }, GESTOR), ResourceNotFoundException);

  const membro = criarServico({ comAcessoAoProjeto: [2], membros: [2] });
  await membro.servico.ligarDemanda({ id: 7, demandaId: 20 }, COLEGA_DEV);
  assert.deepEqual(metodos(membro.chamadas), ['ligarDemanda']);
});

test('ligarDemanda: plano amplo não liga demanda', async () => {
  const { servico } = criarServico({ plano: planoBase({ projetoId: null }) });
  await assert.rejects(() => servico.ligarDemanda({ id: 7, demandaId: 20 }, CRIADOR_DEV), BusinessException);
});

test('ligarDemanda: ligar de novo a mesma demanda não grava nada', async () => {
  const { servico, chamadas } = criarServico({ plano: planoBase({ demandaId: 20 }), demanda: demandaBase({ descricaoTecnica: 'Texto' }) });
  const resposta = await servico.ligarDemanda({ id: 7, demandaId: 20 }, GESTOR);
  assert.deepEqual(resposta.dados.abasPreenchidas, []);
  assert.deepEqual(metodos(chamadas), []);
});

// ---------------------------------------------------------------------------
// Plano amplo ganha projeto
// ---------------------------------------------------------------------------

test('atribuirProjeto: só o criador, com confirmação, em plano amplo, e com acesso ao projeto', async () => {
  const amplo = { plano: planoBase({ projetoId: null }) };

  const semConfirmar = criarServico(amplo);
  await assert.rejects(() => semConfirmar.servico.atribuirProjeto({ id: 7, projetoId: 10, confirmado: false }, GESTOR_CRIADOR), BusinessException);

  const jaTemProjeto = criarServico({ comAcessoAoProjeto: [1] });
  await assert.rejects(() => jaTemProjeto.servico.atribuirProjeto({ id: 7, projetoId: 10, confirmado: true }, CRIADOR_DEV), BusinessException);

  const semAcesso = criarServico(amplo);
  await assert.rejects(() => semAcesso.servico.atribuirProjeto({ id: 7, projetoId: 10, confirmado: true }, CRIADOR_DEV), UnauthorizedAccessException);

  const ok = criarServico({ ...amplo, comAcessoAoProjeto: [1] });
  const resposta = await ok.servico.atribuirProjeto({ id: 7, projetoId: 10, confirmado: true }, CRIADOR_DEV);
  assert.deepEqual(resposta.dados, { id: 7, projetoId: 10 });
  assert.deepEqual(ok.chamadas[0], { metodo: 'atribuirProjeto', argumento: { id: 7, projetoId: 10 } });
});

test('atribuirProjeto: outra pessoa não vê o plano amplo, então não o atribui', async () => {
  const { servico } = criarServico({ plano: planoBase({ projetoId: null }) });
  await assert.rejects(() => servico.atribuirProjeto({ id: 7, projetoId: 10, confirmado: true }, ADMINISTRADOR), ResourceNotFoundException);
});

test('atribuirProjeto: em plano de projeto o colega que o edita não é o criador e é recusado', async () => {
  const { servico } = criarServico({ comAcessoAoProjeto: [2] });
  await assert.rejects(() => servico.atribuirProjeto({ id: 7, projetoId: 10, confirmado: true }, COLEGA_DEV), UnauthorizedAccessException);
});
