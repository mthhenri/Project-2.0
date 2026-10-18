import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Busca textual (em português, sem acento) nas mensagens do próprio usuário, com período opcional. */
export class ChatBuscarDto {
  @IsString()
  @IsNotEmpty()
  texto: string;

  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fim?: string;
}
