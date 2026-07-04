import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';
import { TagResumoDto } from '../tag/TagResumoDto';

export class DemandaGrafoNoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Implementar módulo de login' })
  nome: string;

  @ApiProperty({ enum: TipoDemandaStatusEnum, example: TipoDemandaStatusEnum.PLANEJADA })
  status: TipoDemandaStatusEnum;

  @ApiProperty({ example: false })
  isEstrutural: boolean;

  @ApiProperty({ example: 8 })
  horasEstimadas: number;

  @ApiProperty({ example: 120 })
  minutosExecutados: number;

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
