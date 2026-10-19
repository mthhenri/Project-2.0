import { BaseEntity } from '../../../../core/base/base.entity';
import { EsforcoIaEnum, ModoContextoChatEnum, TipoProvedorIaEnum } from '@project20/shared';

/** Uma versão da configuração da IA. */
export interface ConfiguracaoIa extends BaseEntity {
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
  duvidasCodigo: boolean;
  modoContextoChat: ModoContextoChatEnum;
  iaDesligada: boolean;
  usuarioId: number;
}
