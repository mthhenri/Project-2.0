import { afterEach, describe, expect, it } from 'vitest';
import { DemandaDocumentacaoResumoDto, TIPOS_ANOTACAO_ORDENADOS, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { montarComponente } from '../../../../../testes/montar-componente';
import { criarUsuarioTeste } from '../../../../../testes/usuarios-teste';
import { DocumentacaoPage } from './documentacao.page';

// A tela de Documentações (task 259): demanda inicial (a em execução na primeira visita, a guardada depois), estados, divisor e pad recolhido.

const ID_LOGADO = criarUsuarioTeste().id;
const CHAVE_DEMANDA = `documentacao.demanda.${ID_LOGADO}`;

function resumo(id: number, nome: string, sobrescrita: Partial<DemandaDocumentacaoResumoDto> = {}): DemandaDocumentacaoResumoDto {
  return {
    id, projetoId: 1, projetoNome: 'Portal', demandaPaiId: null, nome, caminho: nome, status: TipoDemandaStatusEnum.PLANEJADA,
    temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, emExecucao: false, podeEditar: true, ...sobrescrita,
  };
}

function demandaCompleta(id: number, nome: string) {
  return {
    id, projetoId: 1, demandaPaiId: null, nome, descricaoTecnica: 'Técnica', descricaoCliente: null, documentacao: null, versao: 1, horasEstimadas: 8,
    status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, previsaoFimData: null, createdDate: '2026-01-15T12:00:00.000Z', podeEditar: true,
  };
}

const secoesDoPad = () => TIPOS_ANOTACAO_ORDENADOS.map((tipo, indice) => ({ id: indice + 1, usuarioId: ID_LOGADO, tipo, texto: '', updatedDate: '2026-01-15T12:00:00.000Z' }));

/** A tela pede a árvore e o pad ao nascer; as duas respostas vêm antes do primeiro `atualizar` (requisição pendente seguraria o `whenStable`). */
async function montar(lista: DemandaDocumentacaoResumoDto[], erro = false, guardada: string | null = null) {
  const montado = await montarComponente(DocumentacaoPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
  // O `montarComponente` zera o localStorage: a escolha guardada é plantada depois de montar e antes de a árvore responder.
  if (guardada !== null) localStorage.setItem(CHAVE_DEMANDA, guardada);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDoPad());
  const arvore = esperarRequisicao(montado.http, 'GET', '/demanda/documentacao');
  if (erro) responderErro(arvore, 500, 'Erro interno');
  else responderSucesso(arvore, lista);
  await montado.atualizar();
  return montado;
}

const texto = (montado: Awaited<ReturnType<typeof montar>>) => montado.elemento.textContent ?? '';

afterEach(() => localStorage.clear());

describe('DocumentacaoPage', () => {
  it('na primeira visita sem execução rodando mostra "Em que demanda você está trabalhando?" e o pad continua ao lado', async () => {
    const montado = await montar([resumo(1, 'Autenticação')]);
    expect(texto(montado)).toContain('Em que demanda você está trabalhando?');
    expect(texto(montado)).toContain('Escolher demanda');
    expect(montado.elemento.querySelector('.documentacao__pad')).not.toBeNull();
    expect(montado.elemento.querySelector('app-documentacao-demanda')).toBeNull();
  });

  it('na primeira visita com execução rodando abre a demanda dela', async () => {
    const montado = await montarComponente(DocumentacaoPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDoPad());
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/documentacao'), [resumo(1, 'Autenticação'), resumo(2, 'Tela de login', { emExecucao: true })]);
    await montado.atualizar();
    expect(montado.componente.escolhidaId()).toBe(2);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/2'), demandaCompleta(2, 'Tela de login'));
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-documentacao-demanda h2')?.textContent).toContain('Tela de login');
  });

  it('a demanda guardada vence a execução rodando', async () => {
    const montado = await montarComponente(DocumentacaoPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    localStorage.setItem(CHAVE_DEMANDA, '1');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDoPad());
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/documentacao'), [resumo(1, 'Autenticação'), resumo(2, 'Tela de login', { emExecucao: true })]);
    await montado.atualizar();
    expect(montado.componente.escolhidaId()).toBe(1);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/1'), demandaCompleta(1, 'Autenticação'));
    await montado.atualizar();
  });

  it('demanda guardada que deixou de existir ou de ser acessível volta ao estado "escolha uma" e esquece a escolha', async () => {
    const montado = await montar([resumo(1, 'Autenticação')], false, '99');
    expect(montado.componente.escolhidaId()).toBeNull();
    expect(texto(montado)).toContain('Em que demanda você está trabalhando?');
    expect(localStorage.getItem(CHAVE_DEMANDA)).toBeNull();
  });

  it('erro ao carregar a árvore mostra "Tentar de novo"', async () => {
    const montado = await montar([], true);
    expect(montado.elemento.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar as demandas');
    expect(Array.from(montado.elemento.querySelectorAll('button')).some((item) => item.textContent?.includes('Tentar de novo'))).toBe(true);
  });

  it('o divisor respeita 34% a 72%, o duplo clique volta a 56% e a divisão fica guardada', async () => {
    const montado = await montar([resumo(1, 'Autenticação')]);
    const divisor = montado.elemento.querySelector<HTMLElement>('.documentacao__divisor')!;
    expect(divisor.getAttribute('aria-valuenow')).toBe('56');

    for (let vez = 0; vez < 20; vez++) divisor.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await montado.atualizar();
    expect(divisor.getAttribute('aria-valuenow')).toBe('72');
    expect(localStorage.getItem('documentacao.divisao')).toBe('72');

    divisor.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await montado.atualizar();
    expect(divisor.getAttribute('aria-valuenow')).toBe('56');
  });

  it('recolher o pad dá a largura toda à demanda, guarda a escolha e "Mostrar o pad" traz de volta', async () => {
    const montado = await montar([resumo(1, 'Autenticação')]);
    montado.componente.alternarPad();
    await montado.atualizar();
    expect(montado.elemento.querySelector('.documentacao__pad')).toBeNull();
    expect(localStorage.getItem('documentacao.pad.recolhido')).toBe('true');
    const mostrar = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes('Mostrar o pad'));
    expect(mostrar).toBeDefined();

    mostrar!.click();
    await montado.atualizar();
    expect(montado.elemento.querySelector('.documentacao__pad')).not.toBeNull();
  });

  it('trocar de demanda com texto sem gravar pede confirmação; sem alteração troca direto', async () => {
    const montado = await montar([resumo(1, 'Autenticação'), resumo(2, 'Relatórios')]);
    montado.componente.escolher(1);
    montado.fixture.detectChanges();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/1'), demandaCompleta(1, 'Autenticação'));
    await montado.atualizar();
    expect(montado.componente.escolhidaId()).toBe(1);

    montado.componente.sujo.set(true);
    montado.componente.escolher(2);
    await montado.atualizar();
    expect(montado.componente.escolhidaId()).toBe(1);
    expect(document.body.textContent).toContain('Há texto desta demanda que ainda não foi gravado');
  });
});
