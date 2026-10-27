import { ProjetoVolumeVigenciaCriarDto, LIMITE_VOLUME_ESPERADO_HORAS_MES } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';

/** Valida a data de calendário e o volume explícito e normaliza a vigência para o primeiro dia. */
export function normalizarVolumeVigencia(dto: ProjetoVolumeVigenciaCriarDto): ProjetoVolumeVigenciaCriarDto {
  const data = new Date(`${dto.vigenciaInicioData}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.vigenciaInicioData) || !Number.isFinite(data.getTime())
      || data.toISOString().slice(0, 10) !== dto.vigenciaInicioData || data.getUTCFullYear() < 1) {
    throw new BusinessException('Informe uma data válida para a vigência');
  }
  if (dto.volumeEsperadoHoras !== null && (!Number.isInteger(dto.volumeEsperadoHoras)
      || dto.volumeEsperadoHoras < 0 || dto.volumeEsperadoHoras > LIMITE_VOLUME_ESPERADO_HORAS_MES)) {
    throw new BusinessException(`Informe horas inteiras entre 0 e ${LIMITE_VOLUME_ESPERADO_HORAS_MES}, ou sem volume`);
  }
  return { ...dto, vigenciaInicioData: `${dto.vigenciaInicioData.slice(0, 7)}-01` };
}
