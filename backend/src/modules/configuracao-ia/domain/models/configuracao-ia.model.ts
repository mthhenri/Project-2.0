import { BaseEntity } from '../../../../core/base/base.entity';
import { ConfiguracaoIaCadeiaItemDto, ModoContextoChatEnum, PropostaIaNiveisDto } from '@project20/shared';

/** Uma versão da configuração da IA. */
export interface ConfiguracaoIa extends BaseEntity {
    versao: number;
    cadeiaRapido: ConfiguracaoIaCadeiaItemDto[];
    cadeiaPadrao: ConfiguracaoIaCadeiaItemDto[];
    cadeiaAnalitico: ConfiguracaoIaCadeiaItemDto[];
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
