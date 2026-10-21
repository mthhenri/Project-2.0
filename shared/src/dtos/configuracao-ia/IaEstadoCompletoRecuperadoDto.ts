import { EstadoIaEnum } from '../../enums/estado-ia.enum';
import { TipoProvedorIaEnum } from '../../enums/tipo-provedor-ia.enum';

/** Estado da IA para o administrador (tela de configurações): o estado e quais provedores têm chave de API no ambiente. Nunca traz a chave. */
export interface IaEstadoCompletoRecuperadoDto {
  estado: EstadoIaEnum;
  /** Provedores com chave configurada, na ordem do enum. */
  provedoresComChave: TipoProvedorIaEnum[];
}
