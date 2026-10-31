import { ConversaDiretaSupervisaoResumoDto } from './ConversaDiretaSupervisaoResumoDto';

/** Uma página das conversas supervisionáveis, da que teve mensagem mais recente para a mais antiga. */
export interface ConversaDiretaSupervisaoListadasDto {
  conversas: ConversaDiretaSupervisaoResumoDto[];
  /** Quantas conversas casam, em todas as páginas. */
  total: number;
  pagina: number;
  porPagina: number;
}
