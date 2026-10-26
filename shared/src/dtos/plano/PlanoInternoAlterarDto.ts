export class PlanoInternoAlterarDto {
  id: number;
  versao: number;
  titulo?: string;
  descricaoTecnica?: string | null;
  descricaoCliente?: string | null;
  documentacao?: string | null;
}
