import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import {
    LIMITE_MENCOES_MENSAGEM_DIRETA,
    LIMITE_REFERENCIAS_MENSAGEM_DIRETA,
    LIMITE_TEXTO_MENSAGEM_DIRETA,
} from '../../utils/mensagem-direta';
import { ReferenciaMensagemDto } from './ReferenciaMensagemDto';

/** Edita o texto de uma mensagem própria (task 313). A conversa é a do token com `destinatarioId`; o texto novo substitui o antigo por inteiro. */
export class MensagemDiretaEditarDto {
    /** A outra pessoa da conversa. */
    @IsInt()
    @Min(1)
    destinatarioId: number;

    @IsUUID('4')
    mensagemId: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/\S/, { message: 'texto não pode ter só espaços' })
    @MaxLength(LIMITE_TEXTO_MENSAGEM_DIRETA, { message: `texto deve ter no máximo ${LIMITE_TEXTO_MENSAGEM_DIRETA} caracteres` })
    texto: string;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(LIMITE_MENCOES_MENSAGEM_DIRETA)
    @IsInt({ each: true })
    @Min(1, { each: true })
    mencoes?: number[];

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(LIMITE_REFERENCIAS_MENSAGEM_DIRETA)
    @ValidateNested({ each: true })
    @Type(() => ReferenciaMensagemDto)
    referencias?: ReferenciaMensagemDto[];
}
