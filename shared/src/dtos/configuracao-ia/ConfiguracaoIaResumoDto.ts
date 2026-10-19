import { EsforcoIaEnum } from '../../enums/esforco-ia.enum';
import { ModoContextoChatEnum } from '../../enums/modo-contexto-chat.enum';
import { TipoProvedorIaEnum } from '../../enums/tipo-provedor-ia.enum';

/** Uma versão da configuração da IA. A ativa é a de maior `versao`. */
export interface ConfiguracaoIaResumoDto {
  id: number;
  versao: number;
  provedor: TipoProvedorIaEnum;
  modeloRapido: string;
  modeloPadrao: string;
  modeloAnalitico: string;
  esforcoAnalitico: EsforcoIaEnum;
  checkinMinimoMinutos: number;
  checkinMaximoMinutos: number;
  duracaoRecomendadaMinutos: number;
  checkinInteligente: boolean;
  rigorProporcional: boolean;
  deteccaoAutomatica: boolean;
  /** O chat responde também dúvidas de programação (`false`: só o Project). */
  duvidasCodigo: boolean;
  modoContextoChat: ModoContextoChatEnum;
  iaDesligada: boolean;
  usuarioId: number;
  /** Quem salvou a versão. */
  usuarioNome: string;
  createdDate: Date;
}
