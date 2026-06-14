import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';
import { DemandaPrioridadeEnum } from '../../enums/demanda-prioridade.enum';

export class DemandaCriadaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  projetoId: number;

  @ApiPropertyOptional({ example: null })
  demandaPaiId: number | null;

  @ApiProperty({ example: 'Implementar módulo de login' })
  nome: string;

  @ApiProperty({ example: 8 })
  horasEstimadas: number;

  @ApiProperty({ enum: DemandaPrioridadeEnum, example: DemandaPrioridadeEnum.MEDIA })
  prioridade: DemandaPrioridadeEnum;

  @ApiProperty({ enum: DemandaStatusEnum, example: DemandaStatusEnum.PLANEJADA })
  status: DemandaStatusEnum;

  @ApiProperty({ example: false })
  isEstrutural: boolean;

  @ApiPropertyOptional({ example: '2026-12-31' })
  previsaoFimData: string | null;

  @ApiProperty({ example: 0 })
  ordemExibicao: number;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  createdDate: string;
}
