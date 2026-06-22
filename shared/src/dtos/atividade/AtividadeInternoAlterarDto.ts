import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

/**
 * DTO interno de alteração de atividade: carrega o `id` (WHERE) e os campos
 * alteráveis lidos no SET dinâmico do repositório. Substitui o antigo par
 * `alterar(id: number, dados: Partial<Atividade>)` por um único DTO (§16 #21).
 * O complemento `Interno` precede o verbo `Alterar` (§5.1).
 */
export class AtividadeInternoAlterarDto {
  id: number;
  nome?: string;
  descricao?: string;
  status?: AtividadeStatusEnum;
}
