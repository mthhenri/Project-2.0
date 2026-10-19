import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ExecucaoItemDto, PontoDiaResumoDto, PontoDiarioDto, PontoMensalDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { dataParaIso } from '../../../execucao/utils/execucao.util';
import { PontoPage } from './ponto.page';

type Montado = ComponenteMontado<PontoPage>;

// O cronômetro da execução aberta usa setInterval, que deixaria a zona instável: só os intervalos são falsos.
afterEach(() => vi.useRealTimers());

const texto = (elemento: Element) => (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();

const execucao = (id: number, aberta = false) => ({
  id, atividadeId: 40 + id, nomeAtividade: `Atividade ${id}`, inicioData: new Date(2026, 2, 2, 9, 0),
  fimData: aberta ? null : new Date(2026, 2, 2, 10, 0), duracaoMinutos: aberta ? null : 60,
}) as unknown as ExecucaoItemDto;

const pontoDiario = (usuarioId: number, nomeUsuario: string, execucoes: ExecucaoItemDto[] = []): PontoDiarioDto => ({
  data: dataParaIso(new Date()), usuarioId, nomeUsuario, ehDiaUtil: true, motivoNaoUtil: null, metaMinutos: 480,
  minutosTrabalhadosDiaUtil: 60, minutosTrabalhadosExtra: 0, totalMinutosTrabalhados: execucoes.length * 60,
  saldoMinutos: -420, intervalos: [], execucoes,
});

/** Mês corrente com um dia no passado (ou hoje) com saldo e outro com trabalho, para o "saldo até hoje". */
function mensalDoMesAtual(usuarioId = 1): PontoMensalDto {
  const agora = new Date();
  const dia = (numero: number, saldoMinutos: number): PontoDiaResumoDto => ({
    data: dataParaIso(new Date(agora.getFullYear(), agora.getMonth(), numero)), ehDiaUtil: true, motivoNaoUtil: null,
    primeiroInicioData: null, ultimoFimData: null, totalMinutosTrabalhados: 0, saldoMinutos, metaMinutos: 480,
    intervalos: [], justificativaNome: null, justificativaMinutosCobertos: null,
  }) as PontoDiaResumoDto;
  const dias = [dia(1, -100)];
  if (agora.getDate() > 1) dias.push(dia(agora.getDate(), 30));
  return {
    usuarioId, nomeUsuario: 'Maria Souza', ano: agora.getFullYear(), mes: agora.getMonth() + 1, diasUteisMes: 21,
    metaMinutosMes: 10080, totalMinutosTrabalhadosMes: 3000, saldoMinutosMes: -7080, dias,
  };
}

async function montarPagina(usuario: TipoUsuarioEnum): Promise<Montado> {
  TestBed.resetTestingModule();
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  return montarComponente(PontoPage, { usuario });
}

/** Atende as leituras de apoio dos filhos (dialog de atividade e de justificativa) que não importam para a página. */
function responderApoio(montado: Montado): void {
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && (r.url.endsWith('/usuario') || r.url.endsWith('/demanda/atribuidas') || r.url.endsWith('/tag')))) {
    responderSucesso(requisicao, requisicao.request.url.endsWith('/usuario') ? { itens: [{ id: 3, nomeCompleto: 'Ana Dev' }, { id: 4, nomeCompleto: 'Beto Dev' }], totalItens: 2 } : []);
  }
}

async function carregarTodos(montado: Montado, pontos: PontoDiarioDto[]): Promise<void> {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/todos'), pontos);
  responderApoio(montado);
  await montado.atualizar();
}

async function carregarMensal(montado: Montado, mensal = mensalDoMesAtual()): Promise<void> {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/mensal'), mensal);
  responderApoio(montado);
  await montado.atualizar();
}

const botaoPorTexto = (montado: Montado, conteudo: string) =>
  Array.from(montado.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes(conteudo));

describe('PontoPage: gestor, modo "todos hoje"', () => {
  it('abre na equipe de hoje, pede só /ponto/todos com a data de hoje e mostra o esqueleto até a resposta', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    expect(montado.componente.modo()).toBe('todos');
    const requisicao = esperarRequisicao(montado.http, 'GET', '/ponto/todos');
    expect(requisicao.request.params.get('data')).toBe(dataParaIso(new Date()));
    montado.http.expectNone((r) => r.url.endsWith('/ponto/mensal'));
    expect(montado.componente.primeiraCarga()).toBe(true);
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    responderSucesso(requisicao, []);
    responderApoio(montado);
  });

  it('com dados mostra um card por pessoa, quem trabalha agora primeiro, e a contagem no topo', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    await carregarTodos(montado, [
      pontoDiario(3, 'Ana Dev', [execucao(1)]),
      pontoDiario(4, 'Beto Dev', [execucao(2, true)]),
      pontoDiario(5, 'Caio Dev'),
    ]);
    expect(montado.componente.primeiraCarga()).toBe(false);
    const nomes = Array.from(montado.elemento.querySelectorAll('.ponto-usuario-card__nome-texto')).map((nome) => nome.textContent!.trim());
    expect(nomes).toEqual(['Beto Dev', 'Ana Dev', 'Caio Dev']);
    expect(texto(montado.elemento.querySelector('.ponto__triagem-contagem')!)).toBe('3 pessoas · 1 trabalhando agora');
  });

  it('"Somente ativos" filtra quem não está trabalhando; sem ninguém ativo oferece mostrar todos', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    await carregarTodos(montado, [pontoDiario(3, 'Ana Dev', [execucao(1)]), pontoDiario(4, 'Beto Dev', [execucao(2, true)])]);
    montado.componente.somenteAtivos.set(true);
    await montado.atualizar();
    expect(montado.elemento.querySelectorAll('app-ponto-usuario-card')).toHaveLength(1);

    const ninguem = await montarPagina(TipoUsuarioEnum.GESTOR);
    await carregarTodos(ninguem, [pontoDiario(3, 'Ana Dev', [execucao(1)])]);
    ninguem.componente.somenteAtivos.set(true);
    await ninguem.atualizar();
    expect(texto(ninguem.elemento)).toContain('Ninguém está trabalhando agora.');
    botaoPorTexto(ninguem, 'Mostrar todos')!.click();
    await ninguem.atualizar();
    expect(ninguem.elemento.querySelectorAll('app-ponto-usuario-card')).toHaveLength(1);
  });

  it('sem nenhum usuário ativo mostra o estado vazio com atalho para gerenciar usuários', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    await carregarTodos(montado, []);
    expect(texto(montado.elemento)).toContain('Nenhum usuário ativo encontrado.');
    expect(montado.elemento.querySelector('.ponto__triagem')).toBeNull();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    botaoPorTexto(montado, 'Gerenciar usuários')!.click();
    expect(navegar).toHaveBeenCalledWith(['/usuario']);
  });

  it('falha ao carregar a equipe tira o esqueleto e não mostra dados (a falha é do interceptor)', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    responderErro(esperarRequisicao(montado.http, 'GET', '/ponto/todos'), 500, 'Erro interno');
    responderApoio(montado);
    await montado.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(montado.componente.carregando()).toBe(false);
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(montado.elemento.querySelectorAll('app-ponto-usuario-card')).toHaveLength(0);
    expect(montado.errosHttpNaoTratados).toHaveLength(1);
  });

  it('o gestor vê o filtro de equipe e o botão "Justificar", desabilitado enquanto ninguém é escolhido', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    await carregarTodos(montado, []);
    expect(montado.elemento.querySelector('p-select')).not.toBeNull();
    expect(botaoPorTexto(montado, 'Justificar')).toBeDefined();
    expect(botaoPorTexto(montado, 'Justificar')!.disabled).toBe(true);
    expect(botaoPorTexto(montado, 'Imprimir')!.disabled).toBe(true);
    expect(montado.componente.usuarios().map((usuario) => usuario.nomeCompleto)).toEqual(['Ana Dev', 'Beto Dev']);
  });

  it('clicar no nome de uma pessoa abre o mês dela (mensal com o usuarioId)', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    await carregarTodos(montado, [pontoDiario(3, 'Ana Dev', [execucao(1)])]);
    (montado.elemento.querySelector('.ponto-usuario-card__nome') as HTMLElement).click();
    expect(montado.componente.modo()).toBe('mensal');
    expect(montado.componente.formularioFiltros.value.usuarioId).toBe(3);
    const requisicao = esperarRequisicao(montado.http, 'GET', '/ponto/mensal');
    expect(requisicao.request.params.get('usuarioId')).toBe('3');
    responderSucesso(requisicao, mensalDoMesAtual(3));
    await montado.atualizar();
    expect(texto(montado.elemento.querySelector('.ponto__mes-titulo')!)).toContain('Maria Souza');
    expect(botaoPorTexto(montado, 'Justificar')!.disabled).toBe(false);
  });

  it('limpar o filtro de pessoa volta para a equipe de hoje', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    await carregarTodos(montado, []);
    montado.componente.abrirMensalDe(3);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/mensal'), mensalDoMesAtual(3));
    await montado.atualizar();
    montado.componente.formularioFiltros.patchValue({ usuarioId: null });
    montado.componente.aoMudarUsuario();
    expect(montado.componente.modo()).toBe('todos');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/todos'), []);
  });
});

describe('PontoPage: desenvolvedor, só o próprio mês', () => {
  it('abre no mensal sem consultar a equipe nem a lista de usuários, e sem pedir usuarioId', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(montado.componente.modo()).toBe('mensal');
    const agora = new Date();
    const requisicao = esperarRequisicao(montado.http, 'GET', '/ponto/mensal');
    expect(requisicao.request.params.get('ano')).toBe(String(agora.getFullYear()));
    expect(requisicao.request.params.get('mes')).toBe(String(agora.getMonth() + 1));
    expect(requisicao.request.params.has('usuarioId')).toBe(false);
    montado.http.expectNone((r) => r.url.endsWith('/ponto/todos') || r.url.endsWith('/usuario'));
    responderSucesso(requisicao, mensalDoMesAtual());
    responderApoio(montado);
  });

  it('não vê o filtro de equipe nem o botão "Justificar", e as linhas do mês não oferecem justificar', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregarMensal(montado);
    expect(montado.elemento.querySelector('p-select')).toBeNull();
    expect(botaoPorTexto(montado, 'Justificar')).toBeUndefined();
    expect(montado.elemento.querySelector('.ponto-mes-dia__justificar')).toBeNull();
    expect(texto(montado.elemento.querySelector('.ponto__mes-titulo')!)).not.toContain('Maria Souza');
  });

  it('mostra os cards do mês (meta, trabalhado, saldo) e o saldo até hoje no mês corrente', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    const mensal = mensalDoMesAtual();
    await carregarMensal(montado, mensal);
    const cards = Array.from(montado.elemento.querySelectorAll('app-ponto-resumo-card')).map((card) => texto(card));
    expect(cards).toHaveLength(4);
    expect(cards[0]).toContain('Meta do mês');
    expect(cards[0]).toContain('168h');
    expect(cards[1]).toContain('Trabalhado');
    expect(cards[1]).toContain('50h');
    expect(cards[2]).toContain('Saldo do mês');
    expect(cards[2]).toContain('-118h 0min');
    const ateHoje = mensal.dias.reduce((soma, dia) => soma + dia.saldoMinutos, 0);
    expect(montado.componente.saldoAteHojeMinutos()).toBe(ateHoje);
    expect(cards[3]).toContain('Saldo até hoje');
    expect(montado.elemento.querySelectorAll('app-ponto-mes-dia')).toHaveLength(mensal.dias.length);
    expect(texto(montado.elemento.querySelector('.ponto__mes-titulo')!)).toContain('21 dias úteis');
  });

  it('navegação: não avança além do mês atual; voltar pede o mês anterior; "hoje" retorna ao corrente', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregarMensal(montado);
    expect(montado.componente.visualizandoMesAtual()).toBe(true);

    montado.componente.avancarMes();
    montado.http.expectNone(() => true);

    montado.componente.retornarMes();
    const anterior = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const requisicao = esperarRequisicao(montado.http, 'GET', '/ponto/mensal');
    expect(requisicao.request.params.get('mes')).toBe(String(anterior.getMonth() + 1));
    expect(requisicao.request.params.get('ano')).toBe(String(anterior.getFullYear()));
    responderSucesso(requisicao, { ...mensalDoMesAtual(), mes: anterior.getMonth() + 1, ano: anterior.getFullYear() });
    await montado.atualizar();
    expect(montado.componente.visualizandoMesAtual()).toBe(false);
    expect(montado.componente.saldoAteHojeMinutos()).toBeNull();
    expect(montado.elemento.querySelectorAll('app-ponto-resumo-card')).toHaveLength(3);

    montado.componente.irParaHoje();
    expect(montado.componente.visualizandoMesAtual()).toBe(true);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/mensal'), mensalDoMesAtual());
  });

  it('atalhos de teclado: ← mês anterior, T volta a hoje; com foco num campo, são ignorados', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregarMensal(montado);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(montado.componente.visualizandoMesAtual()).toBe(false);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/mensal'), mensalDoMesAtual());

    const campo = document.createElement('input');
    document.body.appendChild(campo);
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
    montado.http.expectNone(() => true);
    campo.remove();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
    expect(montado.componente.visualizandoMesAtual()).toBe(true);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/mensal'), mensalDoMesAtual());
  });

  it('falha ao carregar o mês tira o esqueleto e não monta cards nem dias', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    responderErro(esperarRequisicao(montado.http, 'GET', '/ponto/mensal'), 500, 'Erro interno');
    responderApoio(montado);
    await montado.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(montado.componente.carregando()).toBe(false);
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(montado.elemento.querySelectorAll('app-ponto-resumo-card')).toHaveLength(0);
    expect(montado.errosHttpNaoTratados).toHaveLength(1);
  });

  it('recarregar com dados já na tela esmaece o conteúdo em vez de voltar ao esqueleto', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregarMensal(montado);
    montado.componente.carregar();
    await montado.atualizar();
    expect(montado.componente.recarregando()).toBe(true);
    expect(montado.componente.primeiraCarga()).toBe(false);
    expect(montado.elemento.querySelector('.conteudo-recarregando')).not.toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/mensal'), mensalDoMesAtual());
  });

  it('o botão Imprimir só habilita com o espelho carregado', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(botaoPorTexto(montado, 'Imprimir')!.disabled).toBe(true);
    await carregarMensal(montado);
    expect(botaoPorTexto(montado, 'Imprimir')!.disabled).toBe(false);
  });
});
