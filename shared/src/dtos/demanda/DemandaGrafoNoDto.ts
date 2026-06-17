import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';
import { DemandaPrioridadeEnum } from '../../enums/demanda-prioridade.enum';
import { TagResumoDto } from '../tag/TagResumoDto';

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

  @ApiProperty({ example: 8 })
  horasEstimadas: number;

  @ApiPropertyOptional({ example: null })
  demandaPaiId: number | null;

  @ApiProperty({ example: false })
  temDescricaoTecnica: boolean;

  @ApiProperty({ example: false })
  temDescricaoCliente: boolean;

  @ApiProperty({ example: false })
  temDocumentacao: boolean;

  @ApiProperty({ type: [TagResumoDto] })
  tags: TagResumoDto[];
}
