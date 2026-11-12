/** Resumo de grupo e canal com a IA (task 249): as constantes que o servidor e a tela dividem. */

/** A última linha de todo resumo (texto único, para quem lê saber que foi gerado por IA). */
export const LINHA_DE_RESUMO_POR_IA = '_Resumo gerado por IA._';

/** O que ocupa o lugar de um bloco de código quando a pessoa escolhe não enviar código ao provedor. */
export const TRECHO_DE_CODIGO_OMITIDO = '[trecho de código omitido]';

/** O texto que a tela devolve ao pedir a proposta de gravar na documentação (o limite da proposta de alterar demanda). */
export const LIMITE_DO_TEXTO_DO_RESUMO = 18000;

/** O teto técnico de chamadas ao provedor por resumo (os blocos mais o fechamento): acima dele a estimativa recusa e pede um período menor. */
export const MAXIMO_DE_CHAMADAS_POR_RESUMO = 40;

/** O comando do compositor que abre o resumo. */
export const COMANDO_DE_RESUMO = '/resumir';
