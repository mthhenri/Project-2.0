import { ModoContextoChatEnum } from '../../enums/modo-contexto-chat.enum';
import { ConfiguracaoIaCadeiaItemDto } from './ConfiguracaoIaCadeiaItemDto';
import { PropostaIaNiveisDto } from './PropostaIaNiveisDto';

/** Uma versão da configuração da IA. A ativa é a de maior `versao`. */
export interface ConfiguracaoIaResumoDto {
    id: number;
    versao: number;
    /** A cadeia do nível rápido: o primeiro item é o principal e os seguintes são a contingência (nunca vazia). */
    cadeiaRapido: ConfiguracaoIaCadeiaItemDto[];
    /** A cadeia do nível padrão. */
    cadeiaPadrao: ConfiguracaoIaCadeiaItemDto[];
    /** A cadeia do nível analítico. */
    cadeiaAnalitico: ConfiguracaoIaCadeiaItemDto[];
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
    /** O nível de autonomia da IA por regra de proposta (task 228), sempre completo: a regra que a versão não guardou vem com o padrão. */
    niveisProposta: PropostaIaNiveisDto;
    usuarioId: number;
    /** Quem salvou a versão. */
    usuarioNome: string;
    createdDate: Date;
}
