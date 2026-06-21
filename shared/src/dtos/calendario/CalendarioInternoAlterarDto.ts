import { DiaNaoUtilTipoEnum, DiaNaoUtilDuracaoEnum } from '../../enums';

/**
 * DTO interno de alteração de dia não útil: carrega o `id` (WHERE) e os campos
 * alteráveis lidos no SET dinâmico do repositório. Substitui o antigo par
 * `alterar(id: number, dados: Partial<DiaNaoUtil>)` por um único DTO (§16 #21).
 * O complemento `Interno` precede o verbo `Alterar` (§5.1).
 */
export class CalendarioInternoAlterarDto {
  id: number;
  descricao?: string;
  tipo?: DiaNaoUtilTipoEnum;
  duracao?: DiaNaoUtilDuracaoEnum;
  recorrente?: boolean;
}
