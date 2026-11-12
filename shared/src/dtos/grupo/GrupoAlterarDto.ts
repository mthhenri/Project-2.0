import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { REGEX_SEM_CARACTERES_PROIBIDOS, MENSAGEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';
import { REGEX_COR_AVATAR, normalizarCorAvatar } from '../../utils/cor-avatar';
import { LIMITE_EMOJI_DO_GRUPO, LIMITE_NOME_DO_GRUPO } from '../../utils/grupo';

/**
 * Qualquer membro altera nome, cor e emoji do grupo. O que vier ausente fica como está; `null` em `corAvatar` volta ao degradê dos membros e em
 * `emojiAvatar` volta às iniciais.
 */
export class GrupoAlterarDto {
    /** Vem da rota e é preenchido pela controller; nunca pelo corpo. */
    grupoId: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(LIMITE_NOME_DO_GRUPO, { message: `nome deve ter no máximo ${LIMITE_NOME_DO_GRUPO} caracteres` })
    @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
    nome?: string;

    @Transform(({ value }) => (typeof value === 'string' ? normalizarCorAvatar(value) : value))
    @IsOptional()
    @Matches(REGEX_COR_AVATAR, { message: 'A cor deve ser um hexadecimal #RRGGBB' })
    corAvatar?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(LIMITE_EMOJI_DO_GRUPO)
    emojiAvatar?: string | null;
}
