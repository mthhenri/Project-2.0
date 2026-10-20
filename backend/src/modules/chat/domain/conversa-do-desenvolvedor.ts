import { AutorChatEnum, ContextoChatEnum } from '@project20/shared';
import { ChatMensagemLida } from './chat-mensagem.documento';

/** Quantas conversas (dias) a lista devolve à IA de uma vez; as mais recentes. */
export const LIMITE_CONVERSAS_DO_DESENVOLVEDOR = 30;
/** Quantas mensagens de uma conversa voltam à IA (as mais recentes). */
export const LIMITE_MENSAGENS_DA_CONVERSA = 60;
/** Quantas mensagens a busca devolve. */
export const LIMITE_MENSAGENS_DA_BUSCA = 20;
/** Tamanho máximo do texto de cada mensagem que volta à IA (o resto é cortado e avisado). */
export const LIMITE_CARACTERES_DA_MENSAGEM = 1500;

/** Só a conversa do chat conta: o check-in é outro contexto, com outra finalidade, e a IA do gestor não o lê. */
export function somenteMensagensDoChat(mensagens: ChatMensagemLida[]): ChatMensagemLida[] {
  return mensagens.filter((mensagem) => mensagem.contexto === ContextoChatEnum.CHAT);
}

/** Corta o texto no limite e diz se cortou. */
export function cortarTexto(texto: string, limite: number): { texto: string; truncada: boolean } {
  return texto.length > limite ? { texto: texto.slice(0, limite), truncada: true } : { texto, truncada: false };
}

/** Fica com as `limite` mais recentes de uma lista em ordem crescente de data e diz se havia mais. */
export function ultimasMensagens<T>(mensagens: T[], limite: number): { mensagens: T[]; haMais: boolean } {
  return mensagens.length > limite ? { mensagens: mensagens.slice(mensagens.length - limite), haMais: true } : { mensagens, haMais: false };
}

/**
 * O que uma ferramenta devolve passa por um corte global (o registro corta o JSON em 20 000 caracteres, e cortar o JSON no meio perderia
 * o fim e o aviso de `haMais`). Por isso a lista é limitada aqui, por orçamento de texto, deixando folga para os outros campos.
 */
export const ORCAMENTO_DE_CARACTERES_DA_LISTA = 14_000;

/** Fica com os itens que cabem no orçamento de texto: do fim (os mais recentes) ou do começo (os mais relevantes). Diz se cortou. */
export function dentroDoOrcamento<T extends { texto: string }>(itens: T[], orcamento: number, aPartirDoFim: boolean): { itens: T[]; cortou: boolean } {
  const ordenados = aPartirDoFim ? [...itens].reverse() : itens;
  const escolhidos: T[] = [];
  let usado = 0;
  for (const item of ordenados) {
    if (usado + item.texto.length > orcamento && escolhidos.length > 0) break;
    escolhidos.push(item);
    usado += item.texto.length;
  }
  return { itens: aPartirDoFim ? escolhidos.reverse() : escolhidos, cortou: escolhidos.length < itens.length };
}

/** A mensagem do sistema é o aviso de falha que o chat grava ("serviço indisponível"): não é fala de ninguém e não vai ao gestor. */
export function ehFalaDaConversa(mensagem: { autor: AutorChatEnum }): boolean {
  return mensagem.autor !== AutorChatEnum.SISTEMA;
}

/** `true` quando o dia (`yyyy-mm-dd`) está dentro do intervalo; extremos ausentes não limitam. Datas ISO comparam como texto. */
export function diaDentroDoIntervalo(dia: string, inicio?: string, fim?: string): boolean {
  if (inicio && dia < inicio) return false;
  if (fim && dia > fim) return false;
  return true;
}
