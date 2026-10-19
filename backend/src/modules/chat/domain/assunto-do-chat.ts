import { AssuntoChatEnum, AutorChatEnum, ModoContextoChatEnum } from '@project20/shared';
import { ChatMensagemLida } from './chat-mensagem.documento';

/** Quantas das últimas mensagens a classificação lê (para "e em C#?" seguir o assunto anterior) e o quanto de cada uma. */
export const MENSAGENS_PARA_CLASSIFICAR = 4;
export const CARACTERES_POR_MENSAGEM_PARA_CLASSIFICAR = 300;
/** Teto de tokens da classificação: a resposta é uma palavra. */
export const MAXIMO_TOKENS_DA_CLASSIFICACAO = 10;

/** Instrução interna (não editável) da classificação: uma palavra, `SISTEMA` ou `CODIGO`. */
export const INSTRUCOES_DE_ASSUNTO =
  'Classifique a pergunta atual do usuário, que vem depois de "Pergunta atual", em um de dois assuntos. ' +
  'CODIGO: dúvida de programação (sintaxe, linguagem, biblioteca, algoritmo, erro de código, banco de dados, conceito técnico) que não depende dos dados do Project. ' +
  'SISTEMA: qualquer coisa sobre o uso do Project (atividades, execuções, demandas, projetos, ponto, pad, tags, equipe, horários) ou conversa comum. ' +
  'Se a pergunta é curta e só faz sentido pela conversa anterior (por exemplo, "e em C#?"), siga o assunto das mensagens anteriores. ' +
  'Responda somente com a palavra SISTEMA ou a palavra CODIGO.';

/** A instrução fixa com as dúvidas de código desligadas: o chat só trata do Project e recusa o resto com educação. */
export const INSTRUCOES_SO_PROJECT =
  'Aqui você ajuda só com o Project: atividades, execuções, demandas, projetos, ponto, pad, tags e a equipe. ' +
  'Se o usuário perguntar algo de programação que não seja sobre o uso do Project (como escrever código, usar uma linguagem ou depurar um erro), ' +
  'recuse com educação, em uma ou duas frases, diga que por aqui você só ajuda com o Project e ofereça ajuda com o que for do sistema. Não responda a dúvida de programação.';

/** O assunto da mensagem: sem marca (antiga, do sistema ou do check-in) conta como `SISTEMA`. */
export function assuntoDaMensagem(mensagem: Pick<ChatMensagemLida, 'assunto'>): AssuntoChatEnum {
  return mensagem.assunto ?? AssuntoChatEnum.SISTEMA;
}

/** O assunto da última mensagem marcada do histórico, ou `SISTEMA` se nenhuma tem marca. */
export function assuntoDaUltimaMarcada(historico: readonly Pick<ChatMensagemLida, 'assunto'>[]): AssuntoChatEnum {
  for (let posicao = historico.length - 1; posicao >= 0; posicao--) {
    const assunto = historico[posicao].assunto;
    if (assunto) return assunto;
  }
  return AssuntoChatEnum.SISTEMA;
}

/** O texto enviado à classificação: as últimas mensagens (cortadas) e a pergunta atual. */
export function montarPedidoDeAssunto(historico: readonly ChatMensagemLida[], pergunta: string): string {
  const recentes = historico
    .filter((mensagem) => mensagem.autor === AutorChatEnum.USUARIO || mensagem.autor === AutorChatEnum.IA)
    .slice(-MENSAGENS_PARA_CLASSIFICAR)
    .map((mensagem) => `${mensagem.autor === AutorChatEnum.USUARIO ? 'Usuário' : 'IA'}: ${mensagem.texto.slice(0, CARACTERES_POR_MENSAGEM_PARA_CLASSIFICAR)}`);
  return `${recentes.length > 0 ? `Mensagens anteriores:\n${recentes.join('\n\n')}\n\n` : ''}Pergunta atual: ${pergunta}`;
}

/** O assunto dito na resposta da classificação, ou `null` se ela não disse (ou disse os dois: não dá para confiar). */
export function interpretarAssunto(resposta: string): AssuntoChatEnum | null {
  const normalizada = resposta
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
  const disseCodigo = /\bCODIGO\b/.test(normalizada);
  const disseSistema = /\bSISTEMA\b/.test(normalizada);
  if (disseCodigo === disseSistema) return null;
  return disseCodigo ? AssuntoChatEnum.CODIGO : AssuntoChatEnum.SISTEMA;
}

/**
 * O que o modelo lê do histórico: com o contexto `MISTURADO`, tudo; com `SEPARADO`, só as mensagens do mesmo assunto da pergunta atual
 * (mensagem sem marca conta como `SISTEMA`). A janela de mensagens é aplicada depois, por quem monta o contexto.
 */
export function filtrarHistoricoPorModo(historico: ChatMensagemLida[], modo: ModoContextoChatEnum, assuntoAtual: AssuntoChatEnum): ChatMensagemLida[] {
  if (modo !== ModoContextoChatEnum.SEPARADO) return historico;
  return historico.filter((mensagem) => assuntoDaMensagem(mensagem) === assuntoAtual);
}

/**
 * As instruções da conversa do chat: o prompt `CONVERSA` mais, com as dúvidas de código ligadas, o prompt `DUVIDA_CODIGO` ativo; desligadas,
 * a instrução fixa que recusa a pergunta de programação que não é sobre o Project.
 */
export function montarInstrucoesDaConversa(promptConversa: string, duvidasCodigo: boolean, promptDuvidaCodigo: string | null): string {
  if (duvidasCodigo && promptDuvidaCodigo) return `${promptConversa}\n\n${promptDuvidaCodigo}`;
  return `${promptConversa}\n\n${INSTRUCOES_SO_PROJECT}`;
}
