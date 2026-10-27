import { describe, expect, it } from 'vitest';
import { DemandaDocumentacaoResumoDto, TipoDemandaStatusEnum } from '@project20/shared';
import {
  caminhoDaDemanda, demandaEmExecucao, divisaoPeloPonteiro, DIVISAO_DA_TELA, limitarDivisao, montarArvoreDocumentacao, recortarPelaBusca, textosPreenchidos,
} from './documentacao-arvore.util';

function demanda(id: number, nome: string, sobrescrita: Partial<DemandaDocumentacaoResumoDto> = {}): DemandaDocumentacaoResumoDto {
  return {
    id, projetoId: 1, projetoNome: 'Portal', demandaPaiId: null, nome, caminho: nome, status: TipoDemandaStatusEnum.PLANEJADA,
    temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, emExecucao: false, podeEditar: true, ...sobrescrita,
  };
}

const ITENS = [
  demanda(1, 'Autenticação'),
  demanda(2, 'Tela de login', { demandaPaiId: 1, caminho: 'Autenticação › Tela de login' }),
  demanda(3, 'Recuperação de senha', { demandaPaiId: 1, caminho: 'Autenticação › Recuperação de senha' }),
  demanda(4, 'Relatórios', { projetoId: 2, projetoNome: 'Financeiro' }),
];

describe('árvore da tela de Documentações', () => {
  it('monta projeto → demandas aninhadas, e a demanda cuja mãe não veio vira raiz do projeto', () => {
    const arvore = montarArvoreDocumentacao(ITENS);
    expect(arvore.map((no) => no.nome)).toEqual(['Portal', 'Financeiro']);
    const portal = arvore[0];
    expect(portal.filhos.map((no) => no.nome)).toEqual(['Autenticação']);
    expect(portal.filhos[0].filhos.map((no) => no.nome)).toEqual(['Tela de login', 'Recuperação de senha']);

    const semMae = montarArvoreDocumentacao([demanda(9, 'Órfã', { demandaPaiId: 77 })]);
    expect(semMae[0].filhos.map((no) => no.nome)).toEqual(['Órfã']);
  });

  it('a busca ignora acento e caixa e mantém os ancestrais, abrindo-os', () => {
    const recorte = recortarPelaBusca(ITENS, 'RECUPERACAO');
    expect([...recorte.visiveis].sort()).toEqual([1, 3]);
    expect(recorte.correspondentes).toBe(1);
    expect(recorte.expandir.has('projeto-1')).toBe(true);
    expect(recorte.expandir.has('demanda-1')).toBe(true);
    expect(recorte.projetosVisiveis.has(2)).toBe(false);
  });

  it('o nome do projeto também encontra as demandas dele; termo vazio mostra tudo; sem resultado, nada', () => {
    expect(recortarPelaBusca(ITENS, 'financeiro').visiveis.has(4)).toBe(true);
    expect(recortarPelaBusca(ITENS, '   ').visiveis.size).toBe(4);
    expect(recortarPelaBusca(ITENS, 'zzz').correspondentes).toBe(0);
  });

  it('o caminho mostra projeto e mães, sem o nome da própria demanda', () => {
    expect(caminhoDaDemanda(ITENS[1])).toBe('Portal › Autenticação');
    expect(caminhoDaDemanda(ITENS[0])).toBe('Portal');
  });

  it('a demanda com execução rodando é a da primeira visita; sem execução, nenhuma', () => {
    expect(demandaEmExecucao(ITENS)).toBeNull();
    expect(demandaEmExecucao([...ITENS, demanda(5, 'Rodando', { emExecucao: true })])?.id).toBe(5);
  });

  it('conta os textos preenchidos', () => {
    expect(textosPreenchidos(demanda(1, 'x', { temDescricaoTecnica: true, temDocumentacao: true }))).toBe(2);
  });
});

describe('divisão entre a demanda e o pad', () => {
  it('limita entre 34% e 72% e volta ao padrão de 56% se o valor é ilegível', () => {
    expect(limitarDivisao(10)).toBe(34);
    expect(limitarDivisao(90)).toBe(72);
    expect(limitarDivisao(60)).toBe(60);
    expect(limitarDivisao(Number.NaN)).toBe(DIVISAO_DA_TELA.padrao);
  });

  it('pelo ponteiro: a demanda ocupa o que está à esquerda dele', () => {
    expect(divisaoPeloPonteiro(600, 0, 1000)).toBe(60);
    expect(divisaoPeloPonteiro(100, 0, 1000)).toBe(34);
    expect(divisaoPeloPonteiro(950, 0, 1000)).toBe(72);
    expect(divisaoPeloPonteiro(500, 0, 0)).toBe(56);
  });
});
