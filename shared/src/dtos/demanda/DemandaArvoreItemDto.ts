import { ApiProperty } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';
import { TagResumoDto } from '../tag/TagResumoDto';

export class DemandaArvoreItemDto {
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

  @ApiProperty({ example: 0, description: 'Profundidade na árvore (0 = raiz da consulta)' })
  nivel: number;

  @ApiProperty({ example: false })
  temDescricaoTecnica: boolean;

  @ApiProperty({ example: false })
  temDescricaoCliente: boolean;

  @ApiProperty({ example: false })
  temDocumentacao: boolean;

  @ApiProperty({ type: [TagResumoDto] })
  tags: TagResumoDto[];

  @ApiProperty({ type: () => DemandaArvoreItemDto, isArray: true })
  filhos: DemandaArvoreItemDto[];
}
