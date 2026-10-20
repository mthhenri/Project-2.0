import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoProjetoStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { ProjetoListagemPage } from './projeto-listagem.page';

// Listagem de projetos (SYSTEM.SPEC.md §14): estados da tela, busca e filtro no cliente e ações só para o gestor.

type Montado = ComponenteMontado<ProjetoListagemPage>;

function projeto(id: number, nome: string, status = TipoProjetoStatusEnum.ATIVO) {
  return { id, nome, codigo: `COD${id}`, cor: '#336699', status };
}

const PAGINA = (itens: ReturnType<typeof projeto>[]) => ({ itens, totalItens: itens.length, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 });

async function montarListagem(tipo: TipoUsuarioEnum): Promise<Montado> {
  return montarComponente(ProjetoListagemPage, { usuario: tipo });
}

async function carregar(montado: Montado, itens: ReturnType<typeof projeto>[]): Promise<void> {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto'), PAGINA(itens));
  await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';

describe('ProjetoListagemPage — estados', () => {
  it('pede até 100 projetos, mostra o esqueleto e depois os cartões', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto');
    expect(requisicao.request.params.get('itensPorPagina')).toBe('100');
    responderSucesso(requisicao, PAGINA([projeto(1, 'Alfa'), projeto(2, 'Beta')]));
    await montado.atualizar();

    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(texto(montado)).toContain('Alfa');
    expect(texto(montado)).toContain('COD2');
  });

  it('sem projetos: estado vazio com o convite a criar o primeiro (gestor)', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, []);
    expect(texto(montado)).toContain('Nenhum projeto ainda');
    expect(texto(montado)).toContain('Criar o primeiro projeto');
  });

  it('sem projetos, o desenvolvedor vê o vazio sem convite a criar', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado, []);
    expect(texto(montado)).toContain('Nenhum projeto ainda');
    expect(texto(montado)).not.toContain('Criar o primeiro projeto');
  });

  it('erro da API: sai do carregamento, avisa por toast e fica no vazio', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    const avisos: unknown[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(mensagem));
    responderErro(esperarRequisicao(montado.http, 'GET', '/projeto'), 500, 'falha');
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(texto(montado)).toContain('Nenhum projeto ainda');
    expect(avisos).toHaveLength(1);
  });
});

describe('ProjetoListagemPage — busca e filtro (no cliente)', () => {
  const PROJETOS = [
    projeto(1, 'Sistema Financeiro'),
    projeto(2, 'Portal do Cliente', TipoProjetoStatusEnum.PAUSADO),
    projeto(3, 'Ação Social', TipoProjetoStatusEnum.CONCLUIDO),
  ];

  it('a busca ignora acento e caixa e olha nome e código', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, PROJETOS);
    montado.componente.aoDigitarBusca('acao');
    expect(montado.componente.projetosExibidos().map((p) => p.id)).toEqual([3]);
    montado.componente.aoDigitarBusca('cod2');
    expect(montado.componente.projetosExibidos().map((p) => p.id)).toEqual([2]);
  });

  it('o filtro de status mostra só aquele status, e os contadores seguem a busca', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, PROJETOS);
    montado.componente.aoMudarStatus(TipoProjetoStatusEnum.PAUSADO);
    expect(montado.componente.projetosExibidos().map((p) => p.id)).toEqual([2]);
    const contagens = Object.fromEntries(montado.componente.opcoesStatus().map((opcao) => [opcao.rotulo, opcao.contagem]));
    expect(contagens).toEqual({ Todos: 3, Ativos: 1, Pausados: 1, 'Concluídos': 1, Cancelados: 0 });
  });

  it('sem resultado mostra o aviso e limpar filtros restaura a lista', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, PROJETOS);
    montado.componente.aoDigitarBusca('zzzz');
    await montado.atualizar();
    expect(texto(montado)).toContain('Nenhum projeto corresponde aos filtros');
    montado.componente.limparFiltros();
    expect(montado.componente.projetosExibidos()).toHaveLength(3);
    expect(montado.componente.filtroAtivo()).toBe(false);
  });
});

describe('ProjetoListagemPage — ações por tipo de usuário', () => {
  it('gestor vê "Novo Projeto", o menu ⋮ e a troca de status em cada cartão', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [projeto(1, 'Alfa'), projeto(2, 'Beta')]);
    expect(texto(montado)).toContain('Novo Projeto');
    expect(montado.elemento.querySelectorAll('[aria-label="Mais ações"]')).toHaveLength(2);
    expect(montado.elemento.querySelectorAll('[aria-label="Trocar status do projeto"]')).toHaveLength(2);
  });

  it('desenvolvedor não vê criar, menu ⋮ nem troca de status', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado, [projeto(1, 'Alfa')]);
    expect(texto(montado)).not.toContain('Novo Projeto');
    expect(montado.elemento.querySelector('[aria-label="Mais ações"]')).toBeNull();
    expect(montado.elemento.querySelector('[aria-label="Trocar status do projeto"]')).toBeNull();
    expect(texto(montado)).toContain('Alfa');
  });
});

describe('ProjetoListagemPage — Volume (tasks 197 e 199)', () => {
  it('gestor vê o alternador e, ao escolher "Volume", troca a listagem pela visão do volume', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [projeto(1, 'Alfa')]);
    expect(texto(montado)).toContain('Volume');
    expect(montado.elemento.querySelector('app-projeto-volume')).toBeNull();

    montado.componente.aoMudarVisao('VOLUME');
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-projeto-volume')).not.toBeNull();
    expect(montado.elemento.querySelector('.projeto-listagem__grid')).toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/volume'), []);

    montado.componente.aoMudarVisao('PROJETOS');
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-projeto-volume')).toBeNull();
  });

  it('desenvolvedor não vê o alternador nem a visão do volume', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado, [projeto(1, 'Alfa')]);
    expect(texto(montado)).not.toContain('Volume');
    expect(montado.elemento.querySelector('app-projeto-volume')).toBeNull();
  });
});

describe('ProjetoListagemPage — status e exclusão', () => {
  it('trocar o status muda o cartão na hora, chama PUT e avisa com toast', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [projeto(1, 'Alfa')]);
    const avisos: Array<{ detail?: string }> = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem as { detail?: string }].flat()));

    montado.componente.alterarStatus(montado.componente.projetos()[0], TipoProjetoStatusEnum.PAUSADO);
    expect(montado.componente.projetos()[0].status).toBe(TipoProjetoStatusEnum.PAUSADO);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/projeto/1');
    expect(requisicao.request.body).toEqual({ status: TipoProjetoStatusEnum.PAUSADO });
    responderSucesso(requisicao, {});
    expect(avisos.some((aviso) => aviso.detail === 'Status alterado')).toBe(true);
  });

  it('se a API recusa a troca de status, o cartão volta ao valor anterior', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [projeto(1, 'Alfa')]);
    montado.componente.alterarStatus(montado.componente.projetos()[0], TipoProjetoStatusEnum.CANCELADO);
    responderErro(esperarRequisicao(montado.http, 'PUT', '/projeto/1'), 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.projetos()[0].status).toBe(TipoProjetoStatusEnum.ATIVO);
  });

  it('excluir tira o cartão na hora, chama DELETE e oferece desfazer que restaura', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [projeto(1, 'Alfa'), projeto(2, 'Beta')]);
    montado.componente.excluir(montado.componente.projetos()[0]);
    expect(montado.componente.projetos().map((p) => p.id)).toEqual([2]);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/projeto/1'), null);

    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Projeto "Alfa" excluído');
    TestBed.inject(DesfazerService).executar();
    responderSucesso(esperarRequisicao(montado.http, 'PATCH', '/projeto/1/restaurar'), {});
  });

  it('se a API recusa a exclusão, o cartão volta', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [projeto(1, 'Alfa'), projeto(2, 'Beta')]);
    montado.componente.excluir(montado.componente.projetos()[0]);
    responderErro(esperarRequisicao(montado.http, 'DELETE', '/projeto/1'), 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.projetos().map((p) => p.id)).toEqual([1, 2]);
  });
});
