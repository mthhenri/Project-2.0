import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { DemandaService } from './demanda.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

// Regras de SYSTEM.SPEC.md §14 ("Demandas" e "Grafo de Demandas"), sem banco: os repositories são dublês que registram o que foi gravado.
// A permissão de excluir, restaurar, planejamento e conexões é do `@GestorOnly` do controller (ver demanda.controller.test.ts).

const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 2, login: 'a', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const DESENVOLVEDOR = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

const DEMANDA = {
  id: 10, projetoId: 7, demandaPaiId: null as number | null, nome: 'Demanda', descricaoTecnica: null, descricaoCliente: null, documentacao: null,
  horasEstimadas: 8, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, previsaoFimData: null, createdDate: new Date('2026-01-01'),
};
const PAI_ESTRUTURAL = { ...DEMANDA, id: 5, nome: 'Pai', isEstrutural: true };

type Dublê = Record<string, unknown>;

function criarServico(repositorio: Dublê = {}, tags: Dublê = {}, usuarios: Dublê = {}): DemandaService {
  const servico = Object.create(DemandaService.prototype) as Record<string, unknown>;
  servico.demandaRepositorio = repositorio;
  servico.tagRepositorio = tags;
  servico.usuarioRepositorio = usuarios;
  return servico as unknown as DemandaService;
}

/** Repository com valores padrão felizes e um registro de chamadas de escrita. */
function repositorio(sobrescrita: Dublê = {}) {
  const gravacoes: Array<{ metodo: string; argumento: unknown }> = [];
  const escrever = (metodo: string, retorno: unknown = undefined) => async (argumento: unknown) => { gravacoes.push({ metodo, argumento }); return retorno; };
  return {
    gravacoes,
    recuperar: async () => DEMANDA,
    validarAcessoProjeto: async () => true,
    validarMembro: async () => true,
    contarMembrosDemanda: async () => 2,
    inserirComAtribuicao: async (dados: unknown, atribuicao: unknown) => { gravacoes.push({ metodo: 'inserirComAtribuicao', argumento: { dados, atribuicao } }); return { ...DEMANDA, id: 99 }; },
    alterar: escrever('alterar', DEMANDA),
    atribuirTagsDemanda: escrever('atribuirTagsDemanda'),
    listarTagsDemanda: async () => [{ id: 1, nome: 'Backend', cor: '#112233' }],
    excluir: escrever('excluir'),
    inserirConexao: escrever('inserirConexao', { id: 1 }),
    excluirConexao: escrever('excluirConexao'),
    atribuirMembroDemanda: escrever('atribuirMembroDemanda'),
    removerMembroDemanda: escrever('removerMembroDemanda'),
    validarConexao: async () => false,
    verificarCriariaCiclo: async () => false,
    validarConexaoDemanda: async () => true,
    ...sobrescrita,
  };
}

const usuarioExistente = { recuperar: async ({ id }: { id: number }) => ({ id, nomeCompleto: `Pessoa ${id}`, login: `p${id}`, tipo: TipoUsuarioEnum.DESENVOLVEDOR }) };
const tagExistente = { recuperar: async ({ id }: { id: number }) => ({ id, nome: `Tag ${id}`, cor: '#000000' }) };

const DADOS_CRIAR = { projetoId: 7, nome: 'Nova', horasEstimadas: 4, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false };

const gravou = (repo: ReturnType<typeof repositorio>) => repo.gravacoes.length > 0;
const mensagem = (erro: { getResponse(): unknown }) => (erro.getResponse() as { mensagem: string }).mensagem;

// ---------------------------------------------------------------------------
// Criar demanda
// ---------------------------------------------------------------------------

test('criar: desenvolvedor só cria sub-demanda — sem demandaPaiId é recusado e nada é gravado', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo, tagExistente, usuarioExistente).criar(DADOS_CRIAR, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('criar: gestor e administrador criam demanda raiz', async () => {
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    const repo = repositorio();
    const resposta = await criarServico(repo, tagExistente, usuarioExistente).criar(DADOS_CRIAR, usuario);
    assert.equal(resposta.dados?.id, 99);
    assert.equal(repo.gravacoes[0].metodo, 'inserirComAtribuicao');
  }
});

test('criar: o gestor criador NÃO é atribuído em demanda_usuario (acesso total por tipo)', async () => {
  const repo = repositorio();
  await criarServico(repo, tagExistente, usuarioExistente).criar(DADOS_CRIAR, GESTOR);
  const { atribuicao } = repo.gravacoes[0].argumento as { atribuicao: { usuarioIds: number[] } };
  assert.deepEqual(atribuicao.usuarioIds, []);
});

test('criar: o desenvolvedor criador é auto-atribuído à sub-demanda', async () => {
  const repo = repositorio({ recuperar: async () => PAI_ESTRUTURAL });
  await criarServico(repo, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, demandaPaiId: 5 }, DESENVOLVEDOR);
  const { atribuicao } = repo.gravacoes[0].argumento as { atribuicao: { usuarioIds: number[] } };
  assert.deepEqual(atribuicao.usuarioIds, [3]);
});

test('criar: os membros escolhidos na criação entram, sem repetição', async () => {
  const repo = repositorio();
  await criarServico(repo, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, usuarioIds: [5, 6, 5] }, GESTOR);
  const { atribuicao } = repo.gravacoes[0].argumento as { atribuicao: { usuarioIds: number[] } };
  assert.deepEqual(atribuicao.usuarioIds, [5, 6]);
});

test('criar: desenvolvedor só pode se incluir como membro na criação, nunca outros', async () => {
  const pai = repositorio({ recuperar: async () => PAI_ESTRUTURAL });
  await assert.rejects(
    () => criarServico(pai, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, demandaPaiId: 5, usuarioIds: [3, 8] }, DESENVOLVEDOR),
    UnauthorizedAccessException,
  );
  assert.equal(gravou(pai), false);

  const proprio = repositorio({ recuperar: async () => PAI_ESTRUTURAL });
  await criarServico(proprio, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, demandaPaiId: 5, usuarioIds: [3] }, DESENVOLVEDOR);
  const { atribuicao } = proprio.gravacoes[0].argumento as { atribuicao: { usuarioIds: number[] } };
  assert.deepEqual(atribuicao.usuarioIds, [3]);
});

test('criar: desenvolvedor sem acesso ao projeto é recusado, mesmo com demandaPaiId', async () => {
  const repo = repositorio({ validarAcessoProjeto: async () => false, recuperar: async () => PAI_ESTRUTURAL });
  await assert.rejects(() => criarServico(repo, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, demandaPaiId: 5 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('criar: membro inexistente lança ResourceNotFoundException e nada é gravado', async () => {
  const repo = repositorio();
  const semUsuario = { recuperar: async () => null };
  await assert.rejects(() => criarServico(repo, tagExistente, semUsuario).criar({ ...DADOS_CRIAR, usuarioIds: [50] }, GESTOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false);
});

test('criar: o pai precisa existir, ser do mesmo projeto e ser estrutural', async () => {
  const inexistente = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(inexistente, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, demandaPaiId: 5 }, GESTOR), ResourceNotFoundException);

  const outroProjeto = repositorio({ recuperar: async () => ({ ...PAI_ESTRUTURAL, projetoId: 999 }) });
  await assert.rejects(() => criarServico(outroProjeto, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, demandaPaiId: 5 }, GESTOR), BusinessException);

  const naoEstrutural = repositorio({ recuperar: async () => ({ ...PAI_ESTRUTURAL, isEstrutural: false }) });
  await assert.rejects(() => criarServico(naoEstrutural, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, demandaPaiId: 5 }, GESTOR), BusinessException);

  for (const repo of [inexistente, outroProjeto, naoEstrutural]) assert.equal(gravou(repo), false);
});

test('criar: só gestor atribui tags na criação; desenvolvedor é recusado', async () => {
  const repo = repositorio({ recuperar: async () => PAI_ESTRUTURAL });
  await assert.rejects(
    () => criarServico(repo, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, demandaPaiId: 5, tagIds: [1] }, DESENVOLVEDOR),
    UnauthorizedAccessException,
  );
  assert.equal(gravou(repo), false);

  const comTags = repositorio();
  await criarServico(comTags, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, tagIds: [1, 2] }, GESTOR);
  assert.deepEqual(comTags.gravacoes.map((g) => g.metodo), ['inserirComAtribuicao', 'atribuirTagsDemanda']);
  assert.deepEqual(comTags.gravacoes[1].argumento, { demandaId: 99, tagIds: [1, 2] });
});

// P-012: a existência das tags só é conferida DEPOIS de gravar a demanda, então uma tag inexistente deixa a demanda criada e devolve 404.
test('criar: tag inexistente é recusada sem gravar a demanda', { todo: 'P-012' }, async () => {
  const repo = repositorio();
  const semTag = { recuperar: async () => null };
  await assert.rejects(() => criarServico(repo, semTag, usuarioExistente).criar({ ...DADOS_CRIAR, tagIds: [404] }, GESTOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false, 'a demanda não pode ficar gravada quando a criação falha');
});

test('criar: a previsão de fim vira Date e as descrições ausentes viram null', async () => {
  const repo = repositorio();
  await criarServico(repo, tagExistente, usuarioExistente).criar({ ...DADOS_CRIAR, previsaoFimData: '2026-12-31' }, GESTOR);
  const { dados } = repo.gravacoes[0].argumento as { dados: Record<string, unknown> };
  assert.ok(dados.previsaoFimData instanceof Date);
  assert.deepEqual([dados.descricaoTecnica, dados.descricaoCliente, dados.documentacao, dados.demandaPaiId], [null, null, null, null]);
});

// ---------------------------------------------------------------------------
// Ver demanda (listar, recuperar) e podeEditar
// ---------------------------------------------------------------------------

test('recuperar: desenvolvedor passa o filtro de acesso ao projeto; gestor e administrador não', async () => {
  const filtros: unknown[] = [];
  const repo = repositorio({ recuperar: async (_dto: unknown, filtro: unknown) => { filtros.push(filtro); return { ...DEMANDA }; } });
  const servico = criarServico(repo);
  await servico.recuperar({ id: 10 }, DESENVOLVEDOR);
  await servico.recuperar({ id: 10 }, GESTOR);
  await servico.recuperar({ id: 10 }, ADMINISTRADOR);
  assert.deepEqual(filtros, [{ usuarioId: 3 }, undefined, undefined]);
});

test('recuperar: desenvolvedor vê a demanda de projeto acessível, mas só edita se for membro (podeEditar)', async () => {
  const membro = criarServico(repositorio({ validarMembro: async () => true }));
  assert.equal((await membro.recuperar({ id: 10 }, DESENVOLVEDOR)).dados?.podeEditar, true);
  const naoMembro = criarServico(repositorio({ validarMembro: async () => false }));
  const resposta = await naoMembro.recuperar({ id: 10 }, DESENVOLVEDOR);
  assert.equal(resposta.dados?.podeEditar, false);
  assert.equal(resposta.dados?.id, 10, 'ver, ele vê');
});

test('recuperar: gestor sempre pode editar, sem consultar a participação', async () => {
  let consultou = false;
  const servico = criarServico(repositorio({ validarMembro: async () => { consultou = true; return false; } }));
  assert.equal((await servico.recuperar({ id: 10 }, GESTOR)).dados?.podeEditar, true);
  assert.equal(consultou, false);
});

test('recuperar: inexistente, excluída ou de projeto inacessível ao desenvolvedor lança ResourceNotFoundException', async () => {
  await assert.rejects(() => criarServico(repositorio({ recuperar: async () => null })).recuperar({ id: 10 }, DESENVOLVEDOR), ResourceNotFoundException);
});

test('listar: desenvolvedor lista só as demandas dele (restrição por usuário); gestor, todas', async () => {
  const restricoes: unknown[] = [];
  const repo = repositorio({ listar: async (_filtros: unknown, restricao: unknown) => { restricoes.push(restricao); return { itens: [], total: 0 }; } });
  const servico = criarServico(repo);
  await servico.listar({ projetoId: 7 }, DESENVOLVEDOR);
  await servico.listar({ projetoId: 7 }, GESTOR);
  assert.deepEqual(restricoes, [{ usuarioId: 3 }, undefined]);
});

test('listar: calcula as páginas; allRows devolve tudo em uma página só', async () => {
  const servico = criarServico(repositorio({ listar: async () => ({ itens: [{ id: 1 }, { id: 2 }], total: 45 }) }));
  const paginada = (await servico.listar({ projetoId: 7, pagina: 2, itensPorPagina: 20 }, GESTOR)).dados!;
  assert.deepEqual([paginada.totalItens, paginada.paginaAtual, paginada.totalPaginas], [45, 2, 3]);
  const tudo = (await servico.listar({ projetoId: 7, allRows: true }, GESTOR)).dados!;
  assert.deepEqual([tudo.totalItens, tudo.totalPaginas, tudo.paginaAtual], [2, 1, 1]);
});

test('listarAtribuidas: desenvolvedor recebe só as atribuídas; gestor, todas', async () => {
  const chamadas: unknown[] = [];
  const servico = criarServico(repositorio({ listarAtribuidas: async (dto: unknown) => { chamadas.push(dto); return []; } }));
  await servico.listarAtribuidas(DESENVOLVEDOR);
  await servico.listarAtribuidas(GESTOR);
  assert.deepEqual(chamadas, [{ usuarioId: 3, apenasAtribuidas: true }, { usuarioId: 1, apenasAtribuidas: false }]);
});

// ---------------------------------------------------------------------------
// Editar demanda
// ---------------------------------------------------------------------------

test('alterar: desenvolvedor só edita demanda da qual é membro', async () => {
  const repo = repositorio({ validarMembro: async () => false });
  await assert.rejects(() => criarServico(repo).alterar({ id: 10, nome: 'Novo' }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('alterar: membro desenvolvedor altera nome, horas, descrição técnica e documentação', async () => {
  const repo = repositorio();
  await criarServico(repo).alterar({ id: 10, nome: 'Novo', horasEstimadas: 5, descricaoTecnica: 'texto', documentacao: 'doc' }, DESENVOLVEDOR);
  assert.deepEqual(repo.gravacoes.map((g) => g.metodo), ['alterar']);
});

test('alterar: a descricaoCliente é exclusiva do gestor — o desenvolvedor membro é recusado e o gestor e o administrador alteram', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo).alterar({ id: 10, descricaoCliente: 'x' }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    await criarServico(repo).alterar({ id: 10, descricaoCliente: 'x' }, usuario);
  }
  assert.equal(repo.gravacoes.length, 2);
});

test('alterar: demanda inexistente ou de projeto inacessível ao desenvolvedor lança ResourceNotFoundException', async () => {
  const repo = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(repo).alterar({ id: 10, nome: 'X' }, DESENVOLVEDOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false);
});

test('alterar: o novo pai precisa existir e ser do mesmo projeto da demanda', async () => {
  const semPai = repositorio({ recuperar: async ({ id }: { id: number }) => (id === 10 ? DEMANDA : null) });
  await assert.rejects(() => criarServico(semPai).alterar({ id: 10, demandaPaiId: 5 }, GESTOR), ResourceNotFoundException);
  const outroProjeto = repositorio({ recuperar: async ({ id }: { id: number }) => (id === 10 ? DEMANDA : { ...PAI_ESTRUTURAL, projetoId: 999 }) });
  await assert.rejects(() => criarServico(outroProjeto).alterar({ id: 10, demandaPaiId: 5 }, GESTOR), BusinessException);
  assert.equal(gravou(semPai) || gravou(outroProjeto), false);
});

// P-010: a service só confere o projeto do novo pai; mover a demanda para dentro dela mesma ou de uma descendente cria um ciclo na árvore.
test('alterar: uma demanda não pode virar filha de si mesma', { todo: 'P-010' }, async () => {
  const repo = repositorio({ recuperar: async () => ({ ...DEMANDA, isEstrutural: true }) });
  await assert.rejects(() => criarServico(repo).alterar({ id: 10, demandaPaiId: 10 }, GESTOR), BusinessException);
  assert.equal(gravou(repo), false);
});

test('alterar: uma demanda não pode ser movida para dentro de uma descendente (ciclo na árvore)', { todo: 'P-010' }, async () => {
  const filha = { ...PAI_ESTRUTURAL, id: 11 };
  const repo = repositorio({
    recuperar: async ({ id }: { id: number }) => (id === 10 ? { ...DEMANDA, isEstrutural: true } : filha),
    listarDescendentes: async () => [{ id: 10, demandaPaiId: null, nivel: 0 }, { id: 11, demandaPaiId: 10, nivel: 1 }],
  });
  await assert.rejects(() => criarServico(repo).alterar({ id: 10, demandaPaiId: 11 }, GESTOR), BusinessException);
  assert.equal(gravou(repo), false);
});

// ---------------------------------------------------------------------------
// Árvore, ancestral, grafo e planejamento
// ---------------------------------------------------------------------------

test('recuperarArvore: monta a árvore aninhada a partir da lista plana', async () => {
  const plano = (id: number, demandaPaiId: number | null, nivel: number) => ({
    id, demandaPaiId, nome: `D${id}`, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: true, horasEstimadas: 1, minutosExecutados: 0,
    temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], nivel,
  });
  const servico = criarServico(repositorio({ listarDescendentes: async () => [plano(1, null, 0), plano(2, 1, 1), plano(3, 1, 1), plano(4, 2, 2)] }));
  const raiz = (await servico.recuperarArvore({ id: 1 }, GESTOR)).dados!;
  assert.equal(raiz.id, 1);
  assert.deepEqual(raiz.filhos.map((filho) => filho.id), [2, 3]);
  assert.deepEqual(raiz.filhos[0].filhos.map((filho) => filho.id), [4]);
  assert.deepEqual(raiz.filhos[1].filhos, []);
});

test('árvore, ancestral, conexões, tags e membros: demanda inexistente ou inacessível lança ResourceNotFoundException', async () => {
  const servico = criarServico(repositorio({ recuperar: async () => null }));
  await assert.rejects(() => servico.recuperarArvore({ id: 1 }, DESENVOLVEDOR), ResourceNotFoundException);
  await assert.rejects(() => servico.recuperarAncestral({ id: 1 }, DESENVOLVEDOR), ResourceNotFoundException);
  await assert.rejects(() => servico.listarConexoes({ id: 1 }, DESENVOLVEDOR), ResourceNotFoundException);
  await assert.rejects(() => servico.listarTagsDemanda({ id: 1 }, DESENVOLVEDOR), ResourceNotFoundException);
  await assert.rejects(() => servico.listarMembros({ id: 1 }, DESENVOLVEDOR), ResourceNotFoundException);
});

test('leituras da demanda passam o filtro de acesso ao desenvolvedor e nenhum ao gestor', async () => {
  const filtros: unknown[] = [];
  const repo = repositorio({
    recuperar: async (_dto: unknown, filtro: unknown) => { filtros.push(filtro); return DEMANDA; },
    listarDescendentes: async () => [{ id: 10, demandaPaiId: null, nome: 'D', status: 'PENDENTE', isEstrutural: false, horasEstimadas: 0, minutosExecutados: 0, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], nivel: 0 }],
    listarAncestral: async () => [], listarConexoes: async () => [], listarMembrosDemanda: async () => [],
  });
  const servico = criarServico(repo);
  for (const usuario of [DESENVOLVEDOR, GESTOR]) {
    await servico.recuperarArvore({ id: 10 }, usuario);
    await servico.recuperarAncestral({ id: 10 }, usuario);
    await servico.listarConexoes({ id: 10 }, usuario);
    await servico.listarTagsDemanda({ id: 10 }, usuario);
    await servico.listarMembros({ id: 10 }, usuario);
  }
  assert.deepEqual(filtros, [...Array(5).fill({ usuarioId: 3 }), ...Array(5).fill(undefined)]);
});

test('recuperarGrafo: desenvolvedor só vê o grafo de projeto acessível; gestor não precisa de acesso', async () => {
  const semAcesso = repositorio({ validarAcessoProjeto: async () => false, recuperarGrafo: async () => ({ nos: [], arestas: [] }) });
  await assert.rejects(() => criarServico(semAcesso).recuperarGrafo({ projetoId: 7 }, DESENVOLVEDOR), UnauthorizedAccessException);

  let consultouAcesso = false;
  const gestor = repositorio({ validarAcessoProjeto: async () => { consultouAcesso = true; return false; }, recuperarGrafo: async () => ({ nos: [], arestas: [] }) });
  assert.equal((await criarServico(gestor).recuperarGrafo({ projetoId: 7 }, GESTOR)).sucesso, true);
  assert.equal(consultouAcesso, false);

  const comAcesso = repositorio({ recuperarGrafo: async () => ({ nos: [{ id: 1 }], arestas: [] }) });
  assert.equal((await criarServico(comAcesso).recuperarGrafo({ projetoId: 7 }, DESENVOLVEDOR)).dados?.nos.length, 1);
});

test('listarPlanejamento: devolve o que o repository calcula (a restrição ao gestor é do controller)', async () => {
  const servico = criarServico(repositorio({ listarPlanejamento: async () => [{ demandaId: 1 }] }));
  assert.deepEqual((await servico.listarPlanejamento({ projetoId: 7 }, GESTOR)).dados, [{ demandaId: 1 }]);
});

// ---------------------------------------------------------------------------
// Conexões do grafo
// ---------------------------------------------------------------------------

test('criarConexao: origem e destino precisam existir', async () => {
  const semOrigem = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(semOrigem).criarConexao({ demandaOrigemId: 1, demandaDestinoId: 2, ehBidirecional: false }), ResourceNotFoundException);
  const semDestino = repositorio({ recuperar: async ({ id }: { id: number }) => (id === 1 ? DEMANDA : null) });
  await assert.rejects(() => criarServico(semDestino).criarConexao({ demandaOrigemId: 1, demandaDestinoId: 2, ehBidirecional: false }), ResourceNotFoundException);
  assert.equal(gravou(semOrigem) || gravou(semDestino), false);
});

test('criarConexao: auto-conexão e conexão repetida no mesmo sentido são recusadas', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo).criarConexao({ demandaOrigemId: 1, demandaDestinoId: 1, ehBidirecional: false }), BusinessException);
  const repetida = repositorio({ validarConexao: async () => true });
  await assert.rejects(() => criarServico(repetida).criarConexao({ demandaOrigemId: 1, demandaDestinoId: 2, ehBidirecional: false }), BusinessException);
  assert.equal(gravou(repo) || gravou(repetida), false);
});

test('criarConexao: ciclo é recusado com BusinessException explicativa e nada é gravado', async () => {
  const repo = repositorio({ verificarCriariaCiclo: async () => true });
  await assert.rejects(() => criarServico(repo).criarConexao({ demandaOrigemId: 1, demandaDestinoId: 2, ehBidirecional: false }), (erro: BusinessException) => {
    assert.ok(erro instanceof BusinessException);
    assert.match(mensagem(erro), /ciclo/i);
    return true;
  });
  assert.equal(gravou(repo), false);
});

test('criarConexao: conexão válida é gravada com origem, destino e bidirecionalidade', async () => {
  const repo = repositorio();
  const resposta = await criarServico(repo).criarConexao({ demandaOrigemId: 1, demandaDestinoId: 2, ehBidirecional: true });
  assert.deepEqual(repo.gravacoes, [{ metodo: 'inserirConexao', argumento: { demandaOrigemId: 1, demandaDestinoId: 2, ehBidirecional: true } }]);
  assert.equal(resposta.sucesso, true);
});

test('excluirConexao: a conexão precisa pertencer à demanda; senão 404 e nada é excluído', async () => {
  const alheia = repositorio({ validarConexaoDemanda: async () => false });
  await assert.rejects(() => criarServico(alheia).excluirConexao({ demandaId: 1, conexaoId: 9 }), ResourceNotFoundException);
  const semDemanda = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(semDemanda).excluirConexao({ demandaId: 1, conexaoId: 9 }), ResourceNotFoundException);
  assert.equal(gravou(alheia) || gravou(semDemanda), false);

  const repo = repositorio();
  await criarServico(repo).excluirConexao({ demandaId: 1, conexaoId: 9 });
  assert.deepEqual(repo.gravacoes, [{ metodo: 'excluirConexao', argumento: { demandaId: 1, conexaoId: 9 } }]);
});

// ---------------------------------------------------------------------------
// Excluir e restaurar
// ---------------------------------------------------------------------------

test('excluir: faz soft delete pelo repository; inexistente lança ResourceNotFoundException', async () => {
  const repo = repositorio();
  assert.equal((await criarServico(repo).excluir({ id: 10 })).sucesso, true);
  assert.deepEqual(repo.gravacoes, [{ metodo: 'excluir', argumento: { id: 10 } }]);
  await assert.rejects(() => criarServico(repositorio({ recuperar: async () => null })).excluir({ id: 10 }), ResourceNotFoundException);
});

test('restaurar: recusa quando o projeto ou a demanda pai foram excluídos', async () => {
  let restaurou = false;
  const base = { recuperarExcluida: async () => ({ id: 10, projetoId: 7, nome: 'D', projetoAtivo: true, paiAtivo: true }), restaurar: async () => { restaurou = true; return {}; } };
  await assert.rejects(() => criarServico(repositorio({ ...base, recuperarExcluida: async () => ({ id: 10, projetoAtivo: false, paiAtivo: true }) })).restaurar({ id: 10 }), BusinessException);
  await assert.rejects(() => criarServico(repositorio({ ...base, recuperarExcluida: async () => ({ id: 10, projetoAtivo: true, paiAtivo: false }) })).restaurar({ id: 10 }), BusinessException);
  assert.equal(restaurou, false);
  await criarServico(repositorio(base)).restaurar({ id: 10 });
  assert.equal(restaurou, true);
});

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

test('alterarTagsDemanda: demanda inexistente lança ResourceNotFoundException', async () => {
  const repo = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(repo, tagExistente).alterarTagsDemanda({ demandaId: 10, tagIds: [1] }, GESTOR), ResourceNotFoundException);
});

test('alterarTagsDemanda: gestor e administrador sincronizam as tags e recebem a lista atual', async () => {
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    const repo = repositorio();
    const resposta = await criarServico(repo, tagExistente).alterarTagsDemanda({ demandaId: 10, tagIds: [1, 2] }, usuario);
    assert.deepEqual(repo.gravacoes, [{ metodo: 'atribuirTagsDemanda', argumento: { demandaId: 10, tagIds: [1, 2] } }]);
    assert.equal(resposta.dados?.demandaId, 10);
    assert.deepEqual(resposta.dados?.tags.map((tag) => tag.id), [1]);
  }
});

test('alterarTagsDemanda: tag inexistente lança ResourceNotFoundException e nada é gravado', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo, { recuperar: async () => null }).alterarTagsDemanda({ demandaId: 10, tagIds: [404] }, GESTOR), ResourceNotFoundException);
  assert.equal(gravou(repo), false);
});

test('alterarTagsDemanda: desenvolvedor que NÃO é membro é recusado', async () => {
  const repo = repositorio({ validarMembro: async () => false });
  await assert.rejects(() => criarServico(repo, tagExistente).alterarTagsDemanda({ demandaId: 10, tagIds: [1] }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

// P-011: §14 diz "atribuir tag apenas em demandas das quais é membro" para o desenvolvedor; o código (e a decisão da task 170) recusa o desenvolvedor sempre.
test('alterarTagsDemanda: desenvolvedor membro da demanda atribui tags (§14)', { todo: 'P-011' }, async () => {
  const repo = repositorio({ validarMembro: async () => true });
  await criarServico(repo, tagExistente).alterarTagsDemanda({ demandaId: 10, tagIds: [1] }, DESENVOLVEDOR);
  assert.deepEqual(repo.gravacoes.map((g) => g.metodo), ['atribuirTagsDemanda']);
});

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------

test('atribuirMembro: gestor atribui qualquer usuário, sem exigir acesso ao projeto', async () => {
  const repo = repositorio({ validarMembro: async () => false, validarAcessoProjeto: async () => false });
  const resposta = await criarServico(repo, tagExistente, usuarioExistente).atribuirMembro({ demandaId: 10, usuarioId: 8 }, GESTOR);
  assert.deepEqual(repo.gravacoes, [{ metodo: 'atribuirMembroDemanda', argumento: { demandaId: 10, usuarioId: 8 } }]);
  assert.deepEqual([resposta.dados?.usuarioId, resposta.dados?.nomeUsuario], [8, 'Pessoa 8']);
});

test('atribuirMembro: desenvolvedor só inclui a si mesmo — outro usuário é recusado', async () => {
  const repo = repositorio({ validarMembro: async () => false });
  await assert.rejects(() => criarServico(repo, tagExistente, usuarioExistente).atribuirMembro({ demandaId: 10, usuarioId: 8 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(repo), false);
});

test('atribuirMembro: desenvolvedor se inclui em demanda de projeto acessível, e não em projeto inacessível', async () => {
  const comAcesso = repositorio({ validarMembro: async () => false });
  await criarServico(comAcesso, tagExistente, usuarioExistente).atribuirMembro({ demandaId: 10, usuarioId: 3 }, DESENVOLVEDOR);
  assert.deepEqual(comAcesso.gravacoes.map((g) => g.metodo), ['atribuirMembroDemanda']);

  const semAcesso = repositorio({ validarMembro: async () => false, validarAcessoProjeto: async () => false });
  await assert.rejects(() => criarServico(semAcesso, tagExistente, usuarioExistente).atribuirMembro({ demandaId: 10, usuarioId: 3 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(semAcesso), false);
});

test('atribuirMembro: demanda ou usuário inexistentes lançam 404 e quem já é membro é recusado', async () => {
  await assert.rejects(() => criarServico(repositorio({ recuperar: async () => null }), tagExistente, usuarioExistente).atribuirMembro({ demandaId: 10, usuarioId: 8 }, GESTOR), ResourceNotFoundException);
  await assert.rejects(() => criarServico(repositorio(), tagExistente, { recuperar: async () => null }).atribuirMembro({ demandaId: 10, usuarioId: 8 }, GESTOR), ResourceNotFoundException);
  const jaMembro = repositorio({ validarMembro: async () => true });
  await assert.rejects(() => criarServico(jaMembro, tagExistente, usuarioExistente).atribuirMembro({ demandaId: 10, usuarioId: 8 }, GESTOR), BusinessException);
  assert.equal(gravou(jaMembro), false);
});

test('removerMembro: gestor remove qualquer membro; desenvolvedor só a si mesmo', async () => {
  const gestor = repositorio();
  await criarServico(gestor).removerMembro({ demandaId: 10, usuarioId: 8 }, GESTOR);
  assert.deepEqual(gestor.gravacoes, [{ metodo: 'removerMembroDemanda', argumento: { demandaId: 10, usuarioId: 8 } }]);

  const proprio = repositorio();
  await criarServico(proprio).removerMembro({ demandaId: 10, usuarioId: 3 }, DESENVOLVEDOR);
  assert.equal(proprio.gravacoes.length, 1);

  const alheio = repositorio();
  await assert.rejects(() => criarServico(alheio).removerMembro({ demandaId: 10, usuarioId: 8 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(gravou(alheio), false);
});

test('removerMembro: o último membro não sai (nem para o gestor), com mensagem clara', async () => {
  const repo = repositorio({ contarMembrosDemanda: async () => 1 });
  for (const usuario of [GESTOR, DESENVOLVEDOR]) {
    await assert.rejects(() => criarServico(repo).removerMembro({ demandaId: 10, usuarioId: 3 }, usuario), (erro: BusinessException) => {
      assert.ok(erro instanceof BusinessException);
      assert.match(mensagem(erro), /último membro/);
      return true;
    });
  }
  assert.equal(gravou(repo), false);
});

test('removerMembro: demanda inexistente ou usuário que não é membro lançam ResourceNotFoundException', async () => {
  await assert.rejects(() => criarServico(repositorio({ recuperar: async () => null })).removerMembro({ demandaId: 10, usuarioId: 3 }, GESTOR), ResourceNotFoundException);
  await assert.rejects(() => criarServico(repositorio({ validarMembro: async () => false })).removerMembro({ demandaId: 10, usuarioId: 3 }, GESTOR), ResourceNotFoundException);
});

test('listarMembros e listarTagsDemanda devolvem o que o repository lista', async () => {
  const repo = repositorio({ listarMembrosDemanda: async () => [{ usuarioId: 3 }] });
  const servico = criarServico(repo);
  assert.deepEqual((await servico.listarMembros({ id: 10 }, GESTOR)).dados, [{ usuarioId: 3 }]);
  assert.deepEqual((await servico.listarTagsDemanda({ id: 10 }, GESTOR)).dados?.map((tag) => tag.id), [1]);
});
