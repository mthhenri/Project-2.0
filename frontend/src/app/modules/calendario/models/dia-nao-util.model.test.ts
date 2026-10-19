import { describe, it } from 'vitest';
import * as assert from 'node:assert/strict';
import { TipoDiaNaoUtilDuracaoEnum, TipoDiaNaoUtilEnum } from '@project20/shared';
import {
  classeTagTipoDiaNaoUtil,
  dataComDiaDaSemana,
  formatarDataIso,
  partesDaData,
  rotuloDuracaoDiaNaoUtil,
  rotuloTipoDiaNaoUtil,
} from './dia-nao-util.model';

// Funções puras do calendário: a data do p-datepicker vira ISO sem deslocar de fuso, e a data do backend não recua um dia.
describe('dia-nao-util.model', () => {
  it('formatarDataIso usa os componentes locais (sem deslocar pelo fuso)', () => {
    assert.equal(formatarDataIso(new Date(2026, 0, 5)), '2026-01-05');
    assert.equal(formatarDataIso(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  });

  it('partesDaData lê data pura como dia local, sem recuar um dia', () => {
    assert.deepEqual(partesDaData('2026-03-01'), { ano: 2026, mes: 3, dia: 1 });
    assert.deepEqual(partesDaData('2026-12-31'), { ano: 2026, mes: 12, dia: 31 });
  });

  it('dataComDiaDaSemana: recorrente usa o ano de referência, e o pontual o próprio ano', () => {
    assert.equal(dataComDiaDaSemana('2020-12-25', 2027), 'sáb, 25/12');
    assert.equal(dataComDiaDaSemana('2026-12-25'), 'sex, 25/12');
  });

  it('rótulos de tipo e duração, e classe de marca por tipo', () => {
    assert.equal(rotuloTipoDiaNaoUtil(TipoDiaNaoUtilEnum.PONTO_FACULTATIVO), 'Ponto Facultativo');
    assert.equal(rotuloDuracaoDiaNaoUtil(TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO), 'Meio período');
    assert.equal(classeTagTipoDiaNaoUtil(TipoDiaNaoUtilEnum.RECESSO), 'marca-tag marca-tag--recesso');
  });
});
