import { IsString, MaxLength } from 'class-validator';

/** Tamanho máximo do nome de uma conversa dado pelo usuário. */
export const LIMITE_TITULO_CONVERSA_EDITADO = 120;

/** Corpo do pedido para renomear a conversa de um dia (o dia vem da rota). Em branco (depois de aparar) volta ao nome padrão. */
export class ChatConversaTituloAlterarDto {
  @IsString()
  @MaxLength(LIMITE_TITULO_CONVERSA_EDITADO, { message: `titulo deve ter no máximo ${LIMITE_TITULO_CONVERSA_EDITADO} caracteres` })
  titulo: string;
}
