import { ApiProperty } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';

export class DemandaResumoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Implementar módulo de login' })
  nome: string;

  @ApiProperty({ example: 'IA › Integrador Gemini › Parser' })
  caminho: string;

  @ApiProperty({ enum: TipoDemandaStatusEnum, example: TipoDemandaStatusEnum.PLANEJADA })
  status: TipoDemandaStatusEnum;

  @ApiProperty({ example: false })
  isEstrutural: boolean;

  @ApiProperty({ example: 8 })
  horasEstimadas: number;
}
