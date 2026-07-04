import { ApiProperty } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';
import { ExecutorAtivoDto } from './ExecutorAtivoDto';

/**
 * Recorte computado da visão de Planejamento (gestor): uma demanda não-concluída
 * (estrutural ou folha) com o caminho hierárquico e os agregados de horas estimadas ×
 * executadas e quem está executando agora. Demandas estruturais também podem ter
 * atividades/execuções próprias e horas estimadas ("horas máximas"), então também
 * entram como linha — `minutosExecutados` continua sendo só das atividades diretas
 * (sem rollup recursivo dos filhos).
 */
export class DemandaPlanejamentoDto {
  @ApiProperty({ example: 1 })
  demandaId: number;

  @ApiProperty({ example: 'IA › Integrador Gemini › Ajuste de prompt' })
  caminho: string;

  @ApiProperty({ example: false, description: 'Demanda estrutural (pode ter sub-demandas); também aparece no planejamento' })
  isEstrutural: boolean;

  @ApiProperty({ enum: TipoDemandaStatusEnum, example: TipoDemandaStatusEnum.PLANEJADA })
  status: TipoDemandaStatusEnum;

  @ApiProperty({ example: 8 })
  horasEstimadas: number;

  @ApiProperty({ example: 120, description: 'Soma das execuções das atividades diretas; inclui a execução aberta como se encerrasse agora' })
  minutosExecutados: number;

  @ApiProperty({ type: [ExecutorAtivoDto] })
  executoresAtivos: ExecutorAtivoDto[];
}
