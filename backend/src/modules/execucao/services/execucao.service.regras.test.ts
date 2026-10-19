import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CronJob } from 'cron';
import { TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { ExecucaoService } from './execucao.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

// Regras de execução (SYSTEM.SPEC.md §12–§14), sem banco: os repositories são dublês que registram o que foi gravado.
// Quem pode registrar e excluir é o `@GestorOnly` do controller (execucao.controller.test.ts); a service só valida o dado.

const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 2, login: 'a', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const DESENVOLVEDOR = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

type Dublê = Record<string, unknown>;

const ATIVIDADE = { id: 10, usuarioId: 3, status: TipoAtividadeStatusEnum.PLANEJADA };
const EXECUCAO_ABERTA = { id: 50, atividadeId: 10, descricao: 'provisória', inicioData: new Date('2026-01-15T12:00:00Z'), fimData: null };
const EXECUCAO_ENCERRADA = { ...EXECUCAO_ABERTA, fimData: new Date('2026-01-15T13:00:00Z') };

function criarServico(repositorio: Dublê, atividades: Dublê = { recuperar: async () => ATIVIDADE }): ExecucaoService {
  const servico = Object.create(ExecucaoService.prototype) as Record<string, unknown>;
  servico.execucaoRepositorio = repositorio;
  servico.atividadeRepositorio = atividades;
  return servico as unknown as ExecucaoService;
}

/** Repository com valores padrão felizes (dono desenvolvedor, nenhuma ativa) e um registro das escritas. */
function repositorio(sobrescrita: Dublê = {}) {
  const gravacoes: Array<{ metodo: string; argumento: any }> = [];
  const escrever = (metodo: string, retorno: unknown) => async (argumento: unknown) => { gravacoes.push({ metodo, argumento }); return retorno; };
  return {
    gravacoes,
    recuperar: async () => EXECUCAO_ABERTA,
    recuperarAtiva: async () => null,
    recuperarUsuario: async () => 3,
    recuperarTipoUsuarioDaAtividade: async () => TipoUsuarioEnum.DESENVOLVEDOR,
    validarSobreposicao: async () => false,
    listar: async () => ({ itens: [], total: 0, totalMinutosDia: 0 }),
    inserir: escrever('inserir', EXECUCAO_ABERTA),
    registrar: escrever('registrar', EXECUCAO_ENCERRADA),
    encerrar: escrever('encerrar', EXECUCAO_ENCERRADA),
    alterar: escrever('alterar', EXECUCAO_ENCERRADA),
    excluir: escrever('excluir', undefined),
    encerrarTodasAbertas: escrever('encerrarTodasAbertas', []),
    ...sobrescrita,
  };
}

/** Valida que a exceção é uma BusinessException cuja mensagem (no corpo da resposta) casa com o padrão. */
const recusa = (padrao: RegExp) => (erro: unknown) =>
  erro instanceof BusinessException && padrao.test((erro.getResponse() as { mensagem: string }).mensagem);

const naoGravou = (repo: ReturnType<typeof repositorio>) => assert.equal(repo.gravacoes.length, 0, 'nada deve ser gravado');

// ---------------------------------------------------------------------------
// iniciar
// ---------------------------------------------------------------------------

test('iniciar: atividade inexistente é 404 e nada é gravado', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo, { recuperar: async () => null }).iniciar({ atividadeId: 10, descricao: 'x' }, GESTOR), ResourceNotFoundException);
  naoGravou(repo);
});

test('iniciar: só atividade planejada ou em desenvolvimento aceita execução', async () => {
  for (const status of Object.values(TipoAtividadeStatusEnum)) {
    const repo = repositorio();
    const servico = criarServico(repo, { recuperar: async () => ({ ...ATIVIDADE, status }) });
    const executavel = ExecucaoService.STATUS_EXECUTAVEL.includes(status);
    if (executavel) {
      await servico.iniciar({ atividadeId: 10, descricao: 'trabalho' }, DESENVOLVEDOR);
      assert.equal(repo.gravacoes[0].metodo, 'inserir', status);
    } else {
      await assert.rejects(() => servico.iniciar({ atividadeId: 10, descricao: 'trabalho' }, DESENVOLVEDOR), BusinessException, status);
      naoGravou(repo);
    }
  }
});

test('iniciar: desenvolvedor só inicia atividade própria; a de outro é recusada sem gravar', async () => {
  const repo = repositorio();
  const atividadeAlheia = { recuperar: async () => ({ ...ATIVIDADE, usuarioId: 99 }) };
  await assert.rejects(() => criarServico(repo, atividadeAlheia).iniciar({ atividadeId: 10, descricao: 'x' }, DESENVOLVEDOR), UnauthorizedAccessException);
  naoGravou(repo);
});

test('iniciar: gestor e administrador iniciam a atividade de qualquer um, sem consultar demanda_usuario', async () => {
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    const repo = repositorio();
    // O dublê da atividade não tem `validarAcessoDemanda`: se a service o chamasse, o teste quebraria.
    const servico = criarServico(repo, { recuperar: async () => ({ ...ATIVIDADE, usuarioId: 99 }) });
    await servico.iniciar({ atividadeId: 10, descricao: 'x' }, usuario);
    assert.equal(repo.gravacoes[0].metodo, 'inserir');
  }
});

test('iniciar: a trava de uma execução ativa olha o DONO da atividade, não quem dispara', async () => {
  const consultados: number[] = [];
  const repo = repositorio({ recuperarAtiva: async ({ usuarioId }: { usuarioId: number }) => { consultados.push(usuarioId); return usuarioId === 99 ? EXECUCAO_ABERTA : null; } });
  const servico = criarServico(repo, { recuperar: async () => ({ ...ATIVIDADE, usuarioId: 99 }) });
  await assert.rejects(() => servico.iniciar({ atividadeId: 10, descricao: 'x' }, GESTOR), recusa(/usuário desta atividade já tem uma execução/));
  assert.deepEqual(consultados, [99]);
  naoGravou(repo);
});

test('iniciar: a execução ativa do gestor não impede iniciar a atividade de outro usuário', async () => {
  const repo = repositorio({ recuperarAtiva: async ({ usuarioId }: { usuarioId: number }) => (usuarioId === 1 ? EXECUCAO_ABERTA : null) });
  const servico = criarServico(repo, { recuperar: async () => ({ ...ATIVIDADE, usuarioId: 99 }) });
  await servico.iniciar({ atividadeId: 10, descricao: 'x' }, GESTOR);
  assert.equal(repo.gravacoes[0].metodo, 'inserir');
});

test('iniciar: quem já tem execução ativa na própria atividade recebe a mensagem em primeira pessoa e nada é gravado', async () => {
  const repo = repositorio({ recuperarAtiva: async () => EXECUCAO_ABERTA });
  await assert.rejects(() => criarServico(repo).iniciar({ atividadeId: 10, descricao: 'x' }, DESENVOLVEDOR), recusa(/Você já tem uma execução em andamento/));
  naoGravou(repo);
});

test('iniciar: descrição é obrigatória quando o dono é desenvolvedor, inclusive só com espaços', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo).iniciar({ atividadeId: 10, descricao: '   ' }, DESENVOLVEDOR), recusa(/descrição é obrigatória/));
  await assert.rejects(() => criarServico(repo).iniciar({ atividadeId: 10 } as never, DESENVOLVEDOR), recusa(/descrição é obrigatória/));
  naoGravou(repo);
});

test('iniciar: dono gestor ou administrador pode iniciar sem descrição; dono sem tipo conhecido exige', async () => {
  for (const tipo of [TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR]) {
    const repo = repositorio({ recuperarTipoUsuarioDaAtividade: async () => tipo });
    await criarServico(repo).iniciar({ atividadeId: 10, descricao: '' }, GESTOR);
    assert.equal(repo.gravacoes[0].argumento.descricao, '');
  }
  const semTipo = repositorio({ recuperarTipoUsuarioDaAtividade: async () => null });
  await assert.rejects(() => criarServico(semTipo).iniciar({ atividadeId: 10, descricao: '' }, GESTOR), recusa(/descrição é obrigatória/));
});

test('iniciar: grava a descrição aparada e o início agora, sem fim', async () => {
  const repo = repositorio();
  const antes = Date.now();
  await criarServico(repo).iniciar({ atividadeId: 10, descricao: '  ajustar login  ' }, DESENVOLVEDOR);
  const { argumento } = repo.gravacoes[0];
  assert.equal(argumento.descricao, 'ajustar login');
  assert.equal(argumento.atividadeId, 10);
  assert.ok(argumento.inicioData.getTime() >= antes && argumento.inicioData.getTime() <= Date.now());
  assert.equal('fimData' in argumento, false);
});

// ---------------------------------------------------------------------------
// registrar (manual, só gestor pelo controller)
// ---------------------------------------------------------------------------

const REGISTRO = { atividadeId: 10, descricao: 'feito', inicioData: new Date('2026-01-15T12:00:00Z'), fimData: new Date('2026-01-15T13:00:00Z') } as never;

test('registrar: atividade inexistente é 404', async () => {
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo, { recuperar: async () => null }).registrar(REGISTRO, GESTOR), ResourceNotFoundException);
  naoGravou(repo);
});

test('registrar: início ou fim no futuro é recusado', async () => {
  const futuro = new Date(Date.now() + 3_600_000);
  const muitoFuturo = new Date(Date.now() + 7_200_000);
  const repo = repositorio();
  await assert.rejects(() => criarServico(repo).registrar({ ...(REGISTRO as object), inicioData: futuro, fimData: muitoFuturo } as never, GESTOR), recusa(/início não pode estar no futuro/));
  await assert.rejects(() => criarServico(repo).registrar({ ...(REGISTRO as object), fimData: futuro } as never, GESTOR), recusa(/fim não pode estar no futuro/));
  naoGravou(repo);
});

test('registrar: fim igual ou anterior ao início é recusado', async () => {
  const repo = repositorio();
  const mesmoInstante = { ...(REGISTRO as object), fimData: new Date('2026-01-15T12:00:00Z') } as never;
  const invertido = { ...(REGISTRO as object), fimData: new Date('2026-01-15T11:00:00Z') } as never;
  for (const dto of [mesmoInstante, invertido]) {
    await assert.rejects(() => criarServico(repo).registrar(dto, GESTOR), recusa(/fim deve ser posterior/));
  }
  naoGravou(repo);
});

test('registrar: a sobreposição é conferida para o DONO da atividade e recusa sem gravar', async () => {
  const conferidos: any[] = [];
  const repo = repositorio({ validarSobreposicao: async (dto: unknown) => { conferidos.push(dto); return true; } });
  const servico = criarServico(repo, { recuperar: async () => ({ ...ATIVIDADE, usuarioId: 99 }) });
  await assert.rejects(() => servico.registrar(REGISTRO, GESTOR), recusa(/se sobrepõe/));
  assert.equal(conferidos[0].usuarioId, 99);
  naoGravou(repo);
});

test('registrar: sem problemas, grava a execução já encerrada com os instantes recebidos', async () => {
  const repo = repositorio();
  const resposta = await criarServico(repo).registrar(REGISTRO, GESTOR);
  assert.equal(resposta.sucesso, true);
  assert.equal(repo.gravacoes[0].metodo, 'registrar');
  assert.deepEqual(repo.gravacoes[0].argumento, {
    atividadeId: 10, descricao: 'feito', inicioData: new Date('2026-01-15T12:00:00Z'), fimData: new Date('2026-01-15T13:00:00Z'),
  });
});

// ---------------------------------------------------------------------------
// encerrar
// ---------------------------------------------------------------------------

test('encerrar: execução inexistente é 404 e já encerrada é recusada', async () => {
  const inexistente = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(inexistente).encerrar({ id: 50, descricao: 'x' }, DESENVOLVEDOR), ResourceNotFoundException);
  const encerrada = repositorio({ recuperar: async () => EXECUCAO_ENCERRADA });
  await assert.rejects(() => criarServico(encerrada).encerrar({ id: 50, descricao: 'x' }, GESTOR), recusa(/já foi encerrada/));
  naoGravou(inexistente);
  naoGravou(encerrada);
});

test('encerrar: desenvolvedor encerra só a própria; gestor e administrador encerram a de qualquer um', async () => {
  const alheia = repositorio({ recuperarUsuario: async () => 99 });
  await assert.rejects(() => criarServico(alheia).encerrar({ id: 50, descricao: 'x' }, DESENVOLVEDOR), UnauthorizedAccessException);
  naoGravou(alheia);
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    const repo = repositorio({ recuperarUsuario: async () => 99 });
    await criarServico(repo).encerrar({ id: 50, descricao: 'feito' }, usuario);
    assert.equal(repo.gravacoes[0].metodo, 'encerrar');
  }
});

test('encerrar: descrição obrigatória quando o dono é desenvolvedor; opcional quando é gestor', async () => {
  const exigida = repositorio();
  await assert.rejects(() => criarServico(exigida).encerrar({ id: 50, descricao: '  ' }, DESENVOLVEDOR), recusa(/descrição é obrigatória/));
  naoGravou(exigida);
  const opcional = repositorio({ recuperarTipoUsuarioDaAtividade: async () => TipoUsuarioEnum.GESTOR });
  await criarServico(opcional).encerrar({ id: 50, descricao: '' }, GESTOR);
  assert.equal(opcional.gravacoes[0].argumento.descricao, '');
});

test('encerrar: o fim é agora e a descrição vai aparada', async () => {
  const repo = repositorio();
  const antes = Date.now();
  await criarServico(repo).encerrar({ id: 50, descricao: '  pronto  ' }, DESENVOLVEDOR);
  const { argumento } = repo.gravacoes[0];
  assert.equal(argumento.id, 50);
  assert.equal(argumento.descricao, 'pronto');
  assert.ok(argumento.fimData.getTime() >= antes && argumento.fimData.getTime() <= Date.now());
});

// ---------------------------------------------------------------------------
// alterar
// ---------------------------------------------------------------------------

test('alterar: inexistente é 404; desenvolvedor só edita a própria; gestor edita a de outros (§14)', async () => {
  await assert.rejects(() => criarServico(repositorio({ recuperar: async () => null })).alterar({ id: 50, descricao: 'x' }, GESTOR), ResourceNotFoundException);
  const alheia = repositorio({ recuperarUsuario: async () => 99 });
  await assert.rejects(() => criarServico(alheia).alterar({ id: 50, descricao: 'x' }, DESENVOLVEDOR), UnauthorizedAccessException);
  naoGravou(alheia);
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    const repo = repositorio({ recuperarUsuario: async () => 99 });
    await criarServico(repo).alterar({ id: 50, descricao: 'x' }, usuario);
    assert.equal(repo.gravacoes[0].metodo, 'alterar');
  }
});

test('alterar: sem início ou fim no pedido, mantém os da execução; fimData null reabre a execução', async () => {
  const mantem = repositorio({ recuperar: async () => EXECUCAO_ENCERRADA });
  await criarServico(mantem).alterar({ id: 50, descricao: 'novo texto' }, DESENVOLVEDOR);
  assert.deepEqual(mantem.gravacoes[0].argumento, { id: 50, descricao: 'novo texto', inicioData: EXECUCAO_ENCERRADA.inicioData, fimData: EXECUCAO_ENCERRADA.fimData });

  const reabre = repositorio({ recuperar: async () => EXECUCAO_ENCERRADA });
  await criarServico(reabre).alterar({ id: 50, descricao: 'x', fimData: null } as never, DESENVOLVEDOR);
  assert.equal(reabre.gravacoes[0].argumento.fimData, null);
});

test('alterar: início ou fim no futuro e fim não posterior ao início são recusados sem gravar', async () => {
  const futuro = new Date(Date.now() + 3_600_000).toISOString();
  const casos: Array<[Dublê, RegExp]> = [
    [{ inicioData: futuro }, /início não pode estar no futuro/],
    [{ fimData: futuro }, /fim não pode estar no futuro/],
    [{ inicioData: '2026-01-15T14:00:00Z', fimData: '2026-01-15T13:00:00Z' }, /fim deve ser posterior/],
    [{ inicioData: '2026-01-15T13:00:00Z', fimData: '2026-01-15T13:00:00Z' }, /fim deve ser posterior/],
  ];
  for (const [dados, mensagem] of casos) {
    const repo = repositorio();
    await assert.rejects(() => criarServico(repo).alterar({ id: 50, descricao: 'x', ...dados } as never, GESTOR), recusa(mensagem));
    naoGravou(repo);
  }
});

test('alterar: execução em andamento aceita início passado e continua sem fim', async () => {
  const repo = repositorio();
  await criarServico(repo).alterar({ id: 50, descricao: 'x', inicioData: '2026-01-15T11:00:00Z' } as never, DESENVOLVEDOR);
  assert.equal(repo.gravacoes[0].argumento.fimData, null);
  assert.deepEqual(repo.gravacoes[0].argumento.inicioData, new Date('2026-01-15T11:00:00Z'));
});

// ---------------------------------------------------------------------------
// recuperar, listar, ativa
// ---------------------------------------------------------------------------

test('recuperar: inexistente é 404; desenvolvedor só vê a própria; gestor vê qualquer uma', async () => {
  await assert.rejects(() => criarServico(repositorio({ recuperar: async () => null })).recuperar({ id: 50 }, GESTOR), ResourceNotFoundException);
  await assert.rejects(() => criarServico(repositorio({ recuperarUsuario: async () => 99 })).recuperar({ id: 50 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal((await criarServico(repositorio({ recuperarUsuario: async () => 99 })).recuperar({ id: 50 }, GESTOR)).dados, EXECUCAO_ABERTA);
  assert.equal((await criarServico(repositorio()).recuperar({ id: 50 }, DESENVOLVEDOR)).dados, EXECUCAO_ABERTA);
});

test('listar: o desenvolvedor é restrito a si mesmo, mesmo pedindo outro usuário; o gestor vê todos', async () => {
  const restricoes: unknown[] = [];
  const repo = repositorio({ listar: async (_f: unknown, restricao: unknown) => { restricoes.push(restricao); return { itens: [], total: 0, totalMinutosDia: 0 }; } });
  await criarServico(repo).listar({ usuarioId: 99 }, DESENVOLVEDOR);
  await criarServico(repo).listar({ usuarioId: 99 }, GESTOR);
  await criarServico(repo).listar({}, ADMINISTRADOR);
  assert.deepEqual(restricoes, [{ usuarioId: 3 }, undefined, undefined]);
});

test('listar: paginação padrão (página 1, 20 por página) e total de páginas arredondado para cima', async () => {
  const repo = repositorio({ listar: async () => ({ itens: [{}], total: 41, totalMinutosDia: 90 }) });
  const { dados } = await criarServico(repo).listar({}, GESTOR);
  assert.deepEqual(dados, { itens: [{}], totalItens: 41, paginaAtual: 1, itensPorPagina: 20, totalPaginas: 3, totalMinutosDia: 90 });
  const outra = await criarServico(repo).listar({ pagina: 2, itensPorPagina: 10 }, GESTOR);
  assert.equal(outra.dados!.paginaAtual, 2);
  assert.equal(outra.dados!.totalPaginas, 5);
});

test('listar: allRows devolve tudo numa página só', async () => {
  const repo = repositorio({ listar: async () => ({ itens: [{}, {}, {}], total: 3, totalMinutosDia: 10 }) });
  const { dados } = await criarServico(repo).listar({ allRows: true, pagina: 4 }, GESTOR);
  assert.deepEqual(dados, { itens: [{}, {}, {}], totalItens: 3, paginaAtual: 1, itensPorPagina: 3, totalPaginas: 1, totalMinutosDia: 10 });
});

test('recuperarAtiva: lê a do usuário do token; sem execução responde null com a mensagem própria', async () => {
  const consultados: number[] = [];
  const repo = repositorio({ recuperarAtiva: async ({ usuarioId }: { usuarioId: number }) => { consultados.push(usuarioId); return null; } });
  const resposta = await criarServico(repo).recuperarAtiva(DESENVOLVEDOR);
  assert.deepEqual(consultados, [3]);
  assert.equal(resposta.dados, null);
  assert.equal(resposta.mensagem, 'Nenhuma execução ativa');
});

test('recuperarAtivaDoUsuario: o desenvolvedor lê só a própria; gestor e administrador leem a de qualquer um', async () => {
  const repo = repositorio({ recuperarAtiva: async () => EXECUCAO_ABERTA });
  await assert.rejects(() => criarServico(repo).recuperarAtivaDoUsuario({ usuarioId: 99 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal((await criarServico(repo).recuperarAtivaDoUsuario({ usuarioId: 3 }, DESENVOLVEDOR)).dados, EXECUCAO_ABERTA);
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    assert.equal((await criarServico(repo).recuperarAtivaDoUsuario({ usuarioId: 99 }, usuario)).dados, EXECUCAO_ABERTA);
  }
});

test('listarUltimaPorAtividade: só gestor e administrador consultam', async () => {
  const repo = repositorio({ listarUltimaPorAtividade: async () => [] });
  await assert.rejects(() => criarServico(repo).listarUltimaPorAtividade({ atividadeIds: [1] }, DESENVOLVEDOR), UnauthorizedAccessException);
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    assert.deepEqual((await criarServico(repo).listarUltimaPorAtividade({ atividadeIds: [1] }, usuario)).dados, []);
  }
});

test('existeSobreposicao repassa o pedido ao repository, inclusive a execução a ignorar', async () => {
  const recebidos: unknown[] = [];
  const repo = repositorio({ validarSobreposicao: async (dto: unknown) => { recebidos.push(dto); return true; } });
  const dto = { usuarioId: 3, inicioData: new Date('2026-01-15T12:00:00Z'), fimData: new Date('2026-01-15T13:00:00Z'), ignorarExecucaoId: 50 };
  assert.equal(await criarServico(repo).existeSobreposicao(dto), true);
  assert.deepEqual(recebidos, [dto]);
});

// ---------------------------------------------------------------------------
// excluir (rota @GestorOnly)
// ---------------------------------------------------------------------------

test('excluir: inexistente é 404 e existente é soft delete pelo id', async () => {
  const inexistente = repositorio({ recuperar: async () => null });
  await assert.rejects(() => criarServico(inexistente).excluir({ id: 50 }, GESTOR), ResourceNotFoundException);
  naoGravou(inexistente);
  const repo = repositorio();
  await criarServico(repo).excluir({ id: 50 }, GESTOR);
  assert.deepEqual(repo.gravacoes, [{ metodo: 'excluir', argumento: { id: 50 } }]);
});

// ---------------------------------------------------------------------------
// auto-stop da virada do dia
// ---------------------------------------------------------------------------

test('encerrarExecucoesAbertas: encerra todas as abertas pelo repository', async () => {
  const repo = repositorio({ encerrarTodasAbertas: async () => [EXECUCAO_ENCERRADA, EXECUCAO_ENCERRADA] });
  const servico = criarServico(repo);
  (servico as unknown as Dublê).logger = { log: () => undefined, error: () => undefined };
  await servico.encerrarExecucoesAbertas();
});

test('encerrarExecucoesAbertas: falha do repository é logada e não derruba o job', async () => {
  const erros: unknown[] = [];
  const repo = repositorio({ encerrarTodasAbertas: async () => { throw new Error('banco fora'); } });
  const servico = criarServico(repo);
  (servico as unknown as Dublê).logger = { log: () => undefined, error: (...args: unknown[]) => erros.push(args) };
  await assert.doesNotReject(() => servico.encerrarExecucoesAbertas());
  assert.equal(erros.length, 1);
});

test('onModuleInit registra o job às 23:59:59 no fuso APP_TIMEZONE, seja ele qual for', () => {
  for (const fusoHorario of ['America/Sao_Paulo', 'Asia/Tokyo']) {
    const registrados: Array<{ nome: string; job: CronJob }> = [];
    const servico = criarServico(repositorio());
    Object.assign(servico, {
      configService: { obter: () => ({ aplicacao: { fusoHorario } }) },
      schedulerRegistry: { addCronJob: (nome: string, job: CronJob) => registrados.push({ nome, job }) },
    });
    servico.onModuleInit();
    try {
      assert.equal(registrados.length, 1);
      assert.equal(registrados[0].nome, 'execucao-auto-stop-virada-dia');
      assert.equal(registrados[0].job.nextDate().setZone(fusoHorario).toFormat('HH:mm:ss'), '23:59:59', fusoHorario);
    } finally {
      registrados[0].job.stop();
    }
  }
});
