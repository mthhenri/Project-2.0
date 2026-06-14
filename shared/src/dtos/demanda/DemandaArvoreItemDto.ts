import { ApiProperty } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';
import { DemandaPrioridadeEnum } from '../../enums/demanda-prioridade.enum';

export class DemandaArvoreItemDto {
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

  @ApiProperty({ example: 0, description: 'Profundidade na árvore (0 = raiz da consulta)' })
  nivel: number;

  @ApiProperty({ type: () => DemandaArvoreItemDto, isArray: true })
  filhos: DemandaArvoreItemDto[];
}
