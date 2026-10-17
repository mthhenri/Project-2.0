/** O que a ferramenta `consultar_data_e_hora` devolve à IA. */
export interface DataHoraConsultadaDto {
  /** `yyyy-mm-dd` no fuso do sistema. */
  data: string;
  /** `HH:mm` no fuso do sistema. */
  hora: string;
  diaDaSemana: string;
  fusoHorario: string;
}
