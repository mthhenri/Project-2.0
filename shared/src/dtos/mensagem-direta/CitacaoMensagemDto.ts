/**
 * A mensagem a que outra responde (task 220). Montada pelo servidor no envio e gravada com a mensagem: o `trecho` é uma cópia do começo do texto
 * original, para a citação continuar legível quando a original está numa página antiga ainda não carregada.
 */
export interface CitacaoMensagemDto {
  /** A mensagem respondida, na mesma conversa. */
  mensagemId: string;
  /** Quem escreveu a mensagem respondida. */
  autorUsuarioId: number;
  /** O começo do texto original, sem marcação, com bloco de código como `[código]` (até `LIMITE_TRECHO_MENSAGEM_DIRETA`). */
  trecho: string;
}
