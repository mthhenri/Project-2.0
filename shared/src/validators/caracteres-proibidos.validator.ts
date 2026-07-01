/**
 * Caracteres proibidos em nomes (projeto, demanda, atividade, tag) e em
 * descrições de execução: '  "  `  ~  ^  \  ´
 */
export const CARACTERES_PROIBIDOS = `'"\`~^\\´`;

/**
 * Passa apenas quando a string NÃO contém nenhum caractere proibido.
 * O primeiro `^` é a negação da classe; o `^` literal aparece dentro da classe.
 */
export const REGEX_SEM_CARACTERES_PROIBIDOS = /^[^'"`~^\\´]*$/;

export const MENSAGEM_CARACTERES_PROIBIDOS =
  'Não são permitidos os caracteres: \' " ` ~ ^ \\ ´';

/**
 * Dica (hint) persistente exibida abaixo dos campos que aplicam a regra — texto
 * amigável para o usuário, sem listar os caracteres um a um.
 */
export const MENSAGEM_CARACTERES_PROIBIDOS_DICA =
  'Não é permitida a utilização de caracteres especiais';

/**
 * Remove todos os caracteres proibidos de uma string. Usado para bloquear a
 * digitação/colagem no frontend (a classe literal mora só neste arquivo — fonte única).
 */
export function removerCaracteresProibidos(texto: string): string {
  return texto.replace(/['"`~^\\´]/g, '');
}
