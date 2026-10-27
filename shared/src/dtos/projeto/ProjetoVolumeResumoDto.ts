import { ApiProperty } from '@nestjs/swagger';

/** Um projeto na visão "Volume do mês": horas gastas (execuções encerradas do mês) × volume esperado. */
export class ProjetoVolumeResumoDto {
  @ApiProperty({ example: 1 })
  projetoId: number;

  @ApiProperty({ example: 'Sistema de Gestão' })
  nome: string;

  @ApiProperty({ example: 'PROJ-001' })
  codigo: string;

  @ApiProperty({ example: '#6366f1' })
  cor: string;

  @ApiProperty({ example: 720, description: 'Minutos das execuções encerradas do mês' })
  minutosGastos: number;

  @ApiProperty({ example: 40, nullable: true, description: 'Horas esperadas vigentes no mês consultado; null = sem volume' })
  volumeEsperadoHorasMes: number | null;
}
