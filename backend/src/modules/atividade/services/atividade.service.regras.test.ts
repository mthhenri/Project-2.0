import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { AtividadeService } from './atividade.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

// Regras de atividade (SYSTEM.SPEC.md §12 e §14), sem banco: os repositories são dublês que registram o que foi gravado.
// A exclusão e a restauração são do `@GestorOnly` do controller (ver atividade.controller.test.ts); restaurar tem os seus testes em atividade.service.test.ts.

const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 2, login: 'a', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const DESENVOLVEDOR = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const OUTRO_DESENVOLVEDOR = { sub: 4, login: 'o', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

type Dublê = Record<string, unknown>;

const ATIVIDADE = {
  id: 10, demandaId: 9, usuarioId: 3, nome: 'Ajustar login', status: TipoAtividadeStatusEnum.PLANEJADA,
  prioridade: { codigo: TipoAtividadePrioridadeEnum.INDEFINIDA, descricao: 'Indefinida', ordem: 5, cor: '#94a3b8' },
};

function criarServico(repositorio: Dublê = {}, tags: Dublê = {}, demandas: Dublê = {}): AtividadeService {
  const servico = Object.create(AtividadeService.prototype) as Record<string, unknown>;
  servico.atividadeRepositorio = repositorio;
  servico.tagRepositorio = tags;
  servico.demandaRepositorio = demandas;
  return servico as unknown as AtividadeService;
}

/** Repository com valores padrão felizes e um registro das chamadas de escrita. */
function repositorio(sobrescrita: Dublê = {}) {
  const gravacoes: Array<{ metodo: string; argumento: unknown }> = [];
  const escrever = (metodo: string, retorno: unknown = undefined) => async (argumento: unknown) => { gravacoes.push({ metodo, argumento }); return retorno; };
  return {
    gravacoes,
    recuperar: async () => ATIVIDADE,
    validarAcessoDemanda: async () => true,
    possuiExecucaoAtiva: async () => false,
    listar: async () => ({ itens: [], total: 0 }),
    listarTags: async () => [{ id: 1, nome: 'Bug', cor: '#ef4444' }],
    inserir: escrever('inserir', { ...ATIVIDADE, id: 99 }),
    alterar: escrever('alterar', ATIVIDADE),
    alterarTags: escrever('alterarTags'),
    excluir: escrever('excluir'),
    ...sobrescrita,
  };
}

const tagExistente = { recuperar: async ({ id }: { id: number }) => ({ id, nome: `Tag ${id}`, cor: '#000000' }) };
const demandaExistente = { recuperar: async () => ({ id: 9 }) };
const DADOS_CRIAR = { demandaId: 9, nome: 'Nova', status: TipoAtividadeStatusEnum.PLANEJADA };

const gravou = (repo: ReturnType<typeof repositorio>) => repo.gravacoes.length > 0;

// ---------------------------------------------------------------------------
// Criar
// ---------------------------------------------------------------------------

test('criar: demanda inexistente é 404 e nada é gravado', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo, tagExistente, { recuperar: async () => null }).criar(DADOS_CRIAR, GESTOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false);
});

test('criar: desenvolvedor sem vínculo com a demanda é recusado e nada é gravado', async () => {
  const repo = repositorio({ validarAcessoDemanda: async () => false });
  await assert.rejects(() => criarServico(repo, tagExistente, demandaExistente).criar(DADOS_CRIAR, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('criar: desenvolvedor membro da demanda cria a atividade para si, mesmo pedindo outro dono', async () => {
  const repo = repositorio();
  await criarServico(repo, tagExistente, demandaExistente).criar({ ...DADOS_CRIAR, usuarioId: 55 }, DESENVOLVEDOR);
  assert.equal((repo.gravacoes[0].argumento as { usuarioId: number }).usuarioId, 3);
});

test('criar: gestor e administrador não precisam de vínculo com a demanda e podem escolher o dono', async () => {
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    const repo = repositorio({ validarAcessoDemanda: async () => false });
    await criarServico(repo, tagExistente, demandaExistente).criar({ ...DADOS_CRIAR, usuarioId: 55 }, usuario);
    assert.equal((repo.gravacoes[0].argumento as { usuarioId: number }).usuarioId, 55);
  }
});

test('criar: gestor sem dono informado é o dono da atividade', async () => {
  const repo = repositorio();
  await criarServico(repo, tagExistente, demandaExistente).criar(DADOS_CRIAR, GESTOR);
  assert.equal((repo.gravacoes[0].argumento as { usuarioId: number }).usuarioId, 1);
});

test('criar: com tags grava a atividade e depois as tags informadas', async () => {
  const repo = repositorio();
  await criarServico(repo, tagExistente, demandaExistente).criar({ ...DADOS_CRIAR, tagIds: [1, 2] }, GESTOR);
  assert.deepEqual(repo.gravacoes.map((g) => g.metodo), ['inserir', 'alterarTags']);
  assert.deepEqual(repo.gravacoes[1].argumento, { atividadeId: 99, tagIds: [1, 2] });
});

test('criar: sem tags não toca nas tags', async () => {
  const repo = repositorio();
  await criarServico(repo, tagExistente, demandaExistente).criar({ ...DADOS_CRIAR, tagIds: [] }, GESTOR);
  assert.deepEqual(repo.gravacoes.map((g) => g.metodo), ['inserir']);
});

test('criar: tag inexistente é recusada sem gravar a atividade', async () => {
  const repo = repositorio();
  const semTag = { recuperar: async () => null };
  await assert.rejects(() => criarServico(repo, semTag, demandaExistente).criar({ ...DADOS_CRIAR, tagIds: [404] }, GESTOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false, 'a atividade não pode ficar gravada quando a criação falha');
});

test('criar: tag inexistente é 404 e as tags não são gravadas', async () => {
  const repo = repositorio();
  const semTag = { recuperar: async () => null };
  await assert.rejects(() => criarServico(repo, semTag, demandaExistente).criar({ ...DADOS_CRIAR, tagIds: [1] }, GESTOR), ResourceNotFoundException);
  assert.equal(repo.gravacoes.some((g) => g.metodo === 'alterarTags'), false);
});

// ---------------------------------------------------------------------------
// Listar
// ---------------------------------------------------------------------------

test('listar: gestor e administrador veem as atividades de todos, com o filtro de executor que pedirem', async () => {
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    let recebido: unknown;
    const repo = repositorio({ listar: async (filtros: unknown) => { recebido = filtros; return { itens: [], total: 0 }; } });
    await criarServico(repo).listar({ usuarioId: 55 }, usuario);
    assert.deepEqual(recebido, { usuarioId: 55 });
  }
});

test('listar: desenvolvedor sem demanda no filtro vê só as próprias, mesmo pedindo as de outro', async () => {
  let recebido: unknown;
  const repo = repositorio({ listar: async (filtros: unknown) => { recebido = filtros; return { itens: [], total: 0 }; } });
  await criarServico(repo).listar({ usuarioId: 55 }, DESENVOLVEDOR);
  assert.deepEqual(recebido, { usuarioId: 3 });
});

test('listar: desenvolvedor membro da demanda filtrada vê todas as atividades dela', async () => {
  let recebido: Record<string, unknown> = {};
  const repo = repositorio({ listar: async (filtros: Record<string, unknown>) => { recebido = filtros; return { itens: [], total: 0 }; } });
  await criarServico(repo).listar({ demandaId: 9 }, DESENVOLVEDOR);
  assert.equal(recebido.usuarioId, undefined);
  assert.equal(recebido.demandaId, 9);
});

test('listar: desenvolvedor não membro da demanda filtrada volta a ver só as próprias', async () => {
  let recebido: Record<string, unknown> = {};
  const repo = repositorio({
    validarAcessoDemanda: async () => false,
    listar: async (filtros: Record<string, unknown>) => { recebido = filtros; return { itens: [], total: 0 }; },
  });
  await criarServico(repo).listar({ demandaId: 9 }, DESENVOLVEDOR);
  assert.equal(recebido.usuarioId, 3);
});

test('listar: calcula as páginas (padrão página 1, 20 por página)', async () => {
  const repo = repositorio({ listar: async () => ({ itens: [], total: 45 }) });
  const { dados } = await criarServico(repo).listar({}, GESTOR);
  assert.deepEqual(dados, { itens: [], totalItens: 45, paginaAtual: 1, itensPorPagina: 20, totalPaginas: 3 });
  const segunda = await criarServico(repo).listar({ pagina: 2, itensPorPagina: 10 }, GESTOR);
  assert.deepEqual([segunda.dados?.paginaAtual, segunda.dados?.totalPaginas], [2, 5]);
});

test('listar: allRows devolve tudo numa página só', async () => {
  const itens = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const repo = repositorio({ listar: async () => ({ itens, total: 3 }) });
  const { dados } = await criarServico(repo).listar({ allRows: true }, GESTOR);
  assert.deepEqual([dados?.totalItens, dados?.paginaAtual, dados?.itensPorPagina, dados?.totalPaginas], [3, 1, 3, 1]);
});

// ---------------------------------------------------------------------------
// Recuperar e listar tags
// ---------------------------------------------------------------------------

test('recuperar e listarTags: atividade inexistente é 404', async () => {
  const repo = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(repo).recuperar({ id: 10 }, GESTOR), ResourceNotFoundException);
  await assert.rejects(() => criarServico(repo).listarTags({ id: 10 }, GESTOR), ResourceNotFoundException);
});

test('recuperar e listarTags: desenvolvedor sem vínculo com a demanda é recusado; gestor e membro passam', async () => {
  const semAcesso = repositorio({ validarAcessoDemanda: async () => false });
  await assert.rejects(() => criarServico(semAcesso).recuperar({ id: 10 }, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => criarServico(semAcesso).listarTags({ id: 10 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal((await criarServico(semAcesso).recuperar({ id: 10 }, GESTOR)).dados?.id, 10);
  assert.equal((await criarServico(semAcesso).listarTags({ id: 10 }, ADMINISTRADOR)).dados?.length, 1);
  assert.equal((await criarServico(repositorio()).recuperar({ id: 10 }, DESENVOLVEDOR)).dados?.id, 10);
});

// ---------------------------------------------------------------------------
// Alterar
// ---------------------------------------------------------------------------

test('alterar: atividade inexistente é 404 e nada é gravado', async () => {
  const repo = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(repo).alterar({ id: 10, nome: 'X' }, GESTOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false);
});

test('alterar: desenvolvedor que não é o dono nem membro da demanda é recusado e nada é gravado', async () => {
  const repo = repositorio({ validarAcessoDemanda: async () => false });
  await assert.rejects(() => criarServico(repo).alterar({ id: 10, nome: 'X' }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('alterar: o dono altera mesmo sem vínculo com a demanda; o membro altera a atividade de outro', async () => {
  const donoSemVinculo = repositorio({ validarAcessoDemanda: async () => false });
  await criarServico(donoSemVinculo).alterar({ id: 10, nome: 'X' }, DESENVOLVEDOR);
  assert.equal(donoSemVinculo.gravacoes.length, 1);

  const membro = repositorio();
  await criarServico(membro).alterar({ id: 10, nome: 'X' }, OUTRO_DESENVOLVEDOR);
  assert.equal(membro.gravacoes.length, 1);
});

test('alterar: gestor e administrador alteram qualquer atividade', async () => {
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    const repo = repositorio({ validarAcessoDemanda: async () => false });
    await criarServico(repo).alterar({ id: 10, nome: 'X' }, usuario);
    assert.equal(repo.gravacoes.length, 1);
  }
});

test('alterar: trocar o status com execução em andamento é recusado e nada é gravado', async () => {
  const repo = repositorio({ possuiExecucaoAtiva: async () => true });
  await assert.rejects(
    () => criarServico(repo).alterar({ id: 10, status: TipoAtividadeStatusEnum.DESENVOLVIDA }, GESTOR),
    BusinessException,
  );
  assert.equal(gravou(repo), false);
});

test('alterar: o mesmo status ou outro campo não consulta a execução ativa, então passa com execução em andamento', async () => {
  let consultou = false;
  const repo = repositorio({ possuiExecucaoAtiva: async () => { consultou = true; return true; } });
  await criarServico(repo).alterar({ id: 10, status: TipoAtividadeStatusEnum.PLANEJADA, prioridade: TipoAtividadePrioridadeEnum.ALTA }, GESTOR);
  await criarServico(repo).alterar({ id: 10, nome: 'Outro nome' }, GESTOR);
  assert.equal(consultou, false);
  assert.equal(repo.gravacoes.length, 2);
});

test('alterar: sem execução em andamento aceita qualquer troca de status', async () => {
  for (const status of Object.values(TipoAtividadeStatusEnum)) {
    const repo = repositorio();
    await criarServico(repo).alterar({ id: 10, status }, GESTOR);
    assert.equal((repo.gravacoes[0].argumento as { status: string }).status, status);
  }
});

test('alterar: a prioridade é repassada ao repository, inclusive sem mexer nos outros campos', async () => {
  const repo = repositorio();
  await criarServico(repo).alterar({ id: 10, prioridade: TipoAtividadePrioridadeEnum.URGENTE }, GESTOR);
  assert.deepEqual(repo.gravacoes[0].argumento, { id: 10, nome: undefined, status: undefined, prioridade: TipoAtividadePrioridadeEnum.URGENTE, demandaId: undefined });
});

// ---------------------------------------------------------------------------
// Excluir
// ---------------------------------------------------------------------------

test('excluir: atividade inexistente é 404; existente faz o soft delete', async () => {
  const inexistente = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(inexistente).excluir({ id: 10 }), ResourceNotFoundException);
  assert.equal(gravou(inexistente), false);

  const repo = repositorio();
  await criarServico(repo).excluir({ id: 10 });
  assert.deepEqual(repo.gravacoes, [{ metodo: 'excluir', argumento: { id: 10 } }]);
});

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

test('alterarTags: atividade inexistente é 404', async () => {
  const repo = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(repo, tagExistente).alterarTags({ id: 10, tagIds: [1] }, GESTOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false);
});

test('alterarTags: desenvolvedor que não é o dono nem membro é recusado e nada é gravado', async () => {
  const repo = repositorio({ validarAcessoDemanda: async () => false });
  await assert.rejects(() => criarServico(repo, tagExistente).alterarTags({ id: 10, tagIds: [1] }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('alterarTags: dono, membro e gestor sincronizam as tags e recebem o conjunto final', async () => {
  const casos = [
    { usuario: DESENVOLVEDOR, acesso: false },
    { usuario: OUTRO_DESENVOLVEDOR, acesso: true },
    { usuario: GESTOR, acesso: false },
  ];
  for (const { usuario, acesso } of casos) {
    const repo = repositorio({ validarAcessoDemanda: async () => acesso });
    const resposta = await criarServico(repo, tagExistente).alterarTags({ id: 10, tagIds: [1, 2] }, usuario);
    assert.deepEqual(repo.gravacoes, [{ metodo: 'alterarTags', argumento: { atividadeId: 10, tagIds: [1, 2] } }]);
    assert.deepEqual(resposta.dados, { atividadeId: 10, tags: [{ id: 1, nome: 'Bug', cor: '#ef4444' }] });
  }
});

test('alterarTags: uma tag inexistente na lista recusa tudo, sem gravar nenhuma', async () => {
  const repo = repositorio();
  const soAUm = { recuperar: async ({ id }: { id: number }) => (id === 1 ? { id } : null) };
  await assert.rejects(() => criarServico(repo, soAUm).alterarTags({ id: 10, tagIds: [1, 2] }, GESTOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false);
});

test('alterarTags: lista vazia remove todas as tags', async () => {
  const repo = repositorio();
  await criarServico(repo, tagExistente).alterarTags({ id: 10, tagIds: [] }, GESTOR);
  assert.deepEqual(repo.gravacoes, [{ metodo: 'alterarTags', argumento: { atividadeId: 10, tagIds: [] } }]);
});

// ---------------------------------------------------------------------------
// Mudar a atividade de demanda (task 229)
// ---------------------------------------------------------------------------

const DEMANDA_DESTINO = { id: 20, status: 'PENDENTE' };
const demandaDeDestino = (status = 'PENDENTE') => ({ recuperar: async () => ({ ...DEMANDA_DESTINO, status }) });

test('alterar demanda: o dono (desenvolvedor com acesso ao destino) muda a atividade e o repository recebe o destino', async () => {
  const repo = repositorio();
  await criarServico(repo, {}, demandaDeDestino()).alterar({ id: 10, demandaId: 20 }, DESENVOLVEDOR);
  assert.deepEqual(repo.gravacoes, [{ metodo: 'alterar', argumento: { id: 10, nome: undefined, status: undefined, prioridade: undefined, demandaId: 20 } }]);
});

test('alterar demanda: o gestor muda a atividade de outra pessoa, sem precisar de vínculo com o destino', async () => {
  for (const gestor of [GESTOR, ADMINISTRADOR]) {
    const repo = repositorio({ validarAcessoDemanda: async () => false });
    await criarServico(repo, {}, demandaDeDestino()).alterar({ id: 10, demandaId: 20 }, gestor);
    assert.equal(repo.gravacoes.length, 1);
  }
});

test('alterar demanda: desenvolvedor que não é o dono é recusado, mesmo sendo membro da demanda, e nada é gravado', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo, {}, demandaDeDestino()).alterar({ id: 10, demandaId: 20 }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('alterar demanda: o dono sem acesso à demanda de destino é recusado', async () => {
  const repo = repositorio({ validarAcessoDemanda: async ({ demandaId }: { demandaId: number }) => demandaId !== 20 });
  await assert.rejects(() => criarServico(repo, {}, demandaDeDestino()).alterar({ id: 10, demandaId: 20 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('alterar demanda: destino inexistente é 404; concluído ou cancelado é recusado; nada é gravado', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo, {}, { recuperar: async () => null }).alterar({ id: 10, demandaId: 20 }, GESTOR), ResourceNotFoundException);
  for (const status of ['CONCLUIDA', 'CANCELADA']) {
    await assert.rejects(() => criarServico(repo, {}, demandaDeDestino(status)).alterar({ id: 10, demandaId: 20 }, GESTOR), BusinessException);
  }
  assert.equal(gravou(repo), false);
});

test('alterar demanda: o destino igual à demanda de hoje não confere nada e só passa o resto', async () => {
  const repo = repositorio();
  await criarServico(repo, {}, { recuperar: async () => { throw new Error('não deveria consultar'); } }).alterar({ id: 10, demandaId: 9, nome: 'X' }, DESENVOLVEDOR);
  assert.equal(repo.gravacoes.length, 1);
});
