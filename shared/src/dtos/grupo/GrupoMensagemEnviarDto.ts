import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { ReferenciaMensagemDto } from '../mensagem-direta/ReferenciaMensagemDto';
import { LIMITE_MENCOES_MENSAGEM_DIRETA, LIMITE_REFERENCIAS_MENSAGEM_DIRETA, LIMITE_TEXTO_MENSAGEM_DIRETA } from '../../utils/mensagem-direta';

/**
 * Uma mensagem para o grupo. O autor é sempre quem está logado e só membro envia. O texto é Markdown e não passa pelo validador de caracteres
 * proibidos (código colado tem esses caracteres).
 */
export class GrupoMensagemEnviarDto {
    /** Vem da rota e é preenchido pela controller; nunca pelo corpo. */
    grupoId: number;

    /** UUID v4 gerado pelo cliente; dá idempotência ao reenvio. */
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

    /** `@todos`: qualquer membro pode; o servidor expande nos membros atuais (menos o autor) para o aviso. */
    @IsOptional()
    @IsBoolean()
    mencionaTodos?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(LIMITE_REFERENCIAS_MENSAGEM_DIRETA)
    @ValidateNested({ each: true })
    @Type(() => ReferenciaMensagemDto)
    referencias?: ReferenciaMensagemDto[];

    /** A mensagem deste grupo a que esta responde; só o id vai, autor e trecho o servidor lê da original. */
    @IsOptional()
    @IsUUID('4')
    respondeAMensagemId?: string;
}
