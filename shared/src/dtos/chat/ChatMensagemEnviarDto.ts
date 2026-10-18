import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Uma mensagem do usuário para a IA, na conversa do dia. */
export class ChatMensagemEnviarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  texto: string;
}
