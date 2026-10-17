import { ApiProperty } from '@nestjs/swagger';

export class ProjetoRestauradoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Sistema de Gestão' })
  nome: string;

  @ApiProperty({ example: 'PROJ-001' })
  codigo: string;

  @ApiProperty({ example: '#6366f1' })
  cor: string;
}
