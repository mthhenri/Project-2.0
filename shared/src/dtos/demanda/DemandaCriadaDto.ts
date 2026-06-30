import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';

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

  @ApiProperty({ enum: TipoDemandaStatusEnum, example: TipoDemandaStatusEnum.PLANEJADA })
  status: TipoDemandaStatusEnum;

  @ApiProperty({ example: false })
  isEstrutural: boolean;

  @ApiPropertyOptional({ example: '2026-12-31' })
  previsaoFimData: string | null;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  createdDate: string;
}
