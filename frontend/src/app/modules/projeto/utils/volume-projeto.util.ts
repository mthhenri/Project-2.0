import { ProjetoVolumeResumoDto } from '@project20/shared';

/** Um projeto da visão "Volume do mês" com os derivados de apresentação (percentual, barra, estouro). */
export interface VolumeProjetoLinha extends ProjetoVolumeResumoDto {
  /** Volume esperado em minutos; `null` = não definido. */
  minutosEsperados: number | null;
  /** Gasto ÷ esperado, arredondado; `null` sem volume esperado (ou esperado 0). */
  percentual: number | null;
  /** Preenchimento da barra, de 0 a 100. */
  percentualBarra: number;
  /** Gastou mais do que o esperado (acima de 100%). */
  estourou: boolean;
}

export function montarLinhaDeVolume(item: ProjetoVolumeResumoDto): VolumeProjetoLinha {
  const minutosEsperados = item.volumeEsperadoHorasMes === null ? null : item.volumeEsperadoHorasMes * 60;
  const percentual = minutosEsperados ? Math.round((item.minutosGastos / minutosEsperados) * 100) : null;
  return {
    ...item,
    minutosEsperados,
    percentual,
    percentualBarra: percentual === null ? 0 : Math.min(100, percentual),
    estourou: minutosEsperados !== null && item.minutosGastos > minutosEsperados,
  };
}
