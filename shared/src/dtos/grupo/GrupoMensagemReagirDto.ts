import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { REGEX_REACAO_MENSAGEM_DIRETA } from '../../utils/mensagem-direta';

/**
 * Reage a uma mensagem do grupo (task 326). Mesma regra da conversa um a um: `reacao` é **um** emoji, o mesmo de antes (ou `null`) remove, outro troca.
 * O `grupoId` vem da rota e é preenchido pela controller.
 */
export class GrupoMensagemReagirDto {
    grupoId: number;

    @IsUUID('4')
    mensagemId: string;

    @IsOptional()
    @IsString()
    @Matches(REGEX_REACAO_MENSAGEM_DIRETA, { message: 'reacao deve ser um único emoji' })
    reacao: string | null;
}
