import { describe, expect, it } from 'vitest';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';
import {
  ancestraisDaPasta,
  caminhoDaPasta,
  construirPastas,
  contarSemPasta,
  demandasDaPasta,
  lerPastaDaUrl,
  listarPastasEmOrdem,
  pastaDaDemanda,
  pastaInicial,
  pastaParaUrl,
} from './demanda-pasta.util';

function no(id: number, nome: string, opcoes: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto {
  return {
    id, nome, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 0, minutosExecutados: 0, demandaPaiId: null,
    temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...opcoes,
  };
}

// Projeto: Ajustes (raiz, sem pasta) · Autenticação (pasta) → Login, Senha, Sessão (sub-pasta) → Token · Relatórios (pasta vazia)
const NOS = [
  no(1, 'Ajustes gerais'),
  no(2, 'Autenticação', { isEstrutural: true }),
  no(3, 'Tela de login', { demandaPaiId: 2 }),
  no(4, 'Recuperar senha', { demandaPaiId: 2 }),
  no(5, 'Sessão e segurança', { isEstrutural: true, demandaPaiId: 2 }),
  no(6, 'Validar token', { demandaPaiId: 5 }),
  no(7, 'Relatórios', { isEstrutural: true }),
];

describe('demanda-pasta.util', () => {
  it('as pastas são só as demandas de estrutura, em árvore, com a contagem das demandas diretas', () => {
    const pastas = construirPastas(NOS);
    expect(pastas.map((pasta) => [pasta.nome, pasta.quantidade, pasta.nivel])).toEqual([['Autenticação', 2, 0], ['Relatórios', 0, 0]]);
    expect(pastas[0].filhas.map((pasta) => [pasta.nome, pasta.quantidade, pasta.nivel])).toEqual([['Sessão e segurança', 1, 1]]);
    expect(listarPastasEmOrdem(pastas).map((pasta) => pasta.nome)).toEqual(['Autenticação', 'Sessão e segurança', 'Relatórios']);
  });

  it('a pasta mostra só as demandas que estão direto nela; "Sem pasta" são as da raiz que não são de estrutura', () => {
    expect(demandasDaPasta(NOS, 2).map((item) => item.nome)).toEqual(['Tela de login', 'Recuperar senha']);
    expect(demandasDaPasta(NOS, 5).map((item) => item.nome)).toEqual(['Validar token']);
    expect(demandasDaPasta(NOS, 7)).toEqual([]);
    expect(demandasDaPasta(NOS, null).map((item) => item.nome)).toEqual(['Ajustes gerais']);
    expect(contarSemPasta(NOS)).toBe(1);
  });

  it('uma demanda com o pai fora da lista conta como da raiz', () => {
    const solta = no(9, 'Órfã', { demandaPaiId: 999 });
    expect(demandasDaPasta([solta], null).map((item) => item.id)).toEqual([9]);
  });

  it('acha a pasta de uma demanda: a do pai; a própria, se é de estrutura; null na raiz; undefined se não existe', () => {
    expect(pastaDaDemanda(NOS, 3)).toBe(2);
    expect(pastaDaDemanda(NOS, 6)).toBe(5);
    expect(pastaDaDemanda(NOS, 5)).toBe(5);
    expect(pastaDaDemanda(NOS, 1)).toBeNull();
    expect(pastaDaDemanda(NOS, 404)).toBeUndefined();
  });

  it('o caminho e os ancestrais da pasta vão do topo até ela', () => {
    expect(ancestraisDaPasta(NOS, 5)).toEqual([2]);
    expect(ancestraisDaPasta(NOS, 2)).toEqual([]);
    expect(caminhoDaPasta(NOS, 5)).toEqual(['Autenticação', 'Sessão e segurança']);
    expect(caminhoDaPasta(NOS, null)).toEqual(['Sem pasta']);
  });

  it('lê e escreve a pasta na URL; valor vazio ou inválido é ignorado', () => {
    expect(lerPastaDaUrl('sem-pasta')).toBeNull();
    expect(lerPastaDaUrl('5')).toBe(5);
    expect(lerPastaDaUrl(null)).toBeUndefined();
    expect(lerPastaDaUrl('')).toBeUndefined();
    expect(lerPastaDaUrl('abc')).toBeUndefined();
    expect(lerPastaDaUrl('-3')).toBeUndefined();
    expect(pastaParaUrl(null)).toBe('sem-pasta');
    expect(pastaParaUrl(5)).toBe('5');
  });

  it('a pasta de partida: a da URL se existe; senão Sem pasta, se tem demandas; senão a primeira pasta', () => {
    expect(pastaInicial(NOS, 5)).toBe(5);
    expect(pastaInicial(NOS, null)).toBeNull();
    expect(pastaInicial(NOS, 404)).toBeNull();
    expect(pastaInicial(NOS, 3)).toBeNull();
    expect(pastaInicial(NOS.filter((item) => item.id !== 1), undefined)).toBe(2);
    expect(pastaInicial([], undefined)).toBeNull();
  });
});
