export enum SituacaoDaAbaNaPublicacaoEnum {
  /** O plano e a demanda já têm o mesmo texto (ou os dois estão vazios): nada a gravar. */
  IGUAL = 'IGUAL',
  /** O plano está vazio e a demanda tem texto: publicar apagaria o da demanda, o que só acontece por escolha explícita. */
  APAGARIA = 'APAGARIA',
  /** O plano tem texto diferente do da demanda: publicar grava o do plano. */
  PUBLICARIA = 'PUBLICARIA',
}
