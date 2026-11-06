import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsNumber, IsBoolean, Matches, Min, Max, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';
import { REGEX_COR_AVATAR, normalizarCorAvatar } from '../../utils/cor-avatar';

export class UsuarioAlterarDto {
    @ApiPropertyOptional({ example: 'joao.silva' })
    @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
    @IsOptional()
    @IsString()
    @MinLength(4)
    login?: string;

    @ApiPropertyOptional({ example: 'João Silva' })
    @IsOptional()
    @IsString()
    @MinLength(3)
    nomeCompleto?: string;

    @ApiPropertyOptional({ example: 'Tech Lead' })
    @IsOptional()
    @IsString()
    cargoTitulo?: string;

    @ApiPropertyOptional({ example: 8 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(24)
    horasDiariasNecessarias?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    ativo?: boolean;

    @ApiPropertyOptional({ enum: TipoUsuarioEnum, example: TipoUsuarioEnum.GESTOR })
    @IsOptional()
    @IsEnum(TipoUsuarioEnum)
    tipo?: TipoUsuarioEnum;

    @ApiPropertyOptional({ example: '#1E3A8A', nullable: true, description: 'Cor da bolinha (#RRGGBB); null volta à cor padrão' })
    @Transform(({ value }) => (typeof value === 'string' ? normalizarCorAvatar(value) : value))
    @IsOptional()
    @Matches(REGEX_COR_AVATAR, { message: 'A cor deve ser um hexadecimal #RRGGBB' })
    corAvatar?: string | null;
}
