import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ExecucaoItemDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ExecucaoHistoricoPage } from './execucao-historico.page';
import { dataParaIso } from '../../utils/execucao.util';

type Montado = ComponenteMontado<ExecucaoHistoricoPage>;

// O cronômetro da linha em andamento usa setInterval, que deixaria a zona instável: só os intervalos são falsos.
const usarRelogioFalso = () => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

afterEach(() => vi.useRealTimers());

function criarExecucao(id: number, sobrescritas: Partial<ExecucaoItemDto> = {}): ExecucaoItemDto {
  const inicio = new Date();
  inicio.setHours(inicio.getHours() - 3);
  const fim = new Date(inicio.getTime() + 90 * 60_000);
  return {
    id, atividadeId: 20 + id, nomeAtividade: `Atividade ${id}`, demandaId: 10, nomeDemanda: 'Demanda dez',
    projetoId: 5, nomeProjeto: 'Portal', descricao: `Descrição ${id}`, inicioData: inicio, fimData: fim,
    duracaoMinutos: 90, usuarioId: 1, nomeUsuario: 'Maria Souza', ...sobrescritas,
  };
}

const pagina = (itens: ExecucaoItemDto[], totalMinutosDia = 0, totalItens = itens.length) =>
  ({ itens, totalItens, pagina: 1, itensPorPagina: 50, totalMinutosDia });

async function montarPagina({ usuario = TipoUsuarioEnum.GESTOR, consulta = {} }: { usuario?: TipoUsuarioEnum; consulta?: Record<string, string> } = {}) {
  TestBed.resetTestingModule();
  usarRelogioFalso();
  const parametros = new BehaviorSubject(convertToParamMap(consulta));
  const rota = { snapshot: { queryParamMap: parametros.value }, queryParamMap: parametros.asObservable() };
  const montado = await montarComponente(ExecucaoHistoricoPage, { usuario, provedores: [{ provide: ActivatedRoute, useValue: rota }] });
  const irPara = vi.fn().mockResolvedValue(true);
  (montado.fixture.debugElement.injector.get(Router) as unknown as { navigate: unknown }).navigate = irPara;
  return { montado, irPara, parametros };
}

/** Atende as leituras de apoio (usuários do filtro e dos dialogs filhos) e a primeira busca de execuções. */
async function carregar(montado: Montado, itens: ExecucaoItemDto[] = [], totalMinutosDia = 0): Promise<void> {
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/usuario'))) {
    responderSucesso(requisicao, { itens: [{ id: 1, nomeCompleto: 'Maria Souza' }, { id: 3, nomeCompleto: 'João Lima' }], totalItens: 2 });
  }
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && (r.url.endsWith('/demanda/atribuidas') || r.url.endsWith('/tag')))) {
    responderSucesso(requisicao, []);
  }
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina(itens, totalMinutosDia));
  await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botaoPorRotulo = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll('button')).filter((botao) => botao.getAttribute('aria-label') === rotulo);
const botaoPorTexto = (montado: Montado, conteudo: string) =>
  Array.from(montado.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes(conteudo));
const cabecalhos = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('th')).map((celula) => celula.textContent?.trim());

describe('ExecucaoHistoricoPage: carregamento e estados', () => {
  it('abre no dia de hoje, na primeira página, e mostra o esqueleto até a resposta', async () => {
    const { montado } = await montarPagina();
    const requisicao = esperarRequisicao(montado.http, 'GET', '/execucao');
    expect(requisicao.request.params.get('data')).toBe(dataParaIso(montado.componente.hoje));
    expect(requisicao.request.params.get('pagina')).toBe('1');
    expect(requisicao.request.params.get('itensPorPagina')).toBe('50');
    expect(requisicao.request.params.has('usuarioId')).toBe(false);
    expect(montado.componente.primeiraCarga()).toBe(true);
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
  });

  it('com dados mostra as linhas, o resumo do dia e o total de minutos no rodapé', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarExecucao(1), criarExecucao(2, { duracaoMinutos: 60 })], 150);
    expect(montado.componente.primeiraCarga()).toBe(false);
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(montado.elemento.querySelectorAll('tr.execucao-historico__linha').length).toBe(2);
    expect(texto(montado)).toContain('Atividade 1');
    expect(texto(montado)).toContain('Descrição 2');
    expect(texto(montado)).toContain('2 execuções · 2h30');
    expect(montado.elemento.querySelector('.execucao-historico__rodape')?.textContent).toContain('Total do dia');
    expect(montado.componente.totalMinutosDia()).toBe(150);
  });

  it('sem execuções mostra o estado vazio com a data e sem rodapé de total', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, []);
    expect(texto(montado)).toContain('Nenhuma execução em');
    expect(texto(montado)).toContain('Nenhuma execução');
    expect(montado.elemento.querySelector('.execucao-historico__rodape')).toBeNull();
    expect(botaoPorTexto(montado, 'Ver dia anterior')).toBeDefined();
    expect(botaoPorTexto(montado, 'Voltar para hoje')).toBeUndefined();
  });

  it('em outro dia vazio oferece voltar para hoje; com usuário filtrado, limpar o filtro', async () => {
    const { montado, irPara } = await montarPagina({ consulta: { data: '2026-01-05', usuario: '3' } });
    await carregar(montado, []);
    expect(botaoPorTexto(montado, 'Voltar para hoje')).toBeDefined();
    botaoPorTexto(montado, 'Limpar filtro de usuário')!.click();
    expect(irPara).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { data: '2026-01-05', usuario: null } }));
  });

  it('falha na busca mantém a tela sem dados, tira o esqueleto e não derruba a página', async () => {
    const { montado } = await montarPagina();
    responderErro(esperarRequisicao(montado.http, 'GET', '/execucao'), 500, 'Falha ao listar');
    await montado.atualizar();
    expect(montado.componente.carregando()).toBe(false);
    expect(montado.componente.execucoes()).toEqual([]);
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(texto(montado)).toContain('Nenhuma execução em');
  });

  it('a execução em andamento vai para o topo, com "Em andamento" e cronômetro no lugar da duração', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarExecucao(1), criarExecucao(2, { fimData: null, duracaoMinutos: null })], 90);
    const linhas = Array.from(montado.elemento.querySelectorAll('tr.execucao-historico__linha'));
    expect(linhas[0].classList).toContain('execucao-historico__linha--ativa');
    expect(linhas[0].textContent).toContain('Em andamento');
    expect(linhas[0].querySelector('app-execucao-timer')).not.toBeNull();
    expect(linhas[1].querySelector('app-execucao-timer')).toBeNull();
    expect(linhas[1].textContent).toContain('1h 30min');
  });
});

describe('ExecucaoHistoricoPage: filtros', () => {
  it('data e usuário da URL viram parâmetros da busca (gestor)', async () => {
    const { montado } = await montarPagina({ consulta: { data: '2026-01-05', usuario: '3' } });
    const requisicao = esperarRequisicao(montado.http, 'GET', '/execucao');
    expect(requisicao.request.params.get('data')).toBe('2026-01-05');
    expect(requisicao.request.params.get('usuarioId')).toBe('3');
    expect(montado.componente.formularioFiltros.value.usuarioId).toBe(3);
    expect(montado.componente.visualizandoHoje()).toBe(false);
  });

  it('data futura ou inválida na URL cai em hoje', async () => {
    const futura = montarPagina({ consulta: { data: '2999-01-01' } });
    const { montado } = await futura;
    expect(esperarRequisicao(montado.http, 'GET', '/execucao').request.params.get('data')).toBe(dataParaIso(montado.componente.hoje));

    const invalida = await montarPagina({ consulta: { data: '2026-02-30' } });
    expect(esperarRequisicao(invalida.montado.http, 'GET', '/execucao').request.params.get('data')).toBe(dataParaIso(invalida.montado.componente.hoje));
  });

  it('mudança de URL recarrega a lista do novo dia, voltando à primeira página', async () => {
    const { montado, parametros } = await montarPagina();
    await carregar(montado, [criarExecucao(1)]);
    parametros.next(convertToParamMap({ data: '2026-01-05' }));
    const requisicao = esperarRequisicao(montado.http, 'GET', '/execucao');
    expect(requisicao.request.params.get('data')).toBe('2026-01-05');
    expect(requisicao.request.params.get('pagina')).toBe('1');
    responderSucesso(requisicao, pagina([]));
  });

  it('o dia anterior vai para a URL com a data; hoje fica sem data na URL', async () => {
    const { montado, irPara } = await montarPagina();
    await carregar(montado);
    botaoPorRotulo(montado, 'Dia anterior')[0].click();
    const hoje = montado.componente.hoje;
    const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
    expect(irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { data: dataParaIso(ontem), usuario: null } }));
    montado.componente.aoMudarFiltro();
    expect(irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { data: null, usuario: null } }));
  });

  it('em hoje não há "Hoje" nem próximo dia; em dia passado o "Hoje" aparece e volta à data corrente', async () => {
    const hojeMontado = await montarPagina();
    await carregar(hojeMontado.montado);
    expect(botaoPorTexto(hojeMontado.montado, 'Hoje')).toBeUndefined();
    expect((botaoPorRotulo(hojeMontado.montado, 'Próximo dia')[0] as HTMLButtonElement).disabled).toBe(true);

    const passado = await montarPagina({ consulta: { data: '2026-01-05' } });
    await carregar(passado.montado);
    expect((botaoPorRotulo(passado.montado, 'Próximo dia')[0] as HTMLButtonElement).disabled).toBe(false);
    botaoPorTexto(passado.montado, 'Hoje')!.click();
    expect(passado.irPara).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { data: null, usuario: null } }));
  });

  it('"Minhas" filtra pelo usuário logado e, estando ativo, remove o filtro', async () => {
    const { montado, irPara } = await montarPagina();
    await carregar(montado);
    botaoPorTexto(montado, 'Minhas')!.click();
    expect(irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { data: null, usuario: 1 } }));

    const ativa = await montarPagina({ consulta: { usuario: '1' } });
    await carregar(ativa.montado);
    expect(ativa.montado.componente.filtrandoMinhas()).toBe(true);
    botaoPorTexto(ativa.montado, 'Minhas')!.click();
    expect(ativa.irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { data: null, usuario: null } }));
  });

  it('o gestor carrega a lista de usuários ativos para o filtro', async () => {
    const { montado } = await montarPagina();
    const usuarios = esperarRequisicao(montado.http, 'GET', '/usuario');
    expect(usuarios.request.params.get('allRows')).toBe('true');
    responderSucesso(usuarios, { itens: [{ id: 3, nomeCompleto: 'João Lima' }], totalItens: 1 });
    expect(montado.componente.usuarios().length).toBe(1);
    montado.http.match(() => true);
  });

  it('voltar para a aba recarrega a lista, exceto com uma busca em andamento', async () => {
    const { montado } = await montarPagina();
    await carregar(montado);
    montado.componente.aoVoltarParaAba();
    const recarga = esperarRequisicao(montado.http, 'GET', '/execucao');
    montado.componente.aoVoltarParaAba();
    montado.http.expectNone((r) => r.method === 'GET' && r.url.endsWith('/execucao'));
    responderSucesso(recarga, pagina([]));
  });
});

describe('ExecucaoHistoricoPage: gestor x desenvolvedor', () => {
  it('gestor vê o filtro de usuário, Minhas, Relatório, a coluna Usuário e a coluna Ações', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarExecucao(1)], 90);
    expect(texto(montado)).toContain('Relatório');
    expect(botaoPorTexto(montado, 'Minhas')).toBeDefined();
    expect(montado.elemento.querySelector('#filtro-usuario, p-select')).not.toBeNull();
    expect(cabecalhos(montado)).toContain('Usuário');
    expect(cabecalhos(montado)).toContain('Ações');
    expect(texto(montado)).toContain('Maria Souza');
    expect(botaoPorRotulo(montado, 'Editar execução').length).toBe(1);
  });

  it('desenvolvedor não vê filtro de usuário, Minhas, Relatório, colunas de usuário e ações, e não carrega usuários', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    montado.http.expectNone((r) => r.url.endsWith('/usuario'));
    await carregar(montado, [criarExecucao(1)], 90);
    expect(texto(montado)).not.toContain('Relatório');
    expect(botaoPorTexto(montado, 'Minhas')).toBeUndefined();
    expect(montado.elemento.querySelector('p-select')).toBeNull();
    expect(cabecalhos(montado)).not.toContain('Usuário');
    expect(cabecalhos(montado)).not.toContain('Ações');
    expect(botaoPorRotulo(montado, 'Editar execução').length).toBe(0);
    expect(montado.elemento.querySelector('.execucao-historico__descricao-botao')).toBeNull();
    expect(texto(montado)).toContain('Descrição 1');
  });

  it('desenvolvedor ignora o usuário da URL: a busca não leva usuarioId', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, consulta: { usuario: '3' } });
    expect(esperarRequisicao(montado.http, 'GET', '/execucao').request.params.has('usuarioId')).toBe(false);
    expect(montado.componente.usuarioFiltradoId()).toBeNull();
  });

  it('desenvolvedor não consegue abrir a edição, nem programaticamente', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    await carregar(montado, [criarExecucao(1)]);
    montado.componente.abrirEdicao(montado.componente.execucoes()[0]);
    expect(montado.componente.mostrarDialogEditar()).toBe(false);
    expect(montado.componente.execucaoEmEdicao()).toBeNull();
  });
});

describe('ExecucaoHistoricoPage: edição (gestor)', () => {
  async function abrirEdicao() {
    const contexto = await montarPagina();
    await carregar(contexto.montado, [criarExecucao(1, { usuarioId: 3, nomeUsuario: 'João Lima' })], 90);
    botaoPorRotulo(contexto.montado, 'Editar execução')[0].click();
    await contexto.montado.atualizar();
    return contexto;
  }

  it('o gestor edita a execução de outro usuário: o lápis abre o dialog com os dados da execução', async () => {
    const { montado } = await abrirEdicao();
    expect(montado.componente.mostrarDialogEditar()).toBe(true);
    expect(montado.componente.execucaoEmEdicao()?.id).toBe(1);
    expect(montado.componente.formularioEdicao.value.descricao).toBe('Descrição 1');
    expect(montado.componente.formularioEdicao.value.inicioData).toBeInstanceOf(Date);
  });

  it('a descrição também abre a edição ao clicar', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarExecucao(1)]);
    (montado.elemento.querySelector('.execucao-historico__descricao-botao') as HTMLButtonElement).click();
    expect(montado.componente.mostrarDialogEditar()).toBe(true);
  });

  it('salvar envia PUT /execucao/:id com descrição aparada, início e fim em ISO, e atualiza a linha', async () => {
    const { montado } = await abrirEdicao();
    montado.componente.formularioEdicao.patchValue({ descricao: '  Nova descrição  ' });
    montado.componente.salvarEdicao();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/execucao/1');
    expect(requisicao.request.body.descricao).toBe('Nova descrição');
    expect(typeof requisicao.request.body.inicioData).toBe('string');
    expect(requisicao.request.body.fimData).toEqual(expect.any(String));
    expect(montado.componente.salvandoDescricao()).toBe(true);

    const alterada = montado.componente.execucoes()[0];
    responderSucesso(requisicao, {
      ...alterada, descricao: 'Nova descrição', inicioData: alterada.inicioData.toISOString(),
      fimData: alterada.fimData!.toISOString(), duracaoMinutos: 45,
    });
    await montado.atualizar();
    expect(montado.componente.salvandoDescricao()).toBe(false);
    expect(montado.componente.mostrarDialogEditar()).toBe(false);
    expect(montado.componente.execucoes()[0].descricao).toBe('Nova descrição');
    expect(montado.componente.execucoes()[0].duracaoMinutos).toBe(45);
  });

  it('execução ainda em andamento é editável e o fim fica vazio (null) no envio', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, [criarExecucao(1, { fimData: null, duracaoMinutos: null })]);
    botaoPorRotulo(montado, 'Editar execução')[0].click();
    montado.componente.salvarEdicao();
    expect(esperarRequisicao(montado.http, 'PUT', '/execucao/1').request.body.fimData).toBeNull();
  });

  it('descrição vazia ou fim anterior ao início impedem o envio', async () => {
    const { montado } = await abrirEdicao();
    montado.componente.formularioEdicao.patchValue({ descricao: '' });
    montado.componente.salvarEdicao();
    montado.http.expectNone((r) => r.method === 'PUT');

    const formulario = montado.componente.formularioEdicao;
    const inicio = formulario.value.inicioData as Date;
    formulario.patchValue({ descricao: 'ok', fimData: new Date(inicio.getTime() - 60_000) });
    expect(formulario.hasError('periodo')).toBe(true);
    montado.componente.salvarEdicao();
    montado.http.expectNone((r) => r.method === 'PUT');
  });

  it('descrição com caracteres proibidos é inválida', async () => {
    const { montado } = await abrirEdicao();
    montado.componente.formularioEdicao.patchValue({ descricao: 'texto com "aspas"' });
    montado.componente.salvarEdicao();
    montado.http.expectNone((r) => r.method === 'PUT');
  });

  it('erro do servidor na edição mantém o dialog aberto e a linha como estava', async () => {
    const { montado } = await abrirEdicao();
    montado.componente.salvarEdicao();
    responderErro(esperarRequisicao(montado.http, 'PUT', '/execucao/1'), 400, 'Sobreposição');
    await montado.atualizar();
    expect(montado.componente.mostrarDialogEditar()).toBe(true);
    expect(montado.componente.salvandoDescricao()).toBe(false);
    expect(montado.componente.execucoes()[0].descricao).toBe('Descrição 1');
  });
});
