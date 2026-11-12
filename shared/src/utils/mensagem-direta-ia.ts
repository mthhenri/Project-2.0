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
 * sistema no meio não contam) é um `@IA` sem pedido, enviado há no máximo `PRAZO_DO_PEDIDO_DA_IA_MINUTOS`. A resposta da IA a esse `@IA` sozinho é só a
 * saudação (task 327: "Opa, chamou?") e **não** encerra a espera; a resposta a um pedido de verdade encerra, porque a última mensagem dele que ela
 * respondeu não é um `@IA` sozinho. `mensagensAnteriores` vem em ordem de envio e **sem** a mensagem nova; o relógio entra por parâmetro (a tela usa a
 * mesma regra para a dica).
 */
export function pedidoPendenteDaIa(mensagensAnteriores: MensagemParaPedidoDaIa[], usuarioId: number, agora: Date): boolean {
    for (let indice = mensagensAnteriores.length - 1; indice >= 0; indice--) {
        const mensagem = mensagensAnteriores[indice];
        if (mensagem.autor !== AutorMensagemDiretaEnum.USUARIO || mensagem.autorUsuarioId !== usuarioId) continue;
        const chamada = chamadaDaIa(mensagem.texto);
        if (!chamada || chamada.pedido !== '') return false;
        const decorrido = agora.getTime() - new Date(mensagem.createdDate).getTime();
        return decorrido >= 0 && decorrido <= PRAZO_DO_PEDIDO_DA_IA_MINUTOS * 60_000;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Menções na resposta da IA (task 328)
// ---------------------------------------------------------------------------

/** Quem pode ser marcado pela IA: as pessoas da conversa de agora. */
export interface PessoaMencionavelPelaIa {
    usuarioId: number;
    nome: string;
}

const REGEX_MENCAO_DE_TODOS = /(?<![\p{L}\p{N}_.@])@todos(?![\p{L}\p{N}_])/iu;

function escaparParaRegex(texto: string): string {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Quem a resposta da IA marca: `@Nome Completo` (sem diferenciar maiúsculas) ou `@PrimeiroNome` quando só uma pessoa da conversa tem esse primeiro nome;
 * o nome mais longo vence (`@Ana Lima` não marca também uma `Ana` à parte). `@todos` marca todas as pessoas da conversa **menos quem chamou**; quem chamou
 * só é marcada pelo próprio nome. Fora de código (cercado ou em linha) e só pessoas de `pessoas`. Devolve os ids sem repetição, na ordem da conversa.
 */
export function mencoesNoTextoDaIa(texto: string, pessoas: PessoaMencionavelPelaIa[], quemChamouId: number): number[] {
    const mascarado = mascararCodigo(texto ?? '');
    const primeirosNomes = new Map<string, number>();
    for (const pessoa of pessoas) {
        const primeiro = pessoa.nome.trim().split(/\s+/)[0]?.toLowerCase();
        if (primeiro) primeirosNomes.set(primeiro, (primeirosNomes.get(primeiro) ?? 0) + 1);
    }
    const candidatos: Array<{ usuarioId: number; rotulo: string }> = [];
    for (const pessoa of pessoas) {
        const nome = pessoa.nome.trim().replace(/\s+/g, ' ');
        if (!nome) continue;
        candidatos.push({ usuarioId: pessoa.usuarioId, rotulo: nome });
        const primeiro = nome.split(' ')[0];
        if (primeiro !== nome && primeirosNomes.get(primeiro.toLowerCase()) === 1) candidatos.push({ usuarioId: pessoa.usuarioId, rotulo: primeiro });
    }
    candidatos.sort((candidatoA, candidatoB) => candidatoB.rotulo.length - candidatoA.rotulo.length);

    const marcadas = new Set<number>();
    let restante = mascarado;
    for (const candidato of candidatos) {
        const regex = new RegExp(`(?<![\\p{L}\\p{N}_.@])@${escaparParaRegex(candidato.rotulo).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}_])`, 'giu');
        if (regex.test(restante)) {
            marcadas.add(candidato.usuarioId);
            // O trecho achado sai do texto para um nome mais curto não o marcar de novo.
            restante = restante.replace(regex, (achado) => ' '.repeat(achado.length));
        }
    }
    if (REGEX_MENCAO_DE_TODOS.test(mascarado)) {
        for (const pessoa of pessoas) if (pessoa.usuarioId !== quemChamouId) marcadas.add(pessoa.usuarioId);
    }
    return pessoas.map((pessoa) => pessoa.usuarioId).filter((usuarioId, indice, todos) => marcadas.has(usuarioId) && todos.indexOf(usuarioId) === indice);
}
