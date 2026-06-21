/**
 * DTO interno de alteração de tag: carrega o `id` (WHERE) e os campos alteráveis
 * lidos no SET dinâmico do repositório. Substitui o antigo par
 * `alterar(id: number, dados: Partial<Tag>)` por um único DTO (§16 #21).
 * O complemento `Interno` precede o verbo `Alterar` (§5.1).
 */
export class TagInternoAlterarDto {
  id: number;
  nome?: string;
  cor?: string;
}
