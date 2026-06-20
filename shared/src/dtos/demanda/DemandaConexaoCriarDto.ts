import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class DemandaConexaoCriarDto {
  /**
   * Demanda de origem da conexão. Injetada pela controller a partir de `@Param('id')`
   * (§7.2) — não enviada no corpo; opcional na validação por isso.
   */
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  demandaOrigemId?: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  demandaDestinoId: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  ehBidirecional: boolean;
}
