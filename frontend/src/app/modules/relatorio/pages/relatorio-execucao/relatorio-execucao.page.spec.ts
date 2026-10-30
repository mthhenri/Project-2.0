import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RelatorioPeriodoTipoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { RelatorioExecucaoPage } from './relatorio-execucao.page';

// Relatório de execuções (SYSTEM.SPEC.md §14 "Ver execuções de todos": só gestor — a tela é aberta pelo gestor; o
// acesso é do backend). Abre já carregado em "Este mês"; CSV e IA usam os parâmetros do que está na tela.

type Montado = ComponenteMontado<RelatorioExecucaoPage>;

function linha(sobrescrita: Record<string, unknown> = {}) {
  return {
    nomeProjeto: 'Loja', nomeDemanda: 'Login', nomeAtividade: 'Formulário', nomeUsuario: 'Ana',
    dataExecucao: '2026-10-05', inicioData: '2026-10-05T12:00:00.000Z', fimData: '2026-10-05T13:30:00.000Z',
    duracaoMinutos: 90, descricao: 'Montou o formulário', statusAtividade: 'EM_ANDAMENTO',
    ...sobrescrita,
  };
}

function relatorioDe(linhas: ReturnType<typeof linha>[]) {
  return {
    projetoId: 3, nomeProjeto: 'Loja', periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, periodoDescricao: 'Outubro/2026',
    dataInicio: '2026-10-01', dataFim: '2026-10-31', totalExecucoes: linhas.length,
    totalMinutos: linhas.reduce((soma, item) => soma + item.duracaoMinutos, 0), linhas,
  };
}

/** Monta a tela como a rota a entrega: `/projeto/:id/relatorio` (com `projetoId`) ou `/relatorio` (sem). */
function montarPagina(projetoId?: number, armazenamento?: Record<string, string>) {
  const parametros = projetoId === undefined ? {} : { id: String(projetoId) };
  return montarComponente(RelatorioExecucaoPage, {
    usuario: TipoUsuarioEnum.GESTOR,
    armazenamento,
    provedores: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(parametros) } } }],
  });
}

const esperarFiltro = () => new Promise((resolver) => setTimeout(resolver, 450));
const textoDaTela = () => document.body.textContent ?? '';
const botao = (rotulo: string) =>
  Array.from(document.body.querySelectorAll('button')).find((candidato) => candidato.textContent?.includes(rotulo)) as HTMLButtonElement;

/** Abre a tela pelo projeto e responde a lista de projetos e o relatório. */
async function abrirComRelatorio(linhas: ReturnType<typeof linha>[], projetoId = 3): Promise<Montado> {
  const montado = await montarPagina(projetoId);
  await montado.atualizar();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto'), { itens: [{ id: 3, nome: 'Loja', codigo: 'LOJA' }] });
  await new Promise((resolver) => setTimeout(resolver, 10));
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/relatorio/execucao'), relatorioDe(linhas));
  await montado.atualizar();
  return montado;
}

afterEach(() => vi.restoreAllMocks());

describe('RelatorioExecucaoPage — voltar', () => {
  it('pela rota do projeto volta ao projeto; pela rota sem projeto, a Execuções', async () => {
    for (const [projetoId, destino] of [[3, ['/projeto', 3]], [undefined, ['/execucao']]] as const) {
      const montado = await montarPagina(projetoId);
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await montado.atualizar();
      botao(projetoId === undefined ? 'Execuções' : 'Projeto').click();
      expect(navegar).toHaveBeenCalledWith(destino);
      TestBed.resetTestingModule();
    }
  });
});

describe('RelatorioExecucaoPage — abrir e mostrar', () => {
  it('aberto pelo detalhe do projeto: pede o relatório de "Este mês" desse projeto e mostra resumo, totais e linhas', async () => {
    const montado = await montarPagina(3);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto'), { itens: [] });
    await new Promise((resolver) => setTimeout(resolver, 10));
    const pedido = esperarRequisicao(montado.http, 'GET', '/relatorio/execucao');
    expect(pedido.request.params.get('projetoId')).toBe('3');
    expect(pedido.request.params.get('periodoTipo')).toBe('MENSAL');
    expect(pedido.request.params.has('mes')).toBe(true);
    responderSucesso(pedido, relatorioDe([linha(), linha({ nomeUsuario: 'Bia', duracaoMinutos: 30, fimData: null })]));
    await montado.atualizar();

    expect(montado.componente.projetoFixo()).toBe(true);
    const texto = textoDaTela();
    expect(texto).toContain('Outubro/2026');
    expect(texto).toMatch(/2\s*execuções/);
    expect(texto).toContain('2h 0min');
    expect(texto).toContain('Ana');
    expect(texto).toContain('Em andamento');
  });

  it('sem projeto escolhido não pede o relatório e orienta a escolher, com CSV e IA desligados', async () => {
    const montado = await montarPagina(undefined);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto'), { itens: [] });
    await new Promise((resolver) => setTimeout(resolver, 10));
    await montado.atualizar();

    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/relatorio/execucao'));
    expect(textoDaTela()).toContain('Escolha um projeto para ver o relatório.');
    expect(botao('Baixar CSV').disabled).toBe(true);
    expect(botao('Revisar com IA').disabled).toBe(true);
  });

  it('lembra o último projeto escolhido nesta máquina e já abre carregado com ele', async () => {
    const montado = await montarPagina(undefined, { 'relatorio.projeto': '3' });
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto'), { itens: [] });
    await new Promise((resolver) => setTimeout(resolver, 10));
    expect(esperarRequisicao(montado.http, 'GET', '/relatorio/execucao').request.params.get('projetoId')).toBe('3');
    expect(montado.componente.projetoFixo()).toBe(false);
  });

  it('período sem execuções mostra a mensagem de vazio e não deixa exportar', async () => {
    const montado = await abrirComRelatorio([]);
    expect(textoDaTela()).toContain('Nenhuma execução encontrada no período.');
    expect(montado.componente.podeExportar()).toBe(false);
    expect(botao('Baixar CSV').disabled).toBe(true);
    expect(botao('Revisar com IA').disabled).toBe(true);
  });

  it('falha ao carregar mostra o erro e "Tentar de novo" refaz o pedido', async () => {
    const montado = await montarPagina(3);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto'), { itens: [] });
    await new Promise((resolver) => setTimeout(resolver, 10));
    responderErro(esperarRequisicao(montado.http, 'GET', '/relatorio/execucao'), 500, 'Falhou');
    await montado.atualizar();

    expect(montado.componente.erroPreview()).toBe(true);
    expect(textoDaTela()).toContain('Não foi possível carregar o relatório.');

    botao('Tentar de novo').click();
    await new Promise((resolver) => setTimeout(resolver, 10));
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/relatorio/execucao'), relatorioDe([linha()]));
    await montado.atualizar();
    expect(montado.componente.erroPreview()).toBe(false);
    expect(textoDaTela()).toMatch(/1\s*execução/);
  });
});

describe('RelatorioExecucaoPage — período', () => {
  it('trocar o atalho recarrega sozinho com o novo período', async () => {
    const montado = await abrirComRelatorio([linha()]);
    montado.componente.escolherAtalho('ANO');
    await montado.atualizar();
    expect(montado.componente.sincronizado()).toBe(false);
    await esperarFiltro();
    const pedido = esperarRequisicao(montado.http, 'GET', '/relatorio/execucao');
    expect(pedido.request.params.get('periodoTipo')).toBe('ANUAL');
    expect(pedido.request.params.has('mes')).toBe(false);
    responderSucesso(pedido, relatorioDe([linha()]));
    await montado.atualizar();
    expect(montado.componente.sincronizado()).toBe(true);
  });

  it('personalizado sem as duas datas não pede nada e avisa; com as duas pede o intervalo', async () => {
    const montado = await abrirComRelatorio([linha()]);
    montado.componente.escolherAtalho('CUSTOM');
    await montado.atualizar();
    await esperarFiltro();
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/relatorio/execucao'));
    expect(montado.componente.periodoIncompleto).toBe(true);
    expect(textoDaTela()).toContain('Selecione a data inicial e a final');

    montado.componente.formulario.patchValue({ periodo: [new Date(2026, 8, 1), new Date(2026, 8, 15)] as never });
    await esperarFiltro();
    const pedido = esperarRequisicao(montado.http, 'GET', '/relatorio/execucao');
    expect(pedido.request.params.get('periodoTipo')).toBe('CUSTOM');
    expect(pedido.request.params.get('dataInicio')).toBe('2026-09-01');
    expect(pedido.request.params.get('dataFim')).toBe('2026-09-15');
  });

  it('enquanto o filtro mudou e o resultado não chegou, o CSV e a IA ficam desligados', async () => {
    const montado = await abrirComRelatorio([linha()]);
    expect(montado.componente.podeExportar()).toBe(true);
    montado.componente.escolherAtalho('PASSADO');
    await montado.atualizar();
    expect(montado.componente.podeExportar()).toBe(false);
    expect(montado.componente.esmaecido()).toBe(true);
    await esperarFiltro();
    esperarRequisicao(montado.http, 'GET', '/relatorio/execucao');
  });
});

describe('RelatorioExecucaoPage — baixar CSV', () => {
  it('pede o download do que está na tela e baixa com o nome do cabeçalho', async () => {
    const montado = await abrirComRelatorio([linha()]);
    const criarUrl = vi.fn(() => 'blob:teste');
    const revogarUrl = vi.fn();
    Object.assign(URL, { createObjectURL: criarUrl, revokeObjectURL: revogarUrl });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    let nomeBaixado = '';
    clique.mockImplementation(function (this: HTMLAnchorElement) { nomeBaixado = this.download; });

    botao('Baixar CSV').click();
    await montado.atualizar();
    const pedido = esperarRequisicao(montado.http, 'GET', '/relatorio/execucao/download');
    expect(pedido.request.params.get('formato')).toBe('CSV');
    expect(pedido.request.params.get('projetoId')).toBe('3');
    expect(montado.componente.baixando()).toBe(true);
    pedido.flush(new Blob(['a,b']), {
      headers: { 'Content-Disposition': 'attachment; filename="relatorio-execucoes_LOJA_2026-10-01_2026-10-31.csv"' },
    });
    await montado.atualizar();

    expect(nomeBaixado).toBe('relatorio-execucoes_LOJA_2026-10-01_2026-10-31.csv');
    expect(revogarUrl).toHaveBeenCalledWith('blob:teste');
    expect(montado.componente.baixando()).toBe(false);
  });

  it('sem cabeçalho de nome usa o nome padrão', async () => {
    const montado = await abrirComRelatorio([linha()]);
    Object.assign(URL, { createObjectURL: () => 'blob:teste', revokeObjectURL: () => undefined });
    let nomeBaixado = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { nomeBaixado = this.download; });

    botao('Baixar CSV').click();
    await montado.atualizar();
    esperarRequisicao(montado.http, 'GET', '/relatorio/execucao/download').flush(new Blob(['a']));
    await montado.atualizar();
    expect(nomeBaixado).toBe('relatorio-execucoes.csv');
  });

  it('falha no download libera o botão sem baixar nada', async () => {
    const montado = await abrirComRelatorio([linha()]);
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    botao('Baixar CSV').click();
    await montado.atualizar();
    esperarRequisicao(montado.http, 'GET', '/relatorio/execucao/download').flush(new Blob(['{}']), { status: 400, statusText: 'Erro' });
    await montado.atualizar();
    expect(montado.componente.baixando()).toBe(false);
    expect(clique).not.toHaveBeenCalled();
  });
});

describe('RelatorioExecucaoPage — revisão por IA', () => {
  it('mostra o resumo e os achados ordenados da mais grave para a mais leve, com a contagem por severidade', async () => {
    const montado = await abrirComRelatorio([linha()]);
    botao('Revisar com IA').click();
    await montado.atualizar();
    const pedido = esperarRequisicao(montado.http, 'POST', '/relatorio/execucao/revisar');
    expect(pedido.request.params.get('projetoId')).toBe('3');
    expect(pedido.request.body.periodoTipo).toBe('MENSAL');
    expect(montado.componente.carregandoRevisao()).toBe(true);
    responderSucesso(pedido, {
      resumo: 'Duas falhas',
      inconsistencias: [
        { tipo: 'Duração', severidade: 'baixa', descricao: 'Curta demais', referencia: null },
        { tipo: 'Descrição vaga', severidade: 'ALTA', descricao: 'Só diz ajustes', referencia: '1' },
        { tipo: 'Horário', severidade: 'Média', descricao: 'De madrugada', referencia: null },
      ],
    });
    await montado.atualizar();

    expect(textoDaTela()).toContain('Duas falhas');
    expect(montado.componente.achados().map((achado) => achado.tipo)).toEqual(['Descrição vaga', 'Horário', 'Duração']);
    expect(montado.componente.contadores().map((contador) => `${contador.total} ${contador.rotulo}`)).toEqual(['1 ALTA', '1 MÉDIA', '1 BAIXA']);
    expect(montado.componente.severidadeInconsistencia('ALTA')).toBe('danger');
    expect(montado.componente.severidadeInconsistencia('Média')).toBe('warn');
    expect(montado.componente.severidadeInconsistencia('BAIXA')).toBe('secondary');
  });

  it('sem inconsistências diz que nenhuma foi apontada', async () => {
    const montado = await abrirComRelatorio([linha()]);
    botao('Revisar com IA').click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/relatorio/execucao/revisar'), { resumo: 'Tudo certo', inconsistencias: [] });
    await montado.atualizar();
    expect(textoDaTela()).toContain('Nenhuma inconsistência apontada.');
  });

  it('IA fora do ar: o erro avisa pelo interceptor, nenhuma revisão aparece e o botão volta a funcionar', async () => {
    const montado = await abrirComRelatorio([linha()]);
    const avisos: { severity?: string }[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));

    botao('Revisar com IA').click();
    await montado.atualizar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/relatorio/execucao/revisar'), 400, 'Serviço de IA temporariamente indisponível');
    await montado.atualizar();

    expect(avisos.some((aviso) => aviso.severity === 'warn')).toBe(true);
    expect(montado.componente.revisao()).toBeNull();
    expect(montado.componente.carregandoRevisao()).toBe(false);
    expect(textoDaTela()).not.toContain('Revisão por IA');
    expect(montado.componente.podeExportar()).toBe(true);
    expect(botao('Baixar CSV').disabled).toBe(false);
  });

  it('mudar um filtro descarta a revisão antiga', async () => {
    const montado = await abrirComRelatorio([linha()]);
    botao('Revisar com IA').click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/relatorio/execucao/revisar'), { resumo: 'Antiga', inconsistencias: [] });
    await montado.atualizar();
    expect(montado.componente.revisao()).not.toBeNull();

    montado.componente.escolherAtalho('PASSADO');
    await montado.atualizar();
    expect(montado.componente.revisao()).toBeNull();
    await esperarFiltro();
    esperarRequisicao(montado.http, 'GET', '/relatorio/execucao');
  });
});
