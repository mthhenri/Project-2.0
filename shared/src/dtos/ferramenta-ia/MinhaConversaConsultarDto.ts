import { Matches } from 'class-validator';
import { AutorChatEnum } from '../../enums/autor-chat.enum';

/** Entrada da ferramenta `consultar_minha_conversa`: o dia (`yyyy-mm-dd`) da conversa de quem pergunta. */
export class MinhaConversaConsultarDto {
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    data!: string;
}

/** Uma mensagem da conversa, só com o que a IA precisa para ler. */
export interface MinhaConversaMensagemDto {
    autor: AutorChatEnum;
    /** Markdown, cortado em `LIMITE_CARACTERES_DA_MENSAGEM` caracteres. */
    texto: string;
    truncada: boolean;
    /** ISO 8601. */
    data: string;
}

/** O que a ferramenta `consultar_minha_conversa` devolve à IA. */
export interface MinhaConversaConsultadaDto {
    data: string;
    titulo: string;
    mensagens: MinhaConversaMensagemDto[];
    /** `true` quando a conversa tem mais mensagens do que as devolvidas (as mais recentes ficam). */
    haMais: boolean;
}
