export interface PlanoCriadoDto {
  id: number;
  titulo: string;
  projetoId: number | null;
  demandaId: number | null;
  isSolo: boolean;
  versao: number;
}
