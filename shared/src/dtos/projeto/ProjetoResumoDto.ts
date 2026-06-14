import { ApiProperty } from '@nestjs/swagger';
import { ProjetoStatusEnum } from '../../enums/projeto-status.enum';

export class ProjetoResumoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Sistema de Gestão' })
  nome: string;

  @ApiProperty({ example: 'PROJ-001' })
  codigo: string;

  @ApiProperty({ example: '#6366f1' })
  cor: string;

  @ApiProperty({ enum: ProjetoStatusEnum, example: ProjetoStatusEnum.ATIVO })
  status: ProjetoStatusEnum;
}
