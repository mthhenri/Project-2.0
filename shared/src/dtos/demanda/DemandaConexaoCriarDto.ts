import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, Min } from 'class-validator';

export class DemandaConexaoCriarDto {
  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  demandaDestinoId: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  ehBidirecional: boolean;
}
