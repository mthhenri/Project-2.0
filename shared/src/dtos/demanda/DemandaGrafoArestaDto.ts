import { ApiProperty } from '@nestjs/swagger';

export class DemandaGrafoArestaDto {
  @ApiProperty({ example: 1 })
  origemId: number;

  @ApiProperty({ example: 2 })
  destinoId: number;

  @ApiProperty({ example: false })
  ehBidirecional: boolean;
}
