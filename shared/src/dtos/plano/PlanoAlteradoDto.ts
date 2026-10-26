export interface PlanoAlteradoDto {
  id: number;
  titulo: string;
  /** A versão nova, que o cliente passa a usar na próxima gravação. */
  versao: number;
  updatedDate: string;
}
