/** Preço de um modelo em dólares por milhão de tokens (value-object: aparece na consulta de custos e na resposta da alteração). */
export interface IaModeloPrecoDto {
  modelo: string;
  precoEntradaMilhao: number;
  precoSaidaMilhao: number;
  precoCacheMilhao: number;
}
