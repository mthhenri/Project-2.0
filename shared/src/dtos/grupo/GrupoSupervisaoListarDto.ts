import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LIMITE_MAXIMO_DA_SUPERVISAO_DIRETA } from '../../utils/mensagem-direta';

/** Pede uma página dos grupos que o gestor pode supervisionar (sem gestor nem administrador entre os membros atuais), do que teve mensagem mais recente. */
export class GrupoSupervisaoListarDto {
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

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    somenteCodigo?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pagina?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(LIMITE_MAXIMO_DA_SUPERVISAO_DIRETA)
    porPagina?: number;
}
