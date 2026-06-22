export class DemandaAtribuicaoInserirDto {
  criadorId: number;
  gestorIds: number[];
  /** Membros adicionais selecionados na criação (além do criador e dos gestores). */
  membroIds: number[];
}
