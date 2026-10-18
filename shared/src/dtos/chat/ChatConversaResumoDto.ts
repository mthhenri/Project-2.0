/** Uma conversa (um dia) do usuário, para a lista do histórico do chat. */
export interface ChatConversaResumoDto {
  /** `<usuarioId>-<yyyy-mm-dd>`. */
  conversaId: string;
  /** Dia da conversa, `yyyy-mm-dd`. */
  data: string;
  /** Nome que a IA deu à conversa; `null` enquanto não deu (a lista cai no trecho da primeira mensagem). */
  titulo: string | null;
  /** Texto da primeira mensagem do dia. */
  primeiraMensagem: string;
  quantidadeDeMensagens: number;
  ultimaMensagemDate: Date;
}
