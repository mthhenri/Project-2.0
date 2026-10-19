import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { EsforcoIaEnum } from '../../enums/esforco-ia.enum';
import { ModoContextoChatEnum } from '../../enums/modo-contexto-chat.enum';
import { TipoProvedorIaEnum } from '../../enums/tipo-provedor-ia.enum';

/** Grava uma **versão nova** da configuração (a antiga nunca é alterada). O intervalo mínimo < máximo é conferido na service. */
export class ConfiguracaoIaCriarDto {
  @IsEnum(TipoProvedorIaEnum)
  provedor: TipoProvedorIaEnum;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  modeloRapido: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  modeloPadrao: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  modeloAnalitico: string;

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
