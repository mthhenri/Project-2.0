import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

/** Linha do relatório — value-object por execução. */
export class RelatorioExecucaoLinhaDto {
  nomeProjeto: string;
  nomeDemanda: string;
  nomeAtividade: string;
  nomeUsuario: string;
  dataExecucao: string;       // DATE(inicio_data), YYYY-MM-DD
  inicioData: Date;           // hora de início
  fimData: Date | null;       // hora de fim (null = em andamento)
  duracaoMinutos: number;     // tempo executado, em minutos
  descricao: string;
  statusAtividade: TipoAtividadeStatusEnum;
}
