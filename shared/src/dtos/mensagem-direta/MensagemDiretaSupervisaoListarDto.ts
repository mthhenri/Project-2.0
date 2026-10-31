import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LIMITE_MAXIMO_DA_SUPERVISAO_DIRETA } from '../../utils/mensagem-direta';

/**
 * Pede uma página das conversas entre desenvolvedores que o gestor pode supervisionar (task 214). Sem `texto` vêm todas, da que teve
 * mensagem mais recente para a mais antiga.
 */
export class MensagemDiretaSupervisaoListarDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  texto?: string;

  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fim?: string;

  /** Só as conversas com mensagem de bloco de código (o filtro "Com código"). */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  somenteCodigo?: boolean;

  /** Começa em 1; omitido vale 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  /** Omitido vale `LIMITE_PADRAO_DA_SUPERVISAO_DIRETA`. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO_DA_SUPERVISAO_DIRETA)
  porPagina?: number;
}
