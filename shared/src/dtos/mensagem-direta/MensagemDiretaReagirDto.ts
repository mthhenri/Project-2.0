import { IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { REGEX_REACAO_MENSAGEM_DIRETA } from '../../utils/mensagem-direta';

/**
 * Reage a uma mensagem da conversa (task 314). A conversa é a do token com `destinatarioId`. `reacao` é **um** emoji: o mesmo de antes remove a
 * reação, outro troca, e `null` remove (a pessoa nunca tem mais de uma por mensagem).
 */
export class MensagemDiretaReagirDto {
    /** A outra pessoa da conversa. */
    @IsInt()
    @Min(1)
    destinatarioId: number;

    @IsUUID('4')
    mensagemId: string;

    @IsOptional()
    @IsString()
    @Matches(REGEX_REACAO_MENSAGEM_DIRETA, { message: 'reacao deve ser um único emoji' })
    reacao: string | null;
}
