/** O nome da conversa depois de renomeada pelo usuário. */
export interface ChatConversaTituloAlteradoDto {
  conversaId: string;
  /** Nome vigente: o que o usuário deu ou, se ele deixou em branco, o padrão "Chat do dia ...". */
  titulo: string;
  /** `true` enquanto o nome é o do usuário (a IA não o troca mais). */
  tituloEditado: boolean;
}
