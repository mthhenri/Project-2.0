export class ExecucaoResumoDto {
  id: number;
  atividadeId: number;
  nomeAtividade: string;
  descricao: string;
  inicioData: Date;
  fimData: Date | null;
  duracaoMinutos: number | null;
  usuarioId: number;
  nomeUsuario: string;
}
