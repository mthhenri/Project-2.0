import { DemandaStatusEnum } from '../../enums/demanda-status.enum';

/**
 * DTO interno de alteração de demanda: carrega o `id` (WHERE) e os nove campos
 * alteráveis lidos no SET dinâmico do repositório. Substitui o antigo par
 * `alterar(id: number, dados: Partial<Demanda>)` por um único DTO (§16 #21).
 * O complemento `Interno` precede o verbo `Alterar` (§5.1).
 */
export class DemandaInternoAlterarDto {
  id: number;
  demandaPaiId?: number | null;
  nome?: string;
  descricaoTecnica?: string | null;
  descricaoCliente?: string | null;
  documentacao?: string | null;
  horasEstimadas?: number;
  status?: DemandaStatusEnum;
  isEstrutural?: boolean;
  previsaoFimData?: string | null;
}
