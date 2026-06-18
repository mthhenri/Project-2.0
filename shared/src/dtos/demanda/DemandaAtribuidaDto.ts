import { ApiProperty } from '@nestjs/swagger';

export class DemandaAtribuidaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Implementar módulo de login' })
  nome: string;

  @ApiProperty({ example: 3 })
  projetoId: number;

  @ApiProperty({ example: 'Portal do Cliente' })
  nomeProjeto: string;
}
