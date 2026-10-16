import { ApiProperty } from '@nestjs/swagger';

export class DemandaRestauradaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  projetoId: number;

  @ApiProperty({ example: 'Módulo de relatórios' })
  nome: string;
}
