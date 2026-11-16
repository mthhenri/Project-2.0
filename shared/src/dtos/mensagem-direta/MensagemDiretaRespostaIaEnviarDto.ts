import { IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateIf } from 'class-validator';
import { LIMITE_TEXTO_MENSAGEM_DIRETA } from '../../utils/mensagem-direta';

/**
 * Envia a resposta da IA do Chat IA a um colaborador (task 329). O texto **não** vem do corpo: o servidor lê a resposta pelo par
 * `conversaId` + `chatMensagemId`, só da conversa de quem está logado. O destino é uma pessoa (`destinatarioId`) **ou** um grupo/canal
 * (`grupoId`); a exclusividade é conferida na service (`destinoDaRespostaDaIaValido`). A nota é opcional e vira uma mensagem comum do remetente.
 */
export class MensagemDiretaRespostaIaEnviarDto {
    /** A conversa do Chat IA, `<usuarioId>-<yyyy-mm-dd>`. */
    @IsString()
    @Matches(/^\d+-\d{4}-\d{2}-\d{2}$/, { message: 'conversaId inválido' })
    conversaId: string;

    /** O `id` da resposta da IA na conversa do Chat IA. */
    @IsString()
    @Matches(/\S/, { message: 'chatMensagemId inválido' })
    @MaxLength(100)
    chatMensagemId: string;

    @ValidateIf((dto: MensagemDiretaRespostaIaEnviarDto) => dto.destinatarioId !== undefined || dto.grupoId === undefined)
    @IsInt()
    @Min(1)
    destinatarioId?: number;

    @ValidateIf((dto: MensagemDiretaRespostaIaEnviarDto) => dto.grupoId !== undefined || dto.destinatarioId === undefined)
    @IsInt()
    @Min(1)
    grupoId?: number;

    /** UUID v4 gerado pelo cliente para a mensagem da IA; dá idempotência ao reenvio. */
    @IsUUID('4')
    mensagemId: string;

    /** Comentário do remetente, enviado como mensagem comum antes da resposta. */
    @IsOptional()
    @IsString()
    @MaxLength(LIMITE_TEXTO_MENSAGEM_DIRETA, { message: `nota deve ter no máximo ${LIMITE_TEXTO_MENSAGEM_DIRETA} caracteres` })
    nota?: string;

    /** UUID v4 da mensagem da nota; obrigatório quando há nota (idempotência). */
    @ValidateIf((dto: MensagemDiretaRespostaIaEnviarDto) => typeof dto.nota === 'string' && dto.nota.trim().length > 0)
    @IsUUID('4')
    notaMensagemId?: string;
}
