import { describe, it, expect } from 'vitest';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { idsDoFoco, pastaAcimaDoFoco, subpastasDoFoco } from './demanda-foco-grafo.util';

function no(id: number, sobrescritas: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto {
  return {
    id, nome: `D${id}`, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, horasEstimadas: 0, minutosExecutados: 0,
    demandaPaiId: null, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...sobrescritas,
  };
}

// Pasta 1 > (demanda 2, subpasta 3 > demanda 4, subpasta vazia 5); pasta 6 vazia; demandas soltas 7 (com filha 8) e 9.
const NOS = [
  no(1, { isEstrutural: true }),
  no(2, { demandaPaiId: 1 }),
  no(3, { isEstrutural: true, demandaPaiId: 1 }),
  no(4, { demandaPaiId: 3 }),
  no(5, { isEstrutural: true, demandaPaiId: 1 }),
  no(6, { isEstrutural: true }),
  no(7),
  no(8, { demandaPaiId: 7 }),
  no(9),
];

const ordenado = (ids: Set<number>) => [...ids].sort((a, b) => a - b);

describe('idsDoFoco', () => {
  it('a pasta e tudo que está dentro, em qualquer nível', () => {
    expect(ordenado(idsDoFoco(NOS, 1))).toEqual([1, 2, 3, 4, 5]);
    expect(ordenado(idsDoFoco(NOS, 3))).toEqual([3, 4]);
  });

  it('pasta sem filhos é só ela', () => {
    expect(ordenado(idsDoFoco(NOS, 6))).toEqual([6]);
  });

  it('"Sem pasta": as demandas soltas na raiz e o que está sob elas, nunca as pastas', () => {
    expect(ordenado(idsDoFoco(NOS, null))).toEqual([7, 8, 9]);
  });

  it('pasta que não existe fica vazia', () => {
    expect(idsDoFoco(NOS, 999).size).toBe(0);
  });

  it('demanda cujo pai não está na lista conta como raiz', () => {
    expect(ordenado(idsDoFoco([no(1, { demandaPaiId: 50 })], null))).toEqual([1]);
  });
});

describe('subpastasDoFoco e pastaAcimaDoFoco', () => {
  it('lista só as subpastas diretas do foco', () => {
    expect(subpastasDoFoco(NOS, 1).map((pasta) => pasta.id)).toEqual([3, 5]);
    expect(subpastasDoFoco(NOS, 3)).toEqual([]);
    expect(subpastasDoFoco(NOS, null)).toEqual([]);
  });

  it('a pasta acima é o pai; na raiz e em "Sem pasta" não há', () => {
    expect(pastaAcimaDoFoco(NOS, 3)).toBe(1);
    expect(pastaAcimaDoFoco(NOS, 1)).toBeUndefined();
    expect(pastaAcimaDoFoco(NOS, null)).toBeUndefined();
    expect(pastaAcimaDoFoco(NOS, 999)).toBeUndefined();
  });
});
