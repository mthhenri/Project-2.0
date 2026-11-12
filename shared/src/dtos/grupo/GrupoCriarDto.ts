import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { REGEX_SEM_CARACTERES_PROIBIDOS, MENSAGEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';
import { REGEX_COR_AVATAR, normalizarCorAvatar } from '../../utils/cor-avatar';
import { LIMITE_EMOJI_DO_GRUPO, LIMITE_MEMBROS_DO_GRUPO, LIMITE_NOME_DO_GRUPO } from '../../utils/grupo';

/** Cria um grupo livre. Quem cria é a pessoa do token e vira o primeiro membro; `membroUsuarioIds` são as outras pessoas. */
export class GrupoCriarDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(LIMITE_NOME_DO_GRUPO, { message: `nome deve ter no máximo ${LIMITE_NOME_DO_GRUPO} caracteres` })
    @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
    nome: string;

    /** `#RRGGBB`; omitido ou `null` = degradê das cores dos membros. */
    @Transform(({ value }) => (typeof value === 'string' ? normalizarCorAvatar(value) : value))
    @IsOptional()
    @Matches(REGEX_COR_AVATAR, { message: 'A cor deve ser um hexadecimal #RRGGBB' })
    corAvatar?: string | null;

    /** Um emoji no lugar das iniciais; omitido ou `null` = iniciais do nome. */
    @IsOptional()
    @IsString()
    @MaxLength(LIMITE_EMOJI_DO_GRUPO)
    emojiAvatar?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(LIMITE_MEMBROS_DO_GRUPO)
    @IsInt({ each: true })
    @Min(1, { each: true })
    membroUsuarioIds?: number[];
}
