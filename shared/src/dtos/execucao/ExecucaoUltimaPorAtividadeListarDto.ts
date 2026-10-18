import { IsArray, IsInt } from 'class-validator';

/** Pede a data da última execução de cada atividade da lista (uso interno da leitura de atividades paradas, só do gestor). */
export class ExecucaoUltimaPorAtividadeListarDto {
  @IsArray()
  @IsInt({ each: true })
  atividadeIds: number[];
}

/** A última execução (a maior entre o fim e agora, se ainda em andamento) de uma atividade. */
export class ExecucaoUltimaPorAtividadeDto {
  atividadeId: number;
  ultimaData: Date;
}
