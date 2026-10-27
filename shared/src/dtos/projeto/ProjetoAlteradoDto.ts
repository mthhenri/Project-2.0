import { ApiProperty } from '@nestjs/swagger';
import { TipoProjetoStatusEnum } from '../../enums/tipo-projeto-status.enum';

export class ProjetoAlteradoDto {
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

  @ApiProperty({ example: '2026-01-01', nullable: true })
  inicioData: string | null;

  @ApiProperty({ example: '2026-12-31', nullable: true })
  previsaoFimData: string | null;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  createdDate: Date;
}
