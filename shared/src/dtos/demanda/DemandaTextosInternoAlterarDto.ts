/**
 * DTO interno de `alterarTextos`: o `id` da demanda (injetado pela controller) e o corpo de `DemandaTextosAlterarDto`. O complemento `Textos Interno`
 * precede o verbo (CONVENTIONS "Quando o complemento tem mais de uma palavra").
 */
export class DemandaTextosInternoAlterarDto {
  id: number;
  descricaoTecnica?: string;
  descricaoCliente?: string;
  documentacao?: string;
  versao: number;
}
