/** Palavras que denunciam uma ferramenta ou tipo de proposta de exclusão: a IA não exclui dados (princípio 3 da guarda-chuva). */
const PADRAO_DE_EXCLUSAO = /(exclu|apag|remov|delet|elimin|descart)/i;

export function sugereExclusao(nome: string): boolean {
  return PADRAO_DE_EXCLUSAO.test(nome);
}
