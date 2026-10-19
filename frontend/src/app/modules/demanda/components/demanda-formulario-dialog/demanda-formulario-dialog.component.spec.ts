import { describe, it, expect } from 'vitest';
import { ConfirmationService } from 'primeng/api';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DemandaFormularioDialogComponent } from './demanda-formulario-dialog.component';

// Formulário de demanda (SYSTEM.SPEC.md §14): o gestor também escolhe tags e membros; o desenvolvedor só cria sub-demanda (pai preenchido
// pela árvore) e nunca manda tags nem membros. Estrutural não tem estimativa nem previsão próprias.

type Montado = ComponenteMontado<DemandaFormularioDialogComponent>;

const TAGS = [{ id: 1, nome: 'Backend', cor: '#112233' }, { id: 2, nome: 'Frontend', cor: '#445566' }];
const USUARIOS = [
  { id: 2, nomeCompleto: 'Ana', login: 'ana', cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: 'ATIVO' },
  { id: 3, nomeCompleto: 'Gestora', login: 'g', cargoTitulo: 'Gestora', tipo: TipoUsuarioEnum.GESTOR, status: 'ATIVO' },
];
const PAIS = [{ id: 5, nome: 'Estrutura', caminho: 'Estrutura', isEstrutural: true, status: 'PLANEJADA', horasEstimadas: 0 }];
const PAGINA = (itens: unknown[]) => ({ itens, totalItens: itens.length, paginaAtual: 1, itensPorPagina: 200, totalPaginas: 1 });

async function abrir(tipo: TipoUsuarioEnum, entradas: Record<string, unknown> = {}): Promise<{ montado: Montado; criadas: unknown[]; alteradas: number[]; visibilidade: boolean[] }> {
  const montado = await montarComponente(DemandaFormularioDialogComponent, { usuario: tipo, entradas: { projetoId: 7, visivel: true, ...entradas } });
  const criadas: unknown[] = [];
  const alteradas: number[] = [];
  const visibilidade: boolean[] = [];
  montado.componente.demandaCriada.subscribe((demanda) => criadas.push(demanda));
  montado.componente.demandaAlterada.subscribe(() => alteradas.push(1));
  montado.componente.visivelChange.subscribe((valor) => visibilidade.push(valor));
  return { montado, criadas, alteradas, visibilidade };
}

/** Responde às leituras que o formulário faz ao abrir (tags e usuários só para o gestor). */
async function responderAbertura(montado: Montado, gestor: boolean): Promise<void> {
  if (gestor) {
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario'), PAGINA(USUARIOS));
  }
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda'), PAGINA(PAIS));
  await montado.atualizar();
}

describe('DemandaFormularioDialogComponent — abrir', () => {
  it('gestor: carrega tags, usuários (sem gestores) e as demandas estruturais candidatas a pai', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    const consultaPais = esperarRequisicao(montado.http, 'GET', '/demanda');
    expect(consultaPais.request.params.get('isEstrutural')).toBe('true');
    expect(consultaPais.request.params.get('projetoId')).toBe('7');
    consultaPais.flush({ sucesso: true, dados: PAGINA(PAIS), mensagem: '' });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario'), PAGINA(USUARIOS));
    await montado.atualizar();

    expect(montado.componente.todasAsTags()).toHaveLength(2);
    expect(montado.componente.usuariosDisponiveis().map((usuario) => usuario.id)).toEqual([2]);
    expect(montado.componente.demandasPaiOpcoes().map((demanda) => demanda.id)).toEqual([5]);
  });

  it('desenvolvedor: só pede as demandas candidatas a pai (nada de tags nem usuários, que são do gestor)', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, { demandaPaiIdInicial: 5 });
    await responderAbertura(montado, false);
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/tag') || requisicao.url.endsWith('/usuario'));
    expect(montado.componente.formulario.controls.demandaPaiId.value).toBe(5);
  });

  it('abre limpo: status Planejada, não estrutural, estimativa zero', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    await responderAbertura(montado, true);
    expect(montado.componente.formulario.getRawValue()).toMatchObject({ nome: '', status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, horasEstimadas: 0, tagIds: [], usuarioIds: [] });
    expect(montado.componente.eEdicao()).toBe(false);
  });
});

describe('DemandaFormularioDialogComponent — criar', () => {
  it('nome é obrigatório e não aceita caractere proibido; horas não podem ser negativas', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    await responderAbertura(montado, true);
    const controles = montado.componente.formulario.controls;
    expect(controles.nome.hasError('required')).toBe(true);
    controles.nome.setValue("Aspas ' proibida");
    expect(controles.nome.hasError('pattern')).toBe(true);
    controles.nome.setValue('Ação – válida');
    expect(controles.nome.valid).toBe(true);
    controles.horasEstimadas.setValue(-1);
    expect(controles.horasEstimadas.hasError('min')).toBe(true);
  });

  it('formulário inválido não chama a API', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    await responderAbertura(montado, true);
    montado.componente.salvar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(montado.componente.campoInvalido('nome')).toBe(true);
  });

  it('gestor envia o corpo com tags e membros escolhidos, fecha e emite a demanda criada', async () => {
    const { montado, criadas, visibilidade } = await abrir(TipoUsuarioEnum.GESTOR);
    await responderAbertura(montado, true);
    montado.componente.formulario.patchValue({ nome: '  Nova demanda  ', horasEstimadas: 6, previsaoFimData: new Date(2026, 5, 30), tagIds: [1], usuarioIds: [2] });
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/demanda');
    expect(requisicao.request.body).toEqual({
      projetoId: 7, nome: 'Nova demanda', status: 'PLANEJADA', isEstrutural: false, horasEstimadas: 6, previsaoFimData: '2026-06-30', tagIds: [1], usuarioIds: [2],
    });
    responderSucesso(requisicao, { id: 40, projetoId: 7, nome: 'Nova demanda' }, 201);
    await montado.atualizar();
    expect(criadas).toHaveLength(1);
    expect(visibilidade).toEqual([false]);
  });

  it('desenvolvedor cria sub-demanda: o pai vai no corpo e tags e membros NUNCA vão, mesmo que o formulário os tenha', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, { demandaPaiIdInicial: 5 });
    await responderAbertura(montado, false);
    montado.componente.formulario.patchValue({ nome: 'Sub', tagIds: [1], usuarioIds: [2] });
    montado.componente.salvar();
    const corpo = esperarRequisicao(montado.http, 'POST', '/demanda').request.body;
    expect(corpo.demandaPaiId).toBe(5);
    expect('tagIds' in corpo).toBe(false);
    expect('usuarioIds' in corpo).toBe(false);
  });

  it('estrutural zera a estimativa e a previsão (agregam os filhos) e esconde os campos', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    await responderAbertura(montado, true);
    montado.componente.formulario.patchValue({ nome: 'Estrutura', isEstrutural: true, horasEstimadas: 40, previsaoFimData: new Date(2026, 5, 30) });
    expect(montado.componente.ocultaEstimativa).toBe(true);
    montado.componente.salvar();
    const corpo = esperarRequisicao(montado.http, 'POST', '/demanda').request.body;
    expect(corpo.horasEstimadas).toBe(0);
    expect('previsaoFimData' in corpo && corpo.previsaoFimData !== undefined).toBe(false);
    expect(corpo.isEstrutural).toBe(true);
  });

  it('em modo dias, o valor digitado é convertido em horas antes de enviar (1 dia = 8 h)', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    await responderAbertura(montado, true);
    montado.componente.unidadeTempo.definir(true);
    montado.componente.formulario.patchValue({ nome: 'Em dias', horasEstimadas: 2 });
    montado.componente.salvar();
    expect(esperarRequisicao(montado.http, 'POST', '/demanda').request.body.horasEstimadas).toBe(16);
  });

  it('"criar outra" mantém o dialog aberto, limpa o nome e preserva o pai e o status', async () => {
    const { montado, criadas, visibilidade } = await abrir(TipoUsuarioEnum.GESTOR, { demandaPaiIdInicial: 5 });
    await responderAbertura(montado, true);
    montado.componente.formulario.patchValue({ nome: 'Primeira', status: TipoDemandaStatusEnum.PENDENTE });
    montado.componente.salvar(true);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/demanda'), { id: 41, projetoId: 7, nome: 'Primeira' }, 201);
    await montado.atualizar();
    expect(criadas).toHaveLength(1);
    expect(visibilidade).toEqual([]);
    expect(montado.componente.formulario.controls.nome.value).toBe('');
    expect(montado.componente.formulario.controls.demandaPaiId.value).toBe(5);
    expect(montado.componente.formulario.controls.status.value).toBe(TipoDemandaStatusEnum.PENDENTE);
  });

  it('erro do backend: o dialog continua aberto, nada é emitido e o botão volta a ficar livre', async () => {
    const { montado, criadas, visibilidade } = await abrir(TipoUsuarioEnum.GESTOR);
    await responderAbertura(montado, true);
    montado.componente.formulario.patchValue({ nome: 'Falha' });
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/demanda'), 400, 'A demanda pai deve pertencer ao mesmo projeto');
    await montado.atualizar();
    expect(criadas).toEqual([]);
    expect(visibilidade).toEqual([]);
    expect(montado.componente.carregando()).toBe(false);
  });
});

describe('DemandaFormularioDialogComponent — editar', () => {
  const DEMANDA = {
    id: 10, projetoId: 7, demandaPaiId: 5, nome: 'Existente', status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 8, previsaoFimData: '2026-06-30',
    descricaoTecnica: null, descricaoCliente: null, documentacao: null, createdDate: '2026-01-01T00:00:00Z', podeEditar: true,
  };

  async function abrirEdicao(tipo: TipoUsuarioEnum) {
    const contexto = await abrir(tipo, { demandaId: 10, projetoId: 0 });
    const { montado } = contexto;
    const gestor = tipo === TipoUsuarioEnum.GESTOR;
    if (gestor) {
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/v1/tag'), TAGS);
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/v1/usuario'), PAGINA(USUARIOS));
    }
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), DEMANDA);
    if (gestor) {
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10/tag'), [TAGS[0]]);
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10/membro'), [{ usuarioId: 2, nomeCompleto: 'Ana', login: 'ana', tipo: 'DESENVOLVEDOR', cargoTitulo: 'Dev' }]);
    }
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/v1/demanda'), PAGINA([...PAIS, { ...PAIS[0], id: 10, nome: 'Ela mesma' }]));
    await montado.atualizar();
    return contexto;
  }

  it('carrega a demanda no formulário e tira a própria demanda das candidatas a pai', async () => {
    const { montado } = await abrirEdicao(TipoUsuarioEnum.GESTOR);
    expect(montado.componente.eEdicao()).toBe(true);
    expect(montado.componente.projetoId).toBe(7);
    expect(montado.componente.formulario.getRawValue()).toMatchObject({ nome: 'Existente', demandaPaiId: 5, horasEstimadas: 8, tagIds: [1], usuarioIds: [2] });
    expect(montado.componente.demandasPaiOpcoes().map((demanda) => demanda.id)).toEqual([5]);
  });

  it('gestor salva só o que mudou em tags (PUT) e membros (POST/DELETE individuais) depois do PUT da demanda', async () => {
    const { montado } = await abrirEdicao(TipoUsuarioEnum.GESTOR);
    montado.componente.formulario.patchValue({ nome: 'Renomeada', tagIds: [2], usuarioIds: [] });
    montado.componente.salvar();
    const alteracao = esperarRequisicao(montado.http, 'PUT', '/demanda/10');
    expect(alteracao.request.body).toMatchObject({ nome: 'Renomeada', demandaPaiId: 5, isEstrutural: false, horasEstimadas: 8 });
    responderSucesso(alteracao, DEMANDA);
    await montado.atualizar();
    expect(esperarRequisicao(montado.http, 'PUT', '/demanda/10/tag').request.body).toEqual({ tagIds: [2] });
    esperarRequisicao(montado.http, 'DELETE', '/demanda/10/membro/2');
  });

  it('desenvolvedor salva só a demanda: nenhuma chamada de tags nem de membros', async () => {
    const { montado, alteradas } = await abrirEdicao(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.formulario.patchValue({ nome: 'Ajuste' });
    montado.componente.salvar();
    responderSucesso(esperarRequisicao(montado.http, 'PUT', '/demanda/10'), DEMANDA);
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/tag') || requisicao.url.endsWith('/membro'));
    expect(alteradas).toHaveLength(1);
  });

  it('estrutural na edição não manda estimativa nem previsão (os valores existentes ficam como estão)', async () => {
    const { montado } = await abrirEdicao(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.formulario.patchValue({ isEstrutural: true });
    montado.componente.salvar();
    const corpo = esperarRequisicao(montado.http, 'PUT', '/demanda/10').request.body;
    expect('horasEstimadas' in corpo).toBe(false);
    expect('previsaoFimData' in corpo).toBe(false);
    expect(corpo.isEstrutural).toBe(true);
  });
});

describe('DemandaFormularioDialogComponent — fechar', () => {
  it('sem nada preenchido fecha direto; com nome digitado pede confirmação antes de descartar', async () => {
    const { montado, visibilidade } = await abrir(TipoUsuarioEnum.GESTOR);
    await responderAbertura(montado, true);
    const confirmacoes: Array<{ accept?: () => void }> = [];
    montado.fixture.debugElement.injector.get(ConfirmationService).requireConfirmation$.subscribe((confirmacao) => confirmacoes.push(confirmacao as { accept?: () => void }));

    montado.componente.fechar();
    expect(visibilidade).toEqual([false]);

    montado.componente.formulario.patchValue({ nome: 'Rascunho' });
    montado.componente.fechar();
    expect(visibilidade).toEqual([false]);
    expect(confirmacoes).toHaveLength(1);
    confirmacoes[0].accept?.();
    expect(visibilidade).toEqual([false, false]);
  });
});
