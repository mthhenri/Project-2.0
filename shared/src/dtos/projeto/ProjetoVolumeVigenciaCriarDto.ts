import { IsDateString, IsInt, Matches, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const LIMITE_VOLUME_ESPERADO_HORAS_MES = 100000;

export class ProjetoVolumeVigenciaCriarDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projetoId: number;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  vigenciaInicioData: string;

  @ApiProperty({ example: 160, nullable: true })
  @ValidateIf((_objeto: unknown, valor: unknown) => valor !== null)
  @IsInt()
  @Min(0)
  @Max(LIMITE_VOLUME_ESPERADO_HORAS_MES)
  volumeEsperadoHoras: number | null;
}
