/** Uma mudança de volume: null suspende a definição a partir do mês. */
export class ProjetoVolumeVigenciaResumoDto {
  id: number;
  projetoId: number;
  vigenciaInicioData: string;
  volumeEsperadoHoras: number | null;
}
