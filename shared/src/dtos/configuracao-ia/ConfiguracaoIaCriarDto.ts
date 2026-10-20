import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsObject, Min } from 'class-validator';
import { EsforcoIaEnum } from '../../enums/esforco-ia.enum';
import { ModoContextoChatEnum } from '../../enums/modo-contexto-chat.enum';
import { TipoProvedorIaEnum } from '../../enums/tipo-provedor-ia.enum';
import { ConfiguracaoIaModelosPorProvedorDto } from './ConfiguracaoIaModelosDto';

/** Grava uma **versão nova** da configuração (a antiga nunca é alterada). O intervalo mínimo < máximo e a coerência provedor × modelo são conferidos na service. */
export class ConfiguracaoIaCriarDto {
  @IsEnum(TipoProvedorIaEnum)
  provedor: TipoProvedorIaEnum;

  /** Cadeia de contingência, em ordem (no máximo dois, sem repetir o provedor padrão). */
  @IsArray()
  @ArrayMaxSize(2)
  @IsEnum(TipoProvedorIaEnum, { each: true })
  fallbacks: TipoProvedorIaEnum[];

  /** Os modelos por provedor. O formato do mapa e a coerência modelo × provedor são conferidos na service (`validarProvedoresDaConfiguracaoIa`). */
  @IsObject()
  modelosProvedor: ConfiguracaoIaModelosPorProvedorDto;

  @IsEnum(EsforcoIaEnum)
  esforcoAnalitico: EsforcoIaEnum;

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
}
