import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AutorChatEnum } from '../../enums/autor-chat.enum';

/** Entrada da ferramenta `buscar_nas_minhas_conversas`: o que procurar nas conversas antigas de quem pergunta, e em que período (`yyyy-mm-dd`, opcional). */
export class MinhasConversasBuscarDto {
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    texto!: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    inicio?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    fim?: string;
}

/** Uma mensagem achada, com o dia da conversa a que pertence. */
export interface MinhaConversaMensagemAchadaDto {
    /** `yyyy-mm-dd`. */
    data: string;
    autor: AutorChatEnum;
    texto: string;
    truncada: boolean;
}

/** O que a ferramenta `buscar_nas_minhas_conversas` devolve à IA. */
export interface MinhasConversasBuscadasDto {
    mensagens: MinhaConversaMensagemAchadaDto[];
}
