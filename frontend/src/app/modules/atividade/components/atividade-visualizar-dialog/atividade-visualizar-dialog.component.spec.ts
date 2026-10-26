import { describe, it, expect } from 'vitest';
import { AtividadeResumoDto, TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { AtividadeVisualizarDialogComponent } from './atividade-visualizar-dialog.component';

// Dialog de visualização da atividade: qualquer um lê; gestor ou dono da atividade (o usuário de teste tem id 1) troca status, mexe nas
// tags e inicia/encerra a execução; só o gestor renomeia. O status não muda com execução em andamento.

type Montado = ComponenteMontado<AtividadeVisualizarDialogComponent>;

const PRIORIDADE = { codigo: TipoAtividadePrioridadeEnum.INDEFINIDA, descricao: 'Indefinida', ordem: 5, cor: '#999999' };
const TAGS = [{ id: 1, nome: 'Backend', cor: '#112233' }, { id: 2, nome: 'Frontend', cor: '#445566' }];

function atividade(sobrescrita: Record<string, unknown> = {}) {
  return {
    id: 5, demandaId: 10, nomeDemanda: 'Login', projetoId: 3, nomeProjeto: 'Portal', usuarioId: 1, nomeUsuario: 'Ana Souza', usuarioTipo: 'DESENVOLVEDOR',
    nome: 'Corrigir bug', status: TipoAtividadeStatusEnum.DESENVOLVENDO, prioridade: PRIORIDADE, posicaoAtividadeUsuario: 3, createdDate: '2026-01-01T00:00:00Z',
    ...sobrescrita,
  };
}

function resumo(sobrescrita: Partial<AtividadeResumoDto> = {}): AtividadeResumoDto {
  return {
    id: 5, nome: 'Corrigir bug', status: TipoAtividadeStatusEnum.DESENVOLVENDO, prioridade: PRIORIDADE, usuarioId: 1, nomeUsuario: 'Ana Souza',
    usuarioTipo: TipoUsuarioEnum.DESENVOLVEDOR, demandaId: 10, nomeDemanda: 'Login', demandaTemDescricaoCliente: false, demandaTemDescricaoTecnica: false,
    demandaTemDocumentacao: false, projetoId: 3, nomeProjeto: 'Portal', totalMinutosExecutados: 90, totalExecucoes: 2, execucaoAtivaId: null, execucaoAtivaDescricao: null, tags: [],
    createdDate: new Date('2026-01-01T00:00:00Z'), ...sobrescrita,
  };
}

const EXECUCOES = [
  { id: 1, atividadeId: 5, descricao: 'Corrigi o login', inicioData: '2026-06-10T12:00:00Z', fimData: '2026-06-10T13:30:00Z', duracaoMinutos: 90 },
  { id: 2, atividadeId: 5, descricao: 'Em curso', inicioData: '2026-06-11T12:00:00Z', fimData: null, duracaoMinutos: null },
];
const PAGINA = (itens: unknown[]) => ({ itens, totalItens: itens.length, paginaAtual: 1, itensPorPagina: 200, totalPaginas: 1 });

async function abrir(tipo: TipoUsuarioEnum, dadosAtividade: Record<string, unknown> = {}, resumoAtividade: AtividadeResumoDto | null = resumo(), execucoes: unknown[] = EXECUCOES, tags = [TAGS[0]]) {
  const montado = await montarComponente(AtividadeVisualizarDialogComponent, { usuario: tipo });
  const alteracoes: number[] = [];
  const alternancias: AtividadeResumoDto[] = [];
  montado.componente.aoAlterar.subscribe(() => alteracoes.push(1));
  montado.componente.alternarExecucao.subscribe((item) => alternancias.push(item));
  montado.componente.abrir(5, resumoAtividade);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade/5'), atividade(dadosAtividade));
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade/5/tag'), tags);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), PAGINA(execucoes));
  await montado.atualizar();
  return { montado, alteracoes, alternancias };
}

function texto(): string {
  return document.body.textContent ?? '';
}

function botoes(seletor: string): HTMLButtonElement[] {
  return Array.from(document.body.querySelectorAll<HTMLButtonElement>(seletor));
}

describe('AtividadeVisualizarDialogComponent — abrir', () => {
  it('carrega atividade, tags e execuções e mostra executor, posição, projeto, demanda e tempo total', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.carregandoVisualizar()).toBe(false);
    expect(texto()).toContain('Corrigir bug');
    expect(texto()).toContain('Ana Souza');
    expect(texto()).toContain('3ª atividade');
    expect(texto()).toContain('Portal · Login');
    expect(texto()).toContain('1h 30min no total');
    expect(document.body.querySelector('.atividade-visualizar-dialog__avatar')?.textContent?.trim()).toBe('AS');
  });

  it('a consulta de execuções pede as da atividade, até 200 por página', async () => {
    const montado = await montarComponente(AtividadeVisualizarDialogComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    montado.componente.abrir(5);
    expect(montado.componente.carregandoVisualizar()).toBe(true);
    const consulta = esperarRequisicao(montado.http, 'GET', '/execucao');
    expect(consulta.request.params.get('atividadeId')).toBe('5');
    expect(consulta.request.params.get('itensPorPagina')).toBe('200');
  });

  it('lista as execuções, com a em andamento sinalizada', async () => {
    await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    const itens = document.body.querySelectorAll('.atividade-visualizar-dialog__execucao-item');
    expect(itens).toHaveLength(2);
    expect(itens[0].textContent).toContain('Corrigi o login');
    expect(itens[0].textContent).toContain('1h 30min');
    expect(itens[1].textContent).toContain('em andamento');
  });

  it('sem execuções mostra o estado vazio', async () => {
    await abrir(TipoUsuarioEnum.DESENVOLVEDOR, {}, resumo(), []);
    expect(texto()).toContain('Nenhuma execução registrada.');
  });

  it('abre com os dados da atividade mesmo sem o resumo da listagem (só leitura: sem status editável nem execução)', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR, {}, null);
    expect(montado.componente.podeTrocarStatus()).toBe(false);
    expect(document.body.querySelector('.atividade-visualizar-dialog__status')).toBeNull();
    expect(texto()).not.toContain('Iniciar execução');
    expect(texto()).not.toContain('no total');
  });
});

describe('AtividadeVisualizarDialogComponent — permissão', () => {
  it('gestor edita qualquer atividade, mesmo a de outro usuário', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR, { usuarioId: 99 });
    expect(montado.componente.podeEditar()).toBe(true);
  });

  it('desenvolvedor dono da atividade edita', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, { usuarioId: 1 });
    expect(montado.componente.podeEditar()).toBe(true);
    expect(document.body.querySelector('.atividade-visualizar-dialog__status')).not.toBeNull();
  });

  it('desenvolvedor em atividade de outro só lê: sem seletor de status, sem botão de tags e sem execução', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, { usuarioId: 99 }, resumo({ usuarioId: 99 }));
    expect(montado.componente.podeEditar()).toBe(false);
    expect(document.body.querySelector('.atividade-visualizar-dialog__status')).toBeNull();
    expect(document.body.querySelector('.atividade-visualizar-dialog__tags--editavel')).toBeNull();
    expect(texto()).not.toContain('Iniciar execução');
    expect(texto()).toContain('Desenvolvendo');
    expect(texto()).toContain('Backend');
  });

  it('só o gestor vê o lápis de editar o nome', async () => {
    await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(document.body.querySelector('.atividade-visualizar-dialog__editar-nome')).toBeNull();
  });

  it('gestor vê o lápis de editar o nome', async () => {
    await abrir(TipoUsuarioEnum.GESTOR);
    expect(document.body.querySelector('.atividade-visualizar-dialog__editar-nome')).not.toBeNull();
  });
});

describe('AtividadeVisualizarDialogComponent — status', () => {
  it('trocar o status faz o PUT só com o status, atualiza o dialog e avisa a tela', async () => {
    const { montado, alteracoes } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.alterarStatus(TipoAtividadeStatusEnum.PENDENTE);
    expect(montado.componente.atividadeVisualizada()?.status).toBe(TipoAtividadeStatusEnum.PENDENTE);
    expect(montado.componente.resumo()?.status).toBe(TipoAtividadeStatusEnum.PENDENTE);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/5');
    expect(requisicao.request.body).toEqual({ status: 'PENDENTE' });
    responderSucesso(requisicao, { id: 5 });
    expect(alteracoes).toHaveLength(1);
  });

  it('clicar no botão de status da faixa troca o status', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    botoes('.atividade-visualizar-dialog__status-opcao').find((botao) => botao.textContent?.trim() === 'Desenvolvida')!.click();
    expect(esperarRequisicao(montado.http, 'PUT', '/atividade/5').request.body).toEqual({ status: 'DESENVOLVIDA' });
  });

  it('se a API recusar, o status volta ao anterior e a tela não é avisada', async () => {
    const { montado, alteracoes } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.alterarStatus(TipoAtividadeStatusEnum.PENDENTE);
    responderErro(esperarRequisicao(montado.http, 'PUT', '/atividade/5'), 400, 'Recusado');
    await montado.atualizar();
    expect(montado.componente.atividadeVisualizada()?.status).toBe(TipoAtividadeStatusEnum.DESENVOLVENDO);
    expect(montado.componente.resumo()?.status).toBe(TipoAtividadeStatusEnum.DESENVOLVENDO);
    expect(alteracoes).toEqual([]);
  });

  it('com execução em andamento o status não muda e o dialog mostra o selo fixo', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR, {}, resumo({ execucaoAtivaId: 70 }));
    expect(montado.componente.podeTrocarStatus()).toBe(false);
    montado.componente.alterarStatus(TipoAtividadeStatusEnum.PENDENTE);
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
    expect(document.body.querySelector('.atividade-visualizar-dialog__status')).toBeNull();
  });

  it('escolher o status que a atividade já tem não chama a API', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.alterarStatus(TipoAtividadeStatusEnum.DESENVOLVENDO);
    montado.componente.alterarStatus(null);
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });
});

describe('AtividadeVisualizarDialogComponent — execução', () => {
  it('sem execução ativa e em status executável mostra "Iniciar execução" habilitado; o clique pede à tela o dialog de execução', async () => {
    const { alternancias } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    const botao = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.p-dialog-footer button')).find((item) => item.textContent?.includes('Iniciar execução'))!;
    expect(botao.disabled).toBe(false);
    botao.click();
    expect(alternancias.map((item) => item.id)).toEqual([5]);
  });

  it('com execução ativa o botão vira "Encerrar execução" e continua habilitado em qualquer status', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR, { status: TipoAtividadeStatusEnum.PENDENTE }, resumo({ status: TipoAtividadeStatusEnum.PENDENTE, execucaoAtivaId: 70 }));
    expect(montado.componente.emExecucao()).toBe(true);
    const botao = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.p-dialog-footer button')).find((item) => item.textContent?.includes('Encerrar execução'))!;
    expect(botao.disabled).toBe(false);
  });

  it('em status que não permite iniciar (Pendente) o botão de iniciar fica desabilitado', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR, { status: TipoAtividadeStatusEnum.PENDENTE }, resumo({ status: TipoAtividadeStatusEnum.PENDENTE }));
    expect(montado.componente.podeIniciar()).toBe(false);
    const botao = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.p-dialog-footer button')).find((item) => item.textContent?.includes('Iniciar execução'))!;
    expect(botao.disabled).toBe(true);
  });

  it('sincronizar troca o resumo pelo da lista recarregada e recarrega as execuções', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.sincronizar([resumo({ id: 5, execucaoAtivaId: 71, totalMinutosExecutados: 120 })]);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), PAGINA([EXECUCOES[0]]));
    await montado.atualizar();
    expect(montado.componente.emExecucao()).toBe(true);
    expect(montado.componente.execucoesVisualizar()).toHaveLength(1);
  });

  it('sincronizar com o dialog fechado não faz nada', async () => {
    const montado = await montarComponente(AtividadeVisualizarDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
    montado.componente.sincronizar([resumo()]);
    montado.http.expectNone(() => true);
  });
});

describe('AtividadeVisualizarDialogComponent — tags', () => {
  it('quem edita abre o popover e as tags de todo o sistema são buscadas uma única vez', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    const alvo = document.createElement('button');
    document.body.appendChild(alvo);
    montado.componente.abrirTags(new MouseEvent('click'), alvo);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
    expect(montado.componente.todasAsTags()).toEqual(TAGS);
    montado.componente.abrirTags(new MouseEvent('click'), alvo);
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/tag'));
    alvo.remove();
  });

  it('quem só lê não abre o seletor de tags nem busca as tags do sistema', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, { usuarioId: 99 });
    montado.componente.abrirTags(new MouseEvent('click'), document.body);
    montado.http.expectNone(() => true);
  });

  it('salvar as tags faz o PUT, mostra as devolvidas pela API e avisa a tela', async () => {
    const { montado, alteracoes } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.salvarTags([1, 2]);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/5/tag');
    expect(requisicao.request.body).toEqual({ tagIds: [1, 2] });
    responderSucesso(requisicao, { atividadeId: 5, tags: TAGS });
    await montado.atualizar();
    expect(montado.componente.tagsVisualizar()).toEqual(TAGS);
    expect(alteracoes).toHaveLength(1);
  });

  it('sem tags a célula editável mostra o convite "Tag"', async () => {
    await abrir(TipoUsuarioEnum.DESENVOLVEDOR, {}, resumo(), EXECUCOES, []);
    expect(document.body.querySelector('.atividade-visualizar-dialog__chip-vazio')?.textContent).toContain('Tag');
  });
});

describe('AtividadeVisualizarDialogComponent — nome', () => {
  it('iniciar a edição preenche o formulário com o nome atual e cancelar sai sem salvar', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.iniciarEdicaoNome();
    await montado.atualizar();
    expect(montado.componente.editandoNome()).toBe(true);
    expect(montado.componente.formularioNome.controls.nome.value).toBe('Corrigir bug');
    montado.componente.cancelarEdicaoNome();
    expect(montado.componente.editandoNome()).toBe(false);
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('nome com menos de 3 caracteres ou com caractere proibido é inválido e não salva', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.iniciarEdicaoNome();
    const nome = montado.componente.formularioNome.controls.nome;
    nome.setValue('ab');
    expect(nome.hasError('minlength')).toBe(true);
    nome.setValue("Aspas ' proibida");
    expect(nome.hasError('pattern')).toBe(true);
    montado.componente.salvarNome();
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('salvar envia o nome sem espaços nas pontas, atualiza o título, sai da edição e avisa a tela', async () => {
    const { montado, alteracoes } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.iniciarEdicaoNome();
    montado.componente.formularioNome.controls.nome.setValue('  Novo nome  ');
    montado.componente.salvarNome();
    expect(montado.componente.salvandoNome()).toBe(true);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/5');
    expect(requisicao.request.body).toEqual({ nome: 'Novo nome' });
    responderSucesso(requisicao, { id: 5, nome: 'Novo nome' });
    await montado.atualizar();
    expect(montado.componente.atividadeVisualizada()?.nome).toBe('Novo nome');
    expect(montado.componente.editandoNome()).toBe(false);
    expect(montado.componente.salvandoNome()).toBe(false);
    expect(alteracoes).toHaveLength(1);
  });

  it('erro do backend mantém a edição aberta e libera o botão', async () => {
    const { montado, alteracoes } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.iniciarEdicaoNome();
    montado.componente.formularioNome.controls.nome.setValue('Nome válido');
    montado.componente.salvarNome();
    responderErro(esperarRequisicao(montado.http, 'PUT', '/atividade/5'), 400, 'Falhou');
    await montado.atualizar();
    expect(montado.componente.editandoNome()).toBe(true);
    expect(montado.componente.salvandoNome()).toBe(false);
    expect(alteracoes).toEqual([]);
  });
});
