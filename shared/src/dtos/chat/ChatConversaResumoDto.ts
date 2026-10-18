/** Uma conversa (um dia) do usuário, para a lista do histórico do chat. */
export interface ChatConversaResumoDto {
  /** `<usuarioId>-<yyyy-mm-dd>`. */
  conversaId: string;
  /** Dia da conversa, `yyyy-mm-dd`. */
  data: string;
  /** Texto da primeira mensagem do dia (o que dá nome à conversa na lista). */
  primeiraMensagem: string;
  quantidadeDeMensagens: number;
  ultimaMensagemDate: Date;
}
