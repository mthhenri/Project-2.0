import { IsDateString } from 'class-validator';

/** Entrada da ferramenta `consultar_mudancas_da_queda`: o instante a partir do qual olhar (o da última mensagem da conversa). */
export class MudancasDaQuedaConsultarDto {
  @IsDateString()
  desde: string;
}

/** Uma execução do usuário como a ferramenta a conta. */
export interface MudancaDeExecucaoDto {
  atividade: string;
  demanda: string;
  descricao: string;
  /** ISO 8601. */
  inicio: string;
  /** ISO 8601; `null` na execução em andamento. */
  fim: string | null;
}

/** Uma atividade criada depois do instante consultado. */
export interface MudancaDeAtividadeDto {
  nome: string;
  demanda: string;
  /** ISO 8601. */
  criadaEm: string;
}

/** O que a ferramenta `consultar_mudancas_da_queda` devolve: o que mudou no sistema depois de `desde`, feito sem a IA. */
export interface MudancasDaQuedaConsultadasDto {
  desde: string;
  /** Começaram depois de `desde`. */
  execucoesIniciadas: MudancaDeExecucaoDto[];
  /** Terminaram depois de `desde` (inclusive as que começaram antes). */
  execucoesEncerradas: MudancaDeExecucaoDto[];
  /** A execução em andamento agora, ou `null`. */
  execucaoAtiva: MudancaDeExecucaoDto | null;
  atividadesCriadas: MudancaDeAtividadeDto[];
  /** Nada mudou desde `desde`. */
  semMudancas: boolean;
}
