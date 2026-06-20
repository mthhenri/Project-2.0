import { ProjetoStatusEnum } from '../../enums/projeto-status.enum';

export class ProjetoInternoAlterarDto {
  id: number;
  nome?: string;
  cor?: string;
  status?: ProjetoStatusEnum;
  inicioData?: string | null;
  previsaoFimData?: string | null;
}
