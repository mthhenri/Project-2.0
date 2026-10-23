/**
 * Avisa a outra pessoa de que quem escreve está digitando para ela (o "digitando…"). O aviso não é gravado: vira o evento `DIGITANDO` do stream
 * e só chega a quem está conectado.
 */
export class MensagemDiretaDigitacaoAvisarDto {
  /** A outra pessoa da conversa. Vem da rota e é preenchido pela controller; nunca pelo corpo. */
  usuarioId: number;
}
