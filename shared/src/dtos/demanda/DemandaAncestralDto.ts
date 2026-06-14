import { ApiProperty } from '@nestjs/swagger';

export class DemandaAncestralDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Módulo de autenticação' })
  nome: string;

  @ApiProperty({ example: 1, description: 'Distância até a demanda consultada (1 = pai direto)' })
  nivel: number;
}
