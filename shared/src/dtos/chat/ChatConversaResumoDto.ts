/** Uma conversa (um dia) do usuário, para a lista do histórico do chat. */
export interface ChatConversaResumoDto {
  /** `<usuarioId>-<yyyy-mm-dd>`. */
  conversaId: string;
  /** Dia da conversa, `yyyy-mm-dd`. */
  data: string;
  /** Nome da conversa: o do usuário, o que a IA deu ou, enquanto não há nenhum, o padrão "Chat do dia 19 de outubro de 2026". Nunca vazio. */
  titulo: string;
  /** `true` quando o usuário renomeou a conversa (a IA não a renomeia mais). */
  tituloEditado: boolean;
  /** Texto da primeira mensagem do dia. */
  primeiraMensagem: string;
  quantidadeDeMensagens: number;
  ultimaMensagemDate: Date;
}
