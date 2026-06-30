export class ExecucaoItemDto {
  id: number;
  atividadeId: number;
  nomeAtividade: string;
  demandaId: number;
  nomeDemanda: string;
  projetoId: number;
  nomeProjeto: string;
  descricao: string;
  inicioData: Date;
  fimData: Date | null;
  duracaoMinutos: number | null;
  usuarioId: number;
  nomeUsuario: string;
}
