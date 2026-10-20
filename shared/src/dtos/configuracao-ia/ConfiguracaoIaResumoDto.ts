import { EsforcoIaEnum } from '../../enums/esforco-ia.enum';
import { ModoContextoChatEnum } from '../../enums/modo-contexto-chat.enum';
import { TipoProvedorIaEnum } from '../../enums/tipo-provedor-ia.enum';
import { ConfiguracaoIaModelosPorProvedorDto } from './ConfiguracaoIaModelosDto';

/** Uma versão da configuração da IA. A ativa é a de maior `versao`. */
export interface ConfiguracaoIaResumoDto {
  id: number;
  versao: number;
  provedor: TipoProvedorIaEnum;
  /** Contingência, em ordem: se o provedor padrão falha, tenta o primeiro, depois o segundo. Vazia: sem fallback. */
  fallbacks: TipoProvedorIaEnum[];
  /** Os três modelos de cada provedor já configurado (da cadeia ou guardado de versões anteriores). */
  modelosProvedor: ConfiguracaoIaModelosPorProvedorDto;
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
