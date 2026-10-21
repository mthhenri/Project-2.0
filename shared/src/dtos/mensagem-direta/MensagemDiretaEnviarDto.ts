import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import {
  LIMITE_MENCOES_MENSAGEM_DIRETA,
  LIMITE_REFERENCIAS_MENSAGEM_DIRETA,
  LIMITE_TEXTO_MENSAGEM_DIRETA,
} from '../../utils/mensagem-direta';
import { ReferenciaMensagemDto } from './ReferenciaMensagemDto';

/**
 * Uma mensagem para outra pessoa. O remetente é sempre quem está logado e a conversa é a do par; nada disso vem do corpo.
 * O texto é Markdown e não passa pelo validador de caracteres proibidos: código colado tem esses caracteres.
 */
export class MensagemDiretaEnviarDto {
  @IsInt()
  @Min(1)
  destinatarioId: number;

  /** UUID v4 gerado pelo cliente. Dá idempotência: reenviar a mesma mensagem depois de uma queda nunca duplica. */
  @IsUUID('4')
  mensagemId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'texto não pode ter só espaços' })
  @MaxLength(LIMITE_TEXTO_MENSAGEM_DIRETA, { message: `texto deve ter no máximo ${LIMITE_TEXTO_MENSAGEM_DIRETA} caracteres` })
  texto: string;

  /** Ids dos usuários mencionados com `@`; geram aviso para eles. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LIMITE_MENCOES_MENSAGEM_DIRETA)
  @IsInt({ each: true })
  @Min(1, { each: true })
  mencoes?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LIMITE_REFERENCIAS_MENSAGEM_DIRETA)
  @ValidateNested({ each: true })
  @Type(() => ReferenciaMensagemDto)
  referencias?: ReferenciaMensagemDto[];
}
