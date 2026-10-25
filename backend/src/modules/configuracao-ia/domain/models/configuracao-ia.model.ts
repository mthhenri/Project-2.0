import { BaseEntity } from '../../../../core/base/base.entity';
import { ConfiguracaoIaModelosPorProvedorDto, EsforcoIaEnum, ModoContextoChatEnum, PropostaIaNiveisDto, TipoProvedorIaEnum } from '@project20/shared';

/** Uma versão da configuração da IA. */
export interface ConfiguracaoIa extends BaseEntity {
  versao: number;
  provedor: TipoProvedorIaEnum;
  fallbacks: TipoProvedorIaEnum[];
  modelosProvedor: ConfiguracaoIaModelosPorProvedorDto;
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
  /** Nulo nas versões anteriores à task 228: vale o padrão do `shared`. */
  niveisProposta: PropostaIaNiveisDto | null;
  usuarioId: number;
}
