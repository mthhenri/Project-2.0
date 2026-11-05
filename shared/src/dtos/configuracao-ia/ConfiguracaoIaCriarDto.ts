import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, Min } from 'class-validator';
import { ModoContextoChatEnum } from '../../enums/modo-contexto-chat.enum';
import { ConfiguracaoIaCadeiaItemDto } from './ConfiguracaoIaCadeiaItemDto';
import { PropostaIaNiveisDto } from './PropostaIaNiveisDto';

/**
 * Grava uma **versão nova** da configuração (a antiga nunca é alterada). O intervalo mínimo < máximo e a coerência de cada cadeia
 * (ao menos um item, sem provedor repetido, modelo do provedor, esforço válido) são conferidos na service
 * (`validarCadeiasDaConfiguracaoIa`).
 */
export class ConfiguracaoIaCriarDto {
    /** A cadeia do nível rápido: o item principal e depois a contingência, em ordem. */
    @IsArray()
    cadeiaRapido: ConfiguracaoIaCadeiaItemDto[];

    /** A cadeia do nível padrão. */
    @IsArray()
    cadeiaPadrao: ConfiguracaoIaCadeiaItemDto[];

    /** A cadeia do nível analítico. */
    @IsArray()
    cadeiaAnalitico: ConfiguracaoIaCadeiaItemDto[];

    @IsInt()
    @Min(1)
    checkinMinimoMinutos: number;

    @IsInt()
    @Min(1)
    checkinMaximoMinutos: number;

    @IsInt()
    @Min(1)
    duracaoRecomendadaMinutos: number;

    @IsBoolean()
    checkinInteligente: boolean;

    @IsBoolean()
    rigorProporcional: boolean;

    @IsBoolean()
    deteccaoAutomatica: boolean;

    @IsBoolean()
    duvidasCodigo: boolean;

    @IsEnum(ModoContextoChatEnum)
    modoContextoChat: ModoContextoChatEnum;

    @IsBoolean()
    iaDesligada: boolean;

    /**
   * O nível de autonomia da IA por regra de proposta (task 228). Quem não envia mantém o da versão ativa. As chaves e os valores são
   * conferidos na service (`validarNiveisDaProposta`).
   */
    @IsOptional()
    @IsObject()
    niveisProposta?: PropostaIaNiveisDto;
}
