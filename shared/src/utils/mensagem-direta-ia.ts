import { AutorMensagemDiretaEnum } from '../enums/autor-mensagem-direta.enum';

// ---------------------------------------------------------------------------
// `@IA` no chat entre colaboradores (task 315)
// ---------------------------------------------------------------------------

/** Quanto tempo um `@IA` sozinho espera o pedido na próxima mensagem de quem chamou. */
export const PRAZO_DO_PEDIDO_DA_IA_MINUTOS = 10;
/** Quantas mensagens anteriores da conversa, das duas pessoas, a IA lê junto com o pedido. */
export const JANELA_DE_CONTEXTO_DA_IA_NO_CHAT_DIRETO = 20;
/** Quantas mensagens anteriores do grupo ou canal a IA lê junto com o pedido (task 326). */
export const JANELA_DE_CONTEXTO_DA_IA_NO_GRUPO = 30;
/** Por quanto tempo a tela mostra "IA digitando…" sem receber a resposta. */
export const VALIDADE_DO_IA_DIGITANDO_MS = 120_000;
/** O texto que chama a IA. */
export const MENCAO_DA_IA = '@IA';

export interface ChamadaDaIa {
    /** O texto sem o `@IA`, aparado; vazio quando a pessoa escreveu só `@IA`. */
    pedido: string;
}

/** Troca os blocos cercados e os trechos de código em linha por espaços do mesmo tamanho: as posições do texto continuam as mesmas. */
function mascararCodigo(texto: string): string {
    const apagar = (trecho: string): string => trecho.replace(/[^\n]/g, ' ');
    return texto.replace(/```[\s\S]*?(?:```|$)/g, apagar).replace(/`[^`\n]*`/g, apagar);
}

/** `@IA` como token próprio: nem colado a uma letra, número, ponto ou `@` antes (`email@IA`), nem a uma letra ou número depois (`@IAgo`). */
const REGEX_MENCAO_DA_IA = /(?<![\p{L}\p{N}_.@])@ia(?![\p{L}\p{N}_])/giu;

/**
 * Se o texto chama a IA e qual é o pedido. `@IA` vale sem diferenciar maiúsculas e em qualquer lugar do texto, menos dentro de código (cercado ou
 * em linha). O pedido é o texto sem as menções à IA, aparado; `null` quando não há chamada.
 */
export function chamadaDaIa(texto: string): ChamadaDaIa | null {
    const original = texto ?? '';
    const mascarado = mascararCodigo(original);
    const trechos: Array<[number, number]> = [];
    for (const encontrado of mascarado.matchAll(REGEX_MENCAO_DA_IA)) {
        trechos.push([encontrado.index ?? 0, (encontrado.index ?? 0) + encontrado[0].length]);
    }
    if (trechos.length === 0) return null;
    let pedido = '';
    let inicio = 0;
    for (const [de, ate] of trechos) {
        pedido += original.slice(inicio, de);
        inicio = ate;
    }
    pedido += original.slice(inicio);
    return { pedido: pedido.replace(/^[\s,:;.-]+/, '').replace(/[ \t]{2,}/g, ' ').trim() };
}

/** O que a regra do pedido pendente precisa saber de cada mensagem da conversa. */
export interface MensagemParaPedidoDaIa {
    autor: AutorMensagemDiretaEnum;
    autorUsuarioId: number | null;
    texto: string;
    createdDate: Date | string;
    chamadaPorUsuarioId: number | null;
}

/**
 * A mensagem nova de `usuarioId` é o pedido de um `@IA` sozinho anterior? Vale quando a última mensagem **dele** na conversa (as da outra pessoa e as do
 * sistema no meio não contam) é um `@IA` sem pedido, enviado há no máximo `PRAZO_DO_PEDIDO_DA_IA_MINUTOS`, e a IA ainda não respondeu a ele depois disso.
 * `mensagensAnteriores` vem em ordem de envio e **sem** a mensagem nova; o relógio entra por parâmetro (a tela usa a mesma regra para a dica).
 */
export function pedidoPendenteDaIa(mensagensAnteriores: MensagemParaPedidoDaIa[], usuarioId: number, agora: Date): boolean {
    for (let indice = mensagensAnteriores.length - 1; indice >= 0; indice--) {
        const mensagem = mensagensAnteriores[indice];
        if (mensagem.autor === AutorMensagemDiretaEnum.IA && mensagem.chamadaPorUsuarioId === usuarioId) return false;
        if (mensagem.autor !== AutorMensagemDiretaEnum.USUARIO || mensagem.autorUsuarioId !== usuarioId) continue;
        const chamada = chamadaDaIa(mensagem.texto);
        if (!chamada || chamada.pedido !== '') return false;
        const decorrido = agora.getTime() - new Date(mensagem.createdDate).getTime();
        return decorrido >= 0 && decorrido <= PRAZO_DO_PEDIDO_DA_IA_MINUTOS * 60_000;
    }
    return false;
}
