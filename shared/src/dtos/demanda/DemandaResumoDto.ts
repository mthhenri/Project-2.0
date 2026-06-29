import { ApiProperty } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';

export class DemandaResumoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Implementar módulo de login' })
  nome: string;

  @ApiProperty({ enum: DemandaStatusEnum, example: DemandaStatusEnum.PLANEJADA })
  status: DemandaStatusEnum;

  @ApiProperty({ example: false })
  isEstrutural: boolean;

  @ApiProperty({ example: 8 })
  horasEstimadas: number;
}
