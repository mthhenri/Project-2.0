import { describe, expect, it } from 'vitest';
import { TipoAtividadeStatusEnum } from '@project20/shared';
import { ItemDoChecklist, ordenarChecklist, percentualDesenvolvidas, rotuloDesenvolvidas } from './minhas-demandas.util';

const item = (id: number, status: TipoAtividadeStatusEnum, emExecucao = false): ItemDoChecklist => ({ id, nome: `A${id}`, status, emExecucao, minutosExecutados: 0, totalExecucoes: 0 });

describe('minhas demandas: rótulo e percentual', () => {
  it('diz quantas atividades estão desenvolvidas, ou que não há atividades', () => {
    expect(rotuloDesenvolvidas(2, 5)).toBe('2 de 5 desenvolvidas');
    expect(rotuloDesenvolvidas(0, 0)).toBe('Sem atividades');
  });

  it('calcula o percentual sem passar de 100 nem dividir por zero', () => {
    expect(percentualDesenvolvidas(1, 4)).toBe(25);
    expect(percentualDesenvolvidas(5, 5)).toBe(100);
    expect(percentualDesenvolvidas(0, 0)).toBe(0);
  });
});

describe('ordenarChecklist', () => {
  it('põe as desenvolvidas primeiro, depois a que roda e por fim as em aberto, mantendo a ordem dentro de cada grupo', () => {
    const ordenado = ordenarChecklist([
      item(1, TipoAtividadeStatusEnum.PLANEJADA),
      item(2, TipoAtividadeStatusEnum.DESENVOLVENDO, true),
      item(3, TipoAtividadeStatusEnum.DESENVOLVIDA),
      item(4, TipoAtividadeStatusEnum.PENDENTE),
      item(5, TipoAtividadeStatusEnum.DESENVOLVIDA),
    ]);
    expect(ordenado.map((atividade) => atividade.id)).toEqual([3, 5, 2, 1, 4]);
  });

  it('não altera a lista recebida', () => {
    const original = [item(1, TipoAtividadeStatusEnum.PLANEJADA), item(2, TipoAtividadeStatusEnum.DESENVOLVIDA)];
    ordenarChecklist(original);
    expect(original.map((atividade) => atividade.id)).toEqual([1, 2]);
  });
});
