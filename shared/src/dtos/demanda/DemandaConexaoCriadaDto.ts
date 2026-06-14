import { ApiProperty } from '@nestjs/swagger';

export class DemandaConexaoCriadaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  demandaOrigemId: number;

  @ApiProperty({ example: 2 })
  demandaDestinoId: number;

  @ApiProperty({ example: false })
  ehBidirecional: boolean;

  @ApiProperty()
  createdDate: Date;
}
