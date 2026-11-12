import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { ReferenciaMensagemDto } from '../mensagem-direta/ReferenciaMensagemDto';
import { LIMITE_MENCOES_MENSAGEM_DIRETA, LIMITE_REFERENCIAS_MENSAGEM_DIRETA, LIMITE_TEXTO_MENSAGEM_DIRETA } from '../../utils/mensagem-direta';

/**
 * Edita o texto de uma mensagem própria do grupo (task 326), com a mesma regra da conversa um a um (só o autor, até 1 hora). O texto novo substitui o
 * antigo por inteiro; a resposta (`respondeA`), a data de envio e a ordem não mudam.
 */
export class GrupoMensagemEditarDto {
    /** Vem da rota e é preenchido pela controller; nunca pelo corpo. */
    grupoId: number;

    @IsUUID('4')
    mensagemId: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/\S/, { message: 'texto não pode ter só espaços' })
    @MaxLength(LIMITE_TEXTO_MENSAGEM_DIRETA, { message: `texto deve ter no máximo ${LIMITE_TEXTO_MENSAGEM_DIRETA} caracteres` })
    texto: string;

    /** Ids dos membros mencionados com `@`; só vale membro atual do grupo. */
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(LIMITE_MENCOES_MENSAGEM_DIRETA)
    @IsInt({ each: true })
    @Min(1, { each: true })
    mencoes?: number[];

    @IsOptional()
    @IsBoolean()
    mencionaTodos?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(LIMITE_REFERENCIAS_MENSAGEM_DIRETA)
    @ValidateNested({ each: true })
    @Type(() => ReferenciaMensagemDto)
    referencias?: ReferenciaMensagemDto[];
}
