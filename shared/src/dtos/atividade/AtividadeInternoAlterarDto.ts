import { TipoAtividadePrioridadeEnum } from '../../enums/tipo-atividade-prioridade.enum';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

/**
 * DTO interno de alteração de atividade: carrega o `id` (WHERE) e os campos
 * alteráveis lidos no SET dinâmico do repositório. Substitui o antigo par
 * `alterar(id: number, dados: Partial<Atividade>)` por um único DTO (§16 #21).
 * O complemento `Interno` precede o verbo `Alterar` (§5.1).
 */
export class AtividadeInternoAlterarDto {
  id: number;
  nome?: string;
  status?: TipoAtividadeStatusEnum;
  prioridade?: TipoAtividadePrioridadeEnum;
  /** Muda a atividade de demanda (task 229); as execuções vão junto, pois pertencem à atividade. */
  demandaId?: number;
}
