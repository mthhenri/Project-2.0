import { IsInt, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { AutorChatEnum } from '../../enums/autor-chat.enum';

/** Entrada da ferramenta `consultar_conversa_do_desenvolvedor` (gestor): de quem e de qual dia (`yyyy-mm-dd`). */
export class ConversaDoDesenvolvedorConsultarDto {
  @Type(() => Number)
  @IsInt()
  usuarioId!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data!: string;
}

/** Uma mensagem da conversa, só com o que a IA precisa para ler (sem tokens, modelo nem ids internos). */
export interface MensagemDaConversaDoDesenvolvedorDto {
  autor: AutorChatEnum;
  /** Markdown, cortado em `LIMITE_CARACTERES_DA_MENSAGEM` caracteres. */
  texto: string;
  truncada: boolean;
  /** ISO 8601. */
  data: string;
}

/** O que a ferramenta `consultar_conversa_do_desenvolvedor` devolve à IA. */
export interface ConversaDoDesenvolvedorConsultadaDto {
  usuarioId: number;
  usuario: string;
  data: string;
  titulo: string;
  mensagens: MensagemDaConversaDoDesenvolvedorDto[];
  /** `true` quando a conversa tem mais mensagens do que as devolvidas (as mais recentes ficam). */
  haMais: boolean;
}
