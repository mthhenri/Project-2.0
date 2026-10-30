import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  AtividadeResumoDto,
  TipoAtividadePrioridadeEnum,
  TipoAtividadeStatusEnum,
  TipoUsuarioEnum,
} from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { AtividadeListagemPage } from './atividade-listagem.page';

type Montado = ComponenteMontado<AtividadeListagemPage>;

const PRIORIDADE = { codigo: TipoAtividadePrioridadeEnum.MEDIA, descricao: 'Média', ordem: 3, cor: '#ccaa00' };
const PADRAO = ['PLANEJADA', 'PENDENTE', 'DESENVOLVENDO'];

function criarAtividade(id: number, sobrescritas: Partial<AtividadeResumoDto> = {}): AtividadeResumoDto {
  return {
    id, nome: `Atividade ${id}`, status: TipoAtividadeStatusEnum.PLANEJADA, prioridade: PRIORIDADE,
    usuarioId: 1, nomeUsuario: 'Maria Souza', usuarioTipo: TipoUsuarioEnum.DESENVOLVEDOR,
    demandaId: 10, nomeDemanda: 'Demanda dez', demandaTemDescricaoCliente: false, demandaTemDescricaoTecnica: false, demandaTemDocumentacao: false,
    projetoId: 5, nomeProjeto: 'Portal', totalMinutosExecutados: 90, totalExecucoes: 2, execucaoAtivaId: null, execucaoAtivaDescricao: null,
    tags: [], createdDate: new Date('2026-02-01T12:00:00.000Z'), ...sobrescritas,
  };
}

const pagina = (itens: AtividadeResumoDto[], totalItens = itens.length) => ({ itens, totalItens, pagina: 1, itensPorPagina: 10 });

interface OpcoesPagina {
  usuario?: TipoUsuarioEnum;
  consulta?: Record<string, string>;
}

async function montarPagina({ usuario = TipoUsuarioEnum.GESTOR, consulta = {} }: OpcoesPagina = {}) {
  TestBed.resetTestingModule();
  const parametros = new BehaviorSubject(convertToParamMap(consulta));
  const rota = { snapshot: { queryParamMap: parametros.value }, queryParamMap: parametros.asObservable() };
  const montado = await montarComponente(AtividadeListagemPage, { usuario, provedores: [{ provide: ActivatedRoute, useValue: rota }] });
  const irPara = vi.fn().mockResolvedValue(true);
  (montado.fixture.debugElement.injector.get(Router) as unknown as { navigate: unknown }).navigate = irPara;
  return { montado, irPara, parametros };
}

/** Atende as leituras do boot (prioridades e usuários) e a primeira busca de atividades. */
async function carregar(montado: Montado, itens: AtividadeResumoDto[] = [], total = itens.length): Promise<void> {
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/atividade-prioridade'))) responderSucesso(requisicao, [PRIORIDADE]);
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/usuario'))) responderSucesso(requisicao, pagina([], 0));
  // Leituras de apoio dos dialogs filhos (demandas atribuídas, tags): nada que estes testes avaliem.
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && (r.url.endsWith('/demanda/atribuidas') || r.url.endsWith('/tag')))) responderSucesso(requisicao, []);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade'), pagina(itens, total));
  await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botoes = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('button'));
const botaoPorRotulo = (montado: Montado, rotulo: string) => botoes(montado).filter((botao) => botao.getAttribute('aria-label') === rotulo);

describe('AtividadeListagemPage: busca e filtros na URL', () => {
  it('sem filtros na URL, pede a primeira página com o padrão "em aberto" (sem desenvolvidas)', async () => {
    const { montado } = await montarPagina();
    const requisicao = esperarRequisicao(montado.http, 'GET', '/atividade');
    expect(requisicao.request.params.getAll('status')).toEqual(PADRAO);
    expect(requisicao.request.params.get('pagina')).toBe('1');
    expect(requisicao.request.params.get('itensPorPagina')).toBe('10');
    expect(requisicao.request.params.has('busca')).toBe(false);
    expect(montado.componente.primeiraCarga()).toBe(true);
  });

  it('os filtros da URL viram parâmetros da busca e são espelhados no formulário', async () => {
    const { montado } = await montarPagina({
      consulta: { busca: ' api ', status: 'DESENVOLVIDA', usuarioId: '3', demandaId: '10', periodo: '2026-01-01_2026-01-31' },
    });
    const requisicao = esperarRequisicao(montado.http, 'GET', '/atividade');
    expect(requisicao.request.params.getAll('status')).toEqual(['DESENVOLVIDA']);
    expect(requisicao.request.params.get('busca')).toBe('api');
    expect(requisicao.request.params.get('usuarioId')).toBe('3');
    expect(requisicao.request.params.get('demandaId')).toBe('10');
    expect(requisicao.request.params.get('dataInicio')).toBe('2026-01-01');
    expect(requisicao.request.params.get('dataFim')).toBe('2026-01-31');
    expect(montado.componente.formularioFiltros.value.busca).toBe('api');
    expect(montado.componente.filtrosAtivos()).toBe(5);
  });

  it('desenvolvedor não filtra por usuário: o parâmetro da URL é ignorado', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, consulta: { usuarioId: '3' } });
    expect(esperarRequisicao(montado.http, 'GET', '/atividade').request.params.has('usuarioId')).toBe(false);
    montado.http.expectNone((r) => r.url.endsWith('/usuario'));
  });

  it('mudar um filtro vai para a URL sem empilhar histórico; a busca em si é feita pela mudança da URL', async () => {
    const { montado, irPara, parametros } = await montarPagina();
    await carregar(montado);
    montado.componente.formularioFiltros.patchValue({ busca: 'login' }, { emitEvent: false });
    montado.componente.aoMudarFiltro();
    expect(irPara).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { busca: 'login' }, replaceUrl: true }));
    montado.http.expectNone((r) => r.url.endsWith('/atividade'));

    parametros.next(convertToParamMap({ busca: 'login' }));
    expect(esperarRequisicao(montado.http, 'GET', '/atividade').request.params.get('busca')).toBe('login');
  });

  it('"Limpar filtros" só aparece com filtro ativo e leva a URL de volta ao padrão', async () => {
    const { montado, irPara } = await montarPagina({ consulta: { busca: 'x' } });
    await carregar(montado);
    expect(texto(montado)).toContain('Limpar filtros (1)');
    montado.componente.limparFiltros();
    expect(irPara).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {} }));

    const padrao = await montarPagina();
    await carregar(padrao.montado);
    expect(texto(padrao.montado)).not.toContain('Limpar filtros (');
  });

  it('o gestor liga e desliga "Minhas atividades" pelo filtro de usuário; o desenvolvedor não tem o chip', async () => {
    const { montado, irPara } = await montarPagina();
    await carregar(montado);
    expect(texto(montado)).toContain('Minhas atividades');
    montado.componente.alternarMinhas();
    expect(irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { usuarioId: '1' } }));

    const ligado = await montarPagina({ consulta: { usuarioId: '1' } });
    await carregar(ligado.montado);
    expect(ligado.montado.componente.minhasAtivas()).toBe(true);
    ligado.montado.componente.alternarMinhas();
    expect(ligado.irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: {} }));

    const desenvolvedor = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(desenvolvedor.montado);
    expect(texto(desenvolvedor.montado)).not.toContain('Minhas atividades');
  });

  it('o chip de demanda mostra o nome da demanda da lista e o "✕" tira só esse filtro', async () => {
    const { montado, irPara } = await montarPagina({ consulta: { demandaId: '10', busca: 'x' } });
    await carregar(montado, [criarAtividade(1)]);
    expect(montado.componente.nomeDemandaFiltrada()).toBe('Demanda dez');
    expect(texto(montado)).toContain('Demanda: Demanda dez');
    montado.componente.removerFiltroDeDemanda();
    expect(irPara).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { busca: 'x' } }));
  });

  it('com a lista vazia, o nome da demanda do chip vem de uma consulta à demanda', async () => {
    const { montado } = await montarPagina({ consulta: { demandaId: '10' } });
    await carregar(montado, []);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), { id: 10, nome: 'Demanda consultada' });
    await montado.atualizar();
    expect(montado.componente.nomeDemandaFiltrada()).toBe('Demanda consultada');
  });

  it('mudar a página ou o tamanho refaz a busca; repetir os mesmos valores não', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1)], 40);
    montado.componente.aoCarregarTabela({ first: 0, rows: 10 });
    montado.http.expectNone((r) => r.url.endsWith('/atividade'));
    montado.componente.aoCarregarTabela({ first: 20, rows: 10 });
    const requisicao = esperarRequisicao(montado.http, 'GET', '/atividade');
    expect(requisicao.request.params.get('pagina')).toBe('3');
    expect(requisicao.request.params.get('itensPorPagina')).toBe('10');
  });
});

describe('AtividadeListagemPage: estados da tabela', () => {
  it('carregando: mostra o esqueleto na primeira carga e depois só a barra de recarga', async () => {
    const { montado } = await montarPagina();
    expect(montado.componente.primeiraCarga()).toBe(true);
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    await carregar(montado, [criarAtividade(1)]);
    expect(montado.componente.primeiraCarga()).toBe(false);
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();

    montado.componente.buscarAtividades();
    await montado.atualizar();
    expect(montado.componente.recarregando()).toBe(true);
    expect(montado.componente.primeiraCarga()).toBe(false);
    montado.http.expectOne((r) => r.url.endsWith('/atividade'));
  });

  it('vazio sem filtros convida a criar a primeira atividade', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, []);
    expect(texto(montado)).toContain('Ainda não há atividades em aberto');
    expect(texto(montado)).toContain('Nova Atividade');
  });

  it('vazio com filtros diz que nada bateu e oferece limpar os filtros', async () => {
    const { montado } = await montarPagina({ consulta: { busca: 'zzz' } });
    await carregar(montado, []);
    expect(texto(montado)).toContain('Nenhuma atividade com esses filtros');
    expect(texto(montado)).toContain('Limpar filtros');
  });

  it('cheio: uma linha por atividade com projeto, demanda, nome, status, prioridade e tempo', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1), criarAtividade(2, { nome: 'Outra tarefa', status: TipoAtividadeStatusEnum.DESENVOLVENDO })]);
    expect(montado.elemento.querySelectorAll('tbody tr').length).toBe(2);
    const conteudo = texto(montado);
    for (const esperado of ['Portal', 'Demanda dez', 'Atividade 1', 'Outra tarefa', 'Planejada', 'Desenvolvendo', 'Média']) {
      expect(conteudo).toContain(esperado);
    }
  });

  it('projeto, demanda e atividade ficam numa coluna só: o nome e, embaixo, "Projeto › Demanda" (P-055)', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1)]);
    const cabecalhos = Array.from(montado.elemento.querySelectorAll('th')).map((cabecalho) => cabecalho.textContent?.trim());
    expect(cabecalhos).toContain('Atividade');
    expect(cabecalhos).not.toContain('Projeto');
    expect(cabecalhos).not.toContain('Demanda');
    const celula = montado.elemento.querySelector('.atividade-listagem__atividade')!;
    expect(celula.querySelector('.atividade-listagem__atividade-nome')?.textContent).toBe('Atividade 1');
    expect(celula.querySelector('.atividade-listagem__demanda-nome')?.textContent).toBe('Portal › Demanda dez');
  });

  it('o gestor vê as colunas de seleção e de usuário; o desenvolvedor não', async () => {
    const gestor = await montarPagina();
    await carregar(gestor.montado, [criarAtividade(1)]);
    expect(texto(gestor.montado)).toContain('Usuário');
    expect(gestor.montado.elemento.querySelector('p-tablecheckbox')).not.toBeNull();

    const desenvolvedor = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(desenvolvedor.montado, [criarAtividade(1)]);
    expect(desenvolvedor.montado.elemento.querySelector('p-tablecheckbox')).toBeNull();
    expect(desenvolvedor.montado.elemento.querySelector('th.atividade-listagem__coluna-selecao')).toBeNull();
  });

  it('erro ao listar: o carregamento termina e a lista fica vazia', async () => {
    const { montado } = await montarPagina();
    for (const requisicao of montado.http.match((r) => r.url.endsWith('/atividade-prioridade') || r.url.endsWith('/usuario'))) responderSucesso(requisicao, []);
    responderErro(esperarRequisicao(montado.http, 'GET', '/atividade'), 500, 'falhou');
    await montado.atualizar();
    expect(montado.componente.carregando()).toBe(false);
    expect(montado.componente.atividades()).toEqual([]);
  });
});

describe('AtividadeListagemPage: seleção e barra em massa', () => {
  it('selecionar mostra a barra com a contagem; limpar a esconde', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1), criarAtividade(2)];
    await carregar(montado, itens);
    expect(montado.elemento.querySelector('app-atividade-barra-em-massa')).toBeNull();

    montado.componente.aoSelecionar(itens);
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-atividade-barra-em-massa')?.textContent).toContain('2 selecionadas');

    montado.componente.limparSelecao();
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-atividade-barra-em-massa')).toBeNull();
  });

  it('marcar a caixa da linha seleciona a atividade', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1)]);
    const caixa = montado.elemento.querySelector('tbody p-tablecheckbox input[type="checkbox"]') as HTMLInputElement;
    caixa.click();
    await montado.atualizar();
    expect(montado.componente.quantidadeSelecionada()).toBe(1);
    expect(montado.elemento.querySelector('app-atividade-barra-em-massa')).not.toBeNull();
  });

  it('mudar a URL (filtro novo) limpa a seleção', async () => {
    const { montado, parametros } = await montarPagina();
    const itens = [criarAtividade(1)];
    await carregar(montado, itens);
    montado.componente.aoSelecionar(itens);
    parametros.next(convertToParamMap({ busca: 'x' }));
    expect(montado.componente.quantidadeSelecionada()).toBe(0);
    esperarRequisicao(montado.http, 'GET', '/atividade');
  });

  it('mudar o status em massa altera só as que ainda não estão nele e recarrega a lista', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1), criarAtividade(2, { status: TipoAtividadeStatusEnum.DESENVOLVENDO })];
    await carregar(montado, itens);
    montado.componente.aoSelecionar(itens);
    montado.componente.mudarStatusEmMassa(TipoAtividadeStatusEnum.DESENVOLVENDO);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/1');
    expect(requisicao.request.body).toEqual({ status: 'DESENVOLVENDO' });
    montado.http.expectNone((r) => r.method === 'PUT' && r.url.endsWith('/atividade/2'));
    responderSucesso(requisicao, {});
    await montado.atualizar();
    esperarRequisicao(montado.http, 'GET', '/atividade');
    expect(montado.componente.executandoEmMassa()).toBe(false);
  });

  it('mudar o status para o que todas já têm só avisa, sem chamar a API', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1)];
    await carregar(montado, itens);
    const avisos: string[] = [];
    montado.mensagens.add = ((mensagem: { detail: string }) => avisos.push(mensagem.detail)) as never;
    montado.componente.aoSelecionar(itens);
    montado.componente.mudarStatusEmMassa(TipoAtividadeStatusEnum.PLANEJADA);
    expect(avisos).toEqual(['As selecionadas já estão com esse status']);
    montado.http.expectNone((r) => r.method === 'PUT');
  });

  it('acrescentar tags em massa envia a união com as tags que cada atividade já tem', async () => {
    const { montado } = await montarPagina();
    const tagA = { id: 1, nome: 'A', cor: '#111111' };
    const itens = [criarAtividade(1, { tags: [tagA] }), criarAtividade(2)];
    await carregar(montado, itens);
    montado.componente.aoSelecionar(itens);
    montado.componente.acrescentarTagsEmMassa([1, 2]);
    expect(esperarRequisicao(montado.http, 'PUT', '/atividade/1/tag').request.body).toEqual({ tagIds: [1, 2] });
    expect(esperarRequisicao(montado.http, 'PUT', '/atividade/2/tag').request.body).toEqual({ tagIds: [1, 2] });
  });

  it('acrescentar tags que todas já têm só avisa', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1, { tags: [{ id: 1, nome: 'A', cor: '#111111' }] })];
    await carregar(montado, itens);
    const avisos: string[] = [];
    montado.mensagens.add = ((mensagem: { detail: string }) => avisos.push(mensagem.detail)) as never;
    montado.componente.aoSelecionar(itens);
    montado.componente.acrescentarTagsEmMassa([1]);
    expect(avisos).toEqual(['As selecionadas já têm essas tags']);
    montado.http.expectNone((r) => r.method === 'PUT');
  });

  it('uma falha em massa não derruba as demais: o resumo conta quantas deram certo e quantas foram recusadas', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1), criarAtividade(2)];
    await carregar(montado, itens);
    const avisos: Array<{ severity: string; detail: string }> = [];
    montado.mensagens.add = ((mensagem: { severity: string; detail: string }) => avisos.push(mensagem)) as never;
    montado.componente.aoSelecionar(itens);
    montado.componente.mudarStatusEmMassa(TipoAtividadeStatusEnum.DESENVOLVIDA);
    responderSucesso(esperarRequisicao(montado.http, 'PUT', '/atividade/1'), {});
    responderErro(esperarRequisicao(montado.http, 'PUT', '/atividade/2'), 400, 'em execução');
    await montado.atualizar();
    expect(avisos.some((aviso) => aviso.severity === 'warn' && aviso.detail.startsWith('1 ok, 1 não puderam'))).toBe(true);
  });

  it('excluir em massa apaga todas as selecionadas, limpa a seleção, recarrega e oferece desfazer', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1), criarAtividade(2)];
    await carregar(montado, itens);
    montado.componente.aoSelecionar(itens);
    montado.componente.excluirEmMassa();
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/atividade/1'), null);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/atividade/2'), null);
    await montado.atualizar();
    expect(montado.componente.quantidadeSelecionada()).toBe(0);
    esperarRequisicao(montado.http, 'GET', '/atividade');
  });

  it('excluir em massa sem seleção não chama a API', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1)]);
    montado.componente.excluirEmMassa();
    montado.http.expectNone((r) => r.method === 'DELETE');
  });
});

describe('AtividadeListagemPage: menu ⋮ e permissões da linha', () => {
  it('o botão ⋮ só aparece para o gestor, um por linha', async () => {
    const gestor = await montarPagina();
    await carregar(gestor.montado, [criarAtividade(1), criarAtividade(2, { usuarioId: 9 })]);
    expect(botaoPorRotulo(gestor.montado, 'Mais ações').length).toBe(2);

    const desenvolvedor = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(desenvolvedor.montado, [criarAtividade(1)]);
    expect(botaoPorRotulo(desenvolvedor.montado, 'Mais ações').length).toBe(0);
  });

  it('o menu traz só "Registrar execução" e "Excluir" (tags se editam na célula)', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1)]);
    botaoPorRotulo(montado, 'Mais ações')[0].click();
    await montado.atualizar();
    const rotulos = montado.componente.itensMenu.filter((item) => !item.separator).map((item) => item.label);
    expect(rotulos).toEqual(['Registrar execução', 'Excluir']);
    expect(rotulos).not.toContain('Atribuir tags');
  });

  it('"Excluir" do menu tira a linha na hora e chama a exclusão da atividade', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1), criarAtividade(2)], 2);
    botaoPorRotulo(montado, 'Mais ações')[0].click();
    montado.componente.itensMenu.find((item) => item.label === 'Excluir')!.command!({} as never);
    expect(montado.componente.atividades().map((atividade) => atividade.id)).toEqual([2]);
    expect(montado.componente.totalRegistros()).toBe(1);
    expect(esperarRequisicao(montado.http, 'DELETE', '/atividade/1')).toBeTruthy();
  });

  it('se a exclusão falha, a linha volta e o total é restaurado', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1), criarAtividade(2)], 2);
    montado.componente.excluir(montado.componente.atividades()[0]);
    responderErro(esperarRequisicao(montado.http, 'DELETE', '/atividade/1'), 400, 'não pode');
    expect(montado.componente.atividades().map((atividade) => atividade.id)).toEqual([1, 2]);
    expect(montado.componente.totalRegistros()).toBe(2);
  });

  it('"Registrar execução" do menu abre o dialog de registro daquela atividade', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1)]);
    botaoPorRotulo(montado, 'Mais ações')[0].click();
    const registro = (montado.componente as unknown as { registroDialog: () => { abrir(a: AtividadeResumoDto): void } }).registroDialog();
    const abrir = vi.spyOn(registro, 'abrir').mockImplementation(() => undefined);
    montado.componente.itensMenu.find((item) => item.label === 'Registrar execução')!.command!({} as never);
    expect(abrir).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('as tags só são editadas na célula por quem pode editar a atividade (gestor, ou desenvolvedor dono)', async () => {
    const itens = [criarAtividade(1), criarAtividade(2, { usuarioId: 9 })];
    const desenvolvedor = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(desenvolvedor.montado, itens);
    expect(desenvolvedor.montado.elemento.querySelector('#atividade-tags-1')).not.toBeNull();
    expect(desenvolvedor.montado.elemento.querySelector('#atividade-tags-2')).toBeNull();

    const gestor = await montarPagina();
    await carregar(gestor.montado, itens);
    expect(gestor.montado.elemento.querySelector('#atividade-tags-1')).not.toBeNull();
    expect(gestor.montado.elemento.querySelector('#atividade-tags-2')).not.toBeNull();
  });

  it('abrir as tags da linha de outro usuário não faz nada para o desenvolvedor', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    const alheia = criarAtividade(2, { usuarioId: 9 });
    await carregar(montado, [alheia]);
    montado.componente.abrirTagsDaLinha(new Event('click'), alheia, document.createElement('div'));
    expect(montado.componente.atividadeTags()).toBeNull();
    montado.http.expectNone((r) => r.url.endsWith('/tag'));
  });

  it('abrir as tags da própria linha carrega as tags uma vez e salvar troca o conjunto da atividade', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    const propria = criarAtividade(1);
    await carregar(montado, [propria]);
    montado.componente.abrirTagsDaLinha(new Event('click'), propria, document.createElement('div'));
    const tags = [{ id: 7, nome: 'Bug', cor: '#ff0000' }];
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), tags);
    await montado.atualizar();
    expect(montado.componente.todasAsTags()).toEqual(tags);

    montado.componente.salvarTagsDaLinha([7]);
    expect(montado.componente.atividades()[0].tags).toEqual(tags);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/1/tag');
    expect(requisicao.request.body).toEqual({ tagIds: [7] });
    responderErro(requisicao, 400, 'recusado');
    expect(montado.componente.atividades()[0].tags).toEqual([]);
  });

  it('o desenvolvedor só troca status e prioridade das próprias atividades; status trava durante a execução', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(montado, [criarAtividade(1), criarAtividade(2, { usuarioId: 9 }), criarAtividade(3, { execucaoAtivaId: 4 })]);
    const [propria, alheia, emExecucao] = montado.componente.atividades();
    expect(montado.componente.podeEditar(propria)).toBe(true);
    expect(montado.componente.podeEditar(alheia)).toBe(false);
    expect(montado.componente.podeTrocarStatus(propria)).toBe(true);
    expect(montado.componente.podeTrocarStatus(emExecucao)).toBe(false);
    expect(montado.elemento.querySelectorAll('button[aria-label="Iniciar execução"]').length).toBe(1);
  });

  it('trocar o status é otimista e volta ao anterior quando a API recusa', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1)];
    await carregar(montado, itens);
    const popover = { hide: vi.fn(), toggle: vi.fn() } as never;
    montado.componente.abrirSeletorStatus(new Event('click'), itens[0], popover);
    montado.componente.alterarStatus(TipoAtividadeStatusEnum.DESENVOLVENDO, popover);
    expect(montado.componente.atividades()[0].status).toBe(TipoAtividadeStatusEnum.DESENVOLVENDO);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/1');
    expect(requisicao.request.body).toEqual({ status: 'DESENVOLVENDO' });
    responderErro(requisicao, 400, 'recusado');
    expect(montado.componente.atividades()[0].status).toBe(TipoAtividadeStatusEnum.PLANEJADA);
  });

  it('recarrega a lista com os filtros atuais depois de alterar o status', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1)];
    await carregar(montado, itens);
    const popover = { hide: vi.fn(), toggle: vi.fn() } as never;
    montado.componente.abrirSeletorStatus(new Event('click'), itens[0], popover);
    montado.componente.alterarStatus(TipoAtividadeStatusEnum.DESENVOLVIDA, popover);
    responderSucesso(esperarRequisicao(montado.http, 'PUT', '/atividade/1'), {});
    const lista = esperarRequisicao(montado.http, 'GET', '/atividade');
    expect(lista.request.params.getAll('status')).toBeTruthy();
    responderSucesso(lista, { itens: [], totalItens: 0 });
    expect(montado.componente.atividades()).toEqual([]);
  });
  it('trocar a prioridade é otimista e envia o código novo; escolher a mesma não chama a API', async () => {
    const { montado } = await montarPagina();
    const itens = [criarAtividade(1)];
    await carregar(montado, itens);
    const popover = { hide: vi.fn(), toggle: vi.fn() } as never;
    montado.componente.abrirSeletorPrioridade(new Event('click'), itens[0], popover);
    montado.componente.alterarPrioridade(PRIORIDADE, popover);
    montado.http.expectNone((r) => r.method === 'PUT');

    const alta = { ...PRIORIDADE, codigo: TipoAtividadePrioridadeEnum.ALTA, descricao: 'Alta', ordem: 2 };
    montado.componente.alterarPrioridade(alta, popover);
    expect(montado.componente.atividades()[0].prioridade.codigo).toBe('ALTA');
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/1');
    expect(requisicao.request.body).toEqual({ prioridade: 'ALTA' });
    responderErro(requisicao, 400, 'recusado');
    expect(montado.componente.atividades()[0].prioridade.codigo).toBe('MEDIA');
  });
});

describe('AtividadeListagemPage: play e pausa pela linha', () => {
  it('o play fica apagado fora de Planejada e Desenvolvendo, com o motivo; a pausa fica sempre livre', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1, { status: TipoAtividadeStatusEnum.PENDENTE }), criarAtividade(2, { execucaoAtivaId: 8 })]);
    const [pendente, ativa] = montado.componente.atividades();
    expect(montado.componente.podeIniciarExecucao(pendente)).toBe(false);
    expect(montado.componente.motivoPlayIndisponivel(pendente)).toBe('Mude o status para Planejada ou Desenvolvendo');
    expect(montado.componente.motivoPlayIndisponivel(ativa)).toBe('');
    const play = montado.elemento.querySelector('button[aria-label="Iniciar execução"]') as HTMLButtonElement;
    const pausa = montado.elemento.querySelector('button[aria-label="Encerrar execução"]') as HTMLButtonElement;
    expect(play.disabled).toBe(true);
    expect(pausa.disabled).toBe(false);
  });

  it('iniciar: a descrição é obrigatória para o dono desenvolvedor e opcional para o dono gestor', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarAtividade(1), criarAtividade(2, { usuarioTipo: TipoUsuarioEnum.GESTOR })]);
    const [doDesenvolvedor, doGestor] = montado.componente.atividades();
    montado.componente.alternarExecucao(doDesenvolvedor);
    expect(montado.componente.modoExecucao()).toBe('iniciar');
    expect(montado.componente.descricaoExecucaoOpcional()).toBe(false);
    expect(montado.componente.formularioExecucao.valid).toBe(false);
    montado.componente.alternarExecucao(doGestor);
    expect(montado.componente.descricaoExecucaoOpcional()).toBe(true);
    expect(montado.componente.formularioExecucao.valid).toBe(true);
  });

  it('confirmar sem descrição obrigatória não chama a API', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(montado, [criarAtividade(1)]);
    montado.componente.alternarExecucao(montado.componente.atividades()[0]);
    montado.componente.confirmarExecucao();
    montado.http.expectNone((r) => r.method === 'POST' && r.url.endsWith('/execucao'));
    expect(montado.componente.campoInvalidoExecucao('descricao')).toBe(true);
  });

  it('confirmar o início envia atividade e descrição, fecha o dialog e recarrega a lista', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(montado, [criarAtividade(1)]);
    montado.componente.alternarExecucao(montado.componente.atividades()[0]);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([], 0));
    montado.componente.formularioExecucao.patchValue({ descricao: '  Ajustar login  ' });
    montado.componente.confirmarExecucao();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/execucao');
    expect(requisicao.request.body).toEqual({ atividadeId: 1, descricao: 'Ajustar login' });
    responderSucesso(requisicao, {});
    await montado.atualizar();
    expect(montado.componente.mostrarDialogExecucao()).toBe(false);
    esperarRequisicao(montado.http, 'GET', '/atividade');
  });

  it('pausar abre o dialog de encerrar com a descrição da execução ativa e encerra pelo id da execução', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(montado, [criarAtividade(1, { execucaoAtivaId: 8, execucaoAtivaDescricao: 'Em andamento' })]);
    (montado.elemento.querySelector('button[aria-label="Encerrar execução"]') as HTMLButtonElement).click();
    await montado.atualizar();
    expect(montado.componente.modoExecucao()).toBe('encerrar');
    expect(montado.componente.formularioExecucao.value.descricao).toBe('Em andamento');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([], 0));
    montado.componente.confirmarExecucao();
    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/execucao/8/encerrar');
    expect(requisicao.request.body).toEqual({ descricao: 'Em andamento' });
  });

  it('"Usar" copia a descrição de uma execução anterior para o campo', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(montado, [criarAtividade(1)]);
    montado.componente.usarDescricaoExecucao('Retomar migração');
    expect(montado.componente.formularioExecucao.value.descricao).toBe('Retomar migração');
    expect(montado.componente.formularioExecucao.controls.descricao.dirty).toBe(true);
  });

  it('o cronômetro da linha só vale para a execução do próprio usuário', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(montado, [criarAtividade(1, { execucaoAtivaId: 8 }), criarAtividade(2, { execucaoAtivaId: 9, usuarioId: 9 })]);
    const [propria, alheia] = montado.componente.atividades();
    (montado.componente as unknown as { execucaoAtiva: { definir(e: unknown): void } }).execucaoAtiva.definir({ id: 8, atividadeId: 1, inicioData: '2026-02-01T10:00:00.000Z' });
    expect(montado.componente.inicioDaExecucaoPropria(propria)).toEqual(new Date('2026-02-01T10:00:00.000Z'));
    expect(montado.componente.inicioDaExecucaoPropria(alheia)).toBeNull();
  });
});

describe('AtividadeListagemPage: descrições da demanda', () => {
  it('abre o conteúdo da demanda, guarda em cache e só deixa editar quem pode editar a demanda', async () => {
    const { montado } = await montarPagina();
    const atividade = criarAtividade(1, { demandaTemDescricaoTecnica: true });
    await carregar(montado, [atividade]);
    montado.componente.abrirDescricaoDemanda(atividade, 'descricaoTecnica');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), { id: 10, nome: 'Demanda dez', descricaoTecnica: '# Texto', podeEditar: true });
    expect(montado.componente.conteudoDescricao()).toBe('# Texto');
    expect(montado.componente.cabecalhoDescricao()).toBe('Demanda dez — Descrição técnica');
    expect(montado.componente.podeEditarCampoDescricao()).toBe(true);

    montado.componente.abrirDescricaoDemanda(atividade, 'descricaoCliente');
    montado.http.expectNone((r) => r.url.endsWith('/demanda/10'));
    expect(montado.componente.podeEditarCampoDescricao()).toBe(false);
  });

  it('sem permissão na demanda, o campo editável não pode ser salvo', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    const atividade = criarAtividade(1);
    await carregar(montado, [atividade]);
    montado.componente.abrirDescricaoDemanda(atividade, 'documentacao');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), { id: 10, nome: 'Demanda dez', documentacao: 'x', podeEditar: false });
    expect(montado.componente.podeEditarCampoDescricao()).toBe(false);
    montado.componente.salvarDescricaoDemanda();
    montado.http.expectNone((r) => r.method === 'PUT');
  });
});

describe('AtividadeListagemPage: alterar prioridades (task 204)', () => {
  it('o administrador vê "Alterar prioridades" e o botão abre o dialog das cores', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.ADMINISTRADOR });
    await carregar(montado, []);
    const botao = botoes(montado).find((candidato) => candidato.textContent?.includes('Alterar prioridades'));
    expect(botao).toBeDefined();

    botao!.click();
    await montado.atualizar();
    for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/atividade-prioridade'))) responderSucesso(requisicao, [PRIORIDADE]);
    await montado.atualizar();
    expect(document.body.querySelector('.p-dialog')?.textContent).toContain('Alterar prioridades');
    expect(document.body.querySelector('[aria-label="Código da cor da prioridade Média"]')).not.toBeNull();
  });

  it('gestor e desenvolvedor não veem o botão (só o administrador troca as cores)', async () => {
    for (const usuario of [TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.DESENVOLVEDOR]) {
      const { montado } = await montarPagina({ usuario });
      await carregar(montado, []);
      expect(texto(montado), usuario).not.toContain('Alterar prioridades');
    }
  });
});
