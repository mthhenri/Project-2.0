import { TipoProjetoStatusEnum } from '../../enums/tipo-projeto-status.enum';

export class ProjetoInternoAlterarDto {
  id: number;
  nome?: string;
  cor?: string;
  status?: TipoProjetoStatusEnum;
  inicioData?: string | null;
  previsaoFimData?: string | null;
}
