import { ApiProperty } from '@nestjs/swagger';
import { TipoProjetoStatusEnum } from '../../enums/tipo-projeto-status.enum';

export class ProjetoResumoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Sistema de Gestão' })
  nome: string;

  @ApiProperty({ example: 'PROJ-001' })
  codigo: string;

  @ApiProperty({ example: '#6366f1' })
  cor: string;

  @ApiProperty({ enum: TipoProjetoStatusEnum, example: TipoProjetoStatusEnum.ATIVO })
  status: TipoProjetoStatusEnum;
}
