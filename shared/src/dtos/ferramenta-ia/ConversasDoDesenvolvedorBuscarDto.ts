import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { AutorChatEnum } from '../../enums/autor-chat.enum';

/** Entrada da ferramenta `buscar_nas_conversas_do_desenvolvedor` (gestor): de quem e o que procurar. */
export class ConversasDoDesenvolvedorBuscarDto {
  @Type(() => Number)
  @IsInt()
  usuarioId!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  texto!: string;
}

/** Uma mensagem achada, com o dia da conversa a que pertence. */
export interface MensagemAchadaDoDesenvolvedorDto {
  /** `yyyy-mm-dd`. */
  data: string;
  autor: AutorChatEnum;
  texto: string;
  truncada: boolean;
}

/** O que a ferramenta `buscar_nas_conversas_do_desenvolvedor` devolve à IA. */
export interface ConversasDoDesenvolvedorBuscadasDto {
  usuarioId: number;
  usuario: string;
  mensagens: MensagemAchadaDoDesenvolvedorDto[];
}
