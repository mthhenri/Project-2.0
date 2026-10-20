/** Uma linha (projeto × mês) devolvida pelo repository para a visão anual do volume; a service agrupa por projeto. */
export class ProjetoVolumeMesDto {
  projetoId: number;
  nome: string;
  codigo: string;
  cor: string;
  volumeEsperadoHorasMes: number | null;
  /** 1 a 12 */
  mes: number;
  minutosGastos: number;
}
