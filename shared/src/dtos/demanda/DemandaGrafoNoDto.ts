import { ApiProperty } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';
import { DemandaPrioridadeEnum } from '../../enums/demanda-prioridade.enum';

export class DemandaGrafoNoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Implementar módulo de login' })
  nome: string;

  @ApiProperty({ enum: DemandaStatusEnum, example: DemandaStatusEnum.PLANEJADA })
  status: DemandaStatusEnum;

  @ApiProperty({ enum: DemandaPrioridadeEnum, example: DemandaPrioridadeEnum.MEDIA })
  prioridade: DemandaPrioridadeEnum;

  @ApiProperty({ example: false })
  isEstrutural: boolean;
}
