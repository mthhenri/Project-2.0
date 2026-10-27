import { ApiProperty } from '@nestjs/swagger';

/** Um projeto na visão anual do volume: minutos gastos em cada mês do ano (execuções encerradas) e o volume esperado por mês. */
export class ProjetoVolumeAnualResumoDto {
  @ApiProperty({ example: 1 })
  projetoId: number;

  @ApiProperty({ example: 'Sistema de Gestão' })
  nome: string;

  @ApiProperty({ example: 'PROJ-001' })
  codigo: string;

  @ApiProperty({ example: '#6366f1' })
  cor: string;

  @ApiProperty({ type: [Number], example: [160, 160, 160, 120, 120, 120, 120, 120, 120, 120, 120, 120], description: 'Doze posições, janeiro a dezembro, em horas; null no mês sem volume definido' })
  volumeEsperadoHorasPorMes: (number | null)[];

  @ApiProperty({ type: [Number], example: [0, 0, 0, 0, 0, 0, 0, 0, 60, 918, 0, 0], description: 'Doze posições, janeiro a dezembro, em minutos' })
  minutosGastosPorMes: number[];
}
