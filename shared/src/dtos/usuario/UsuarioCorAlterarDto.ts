import { Transform } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { REGEX_COR_AVATAR, normalizarCorAvatar } from '../../utils/cor-avatar';

/** A pessoa escolhendo a cor da própria bolinha; `null` volta à cor padrão. */
export class UsuarioCorAlterarDto {
    @ApiProperty({ example: '#1E3A8A', nullable: true, description: '#RRGGBB; null volta à cor padrão' })
    @Transform(({ value }) => (typeof value === 'string' ? normalizarCorAvatar(value) : value))
    @IsOptional()
    @Matches(REGEX_COR_AVATAR, { message: 'A cor deve ser um hexadecimal #RRGGBB' })
    corAvatar: string | null;
}
