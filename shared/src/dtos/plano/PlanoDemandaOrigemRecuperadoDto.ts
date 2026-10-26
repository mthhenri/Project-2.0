/** De que plano a demanda nasceu (o que a pessoa pode ver): o título, o projeto e quando foi publicado pela última vez. */
export interface PlanoDemandaOrigemRecuperadoDto {
  id: number;
  titulo: string;
  projetoNome: string | null;
  /** `null`: o plano está ligado à demanda, mas ainda não foi publicado. */
  publicacaoData: string | null;
}
