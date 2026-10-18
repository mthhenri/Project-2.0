import { IsNotEmpty, IsString, Matches } from 'class-validator';

/** Pede a conversa de um dia do próprio usuário. */
export class ChatConversaRecuperarDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar no formato yyyy-mm-dd' })
  data: string;
}
