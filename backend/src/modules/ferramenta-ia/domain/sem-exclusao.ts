/** Palavras que denunciam uma ferramenta ou tipo de proposta de exclusão: a IA não exclui dados (princípio 3 da guarda-chuva). */
const PADRAO_DE_EXCLUSAO = /(exclu|apag|remov|delet|elimin|descart)/i;

/**
 * A exceção nomeada ao "sem exclusão" (task 230): as duas únicas ferramentas e os dois tipos de proposta que tiram algo do ar. Desconectar duas
 * demandas e excluir uma atividade que nunca teve execução, ambos por soft delete, com confirmação ou aviso e desfazer. A lista é fixa e fechada: um
 * terceiro nome só entra com uma spec que o aprove, e o teste quebra se ela crescer sem isso.
 */
export const EXCECOES_DE_EXCLUSAO_DA_IA: readonly string[] = [
  'propor_desconectar_demanda',
  'propor_excluir_atividade',
  'DESCONECTAR_DEMANDA',
  'EXCLUIR_ATIVIDADE',
];

export function sugereExclusao(nome: string): boolean {
  return PADRAO_DE_EXCLUSAO.test(nome);
}

/** O nome sugere exclusão e não está na lista fechada de exceções: é o que o registro de ferramentas e o teste dos tipos recusam. */
export function exclusaoNaoPermitida(nome: string): boolean {
  return sugereExclusao(nome) && !EXCECOES_DE_EXCLUSAO_DA_IA.includes(nome);
}
