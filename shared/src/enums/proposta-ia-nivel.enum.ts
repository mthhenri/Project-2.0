/** Quanto a IA pergunta antes de agir numa proposta (task 228): quanto mais fácil de desfazer, menos ela pergunta. */
export enum PropostaIaNivelEnum {
  /** A IA executa na hora e deixa uma linha de aviso na conversa, com Desfazer pelo prazo de hoje. */
  FAZ_E_AVISA     = 'FAZ_E_AVISA',
  /** Nada acontece até o usuário confirmar no cartão. */
  PERGUNTA        = 'PERGUNTA',
  /** Fixo, fora da configuração: mexe em horas, em ponto, em projeto ou em outra pessoa. */
  SEMPRE_PERGUNTA = 'SEMPRE_PERGUNTA',
}
