import { ApiProperty } from '@nestjs/swagger';

export class DemandaConexaoResumoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 2 })
  demandaConectadaId: number;

  @ApiProperty({ example: 'Nome da Demanda Conectada' })
  nomeDemandaConectada: string;

  @ApiProperty({ example: 'saida', enum: ['saida', 'entrada', 'bidirecional'] })
  direcao: 'saida' | 'entrada' | 'bidirecional';
}
