/** Achado da revisão por IA — value-object por inconsistência. */
export class RelatorioInconsistenciaDto {
  tipo: string;               // ex.: "DESCRICAO_VAGA", "DURACAO_SUSPEITA", "DIA_NAO_UTIL"
  severidade: string;         // "BAIXA" | "MEDIA" | "ALTA" (string livre nesta fase)
  descricao: string;          // explicação legível do problema
  referencia: string | null;  // identificação da linha (ex.: "demanda / atividade / data") ou null
}
