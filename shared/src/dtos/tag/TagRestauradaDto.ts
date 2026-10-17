import { ApiProperty } from '@nestjs/swagger';

export class TagRestauradaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Backend' })
  nome: string;

  @ApiProperty({ example: '#6366f1' })
  cor: string;
}
