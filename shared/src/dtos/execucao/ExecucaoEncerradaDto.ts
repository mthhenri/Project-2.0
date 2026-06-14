export class ExecucaoEncerradaDto {
  id: number;
  atividadeId: number;
  descricao: string;
  inicioData: Date;
  fimData: Date | null;
  duracaoMinutos: number | null;
}
