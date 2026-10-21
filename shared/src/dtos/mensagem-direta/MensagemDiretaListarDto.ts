import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LIMITE_CURSOR_DA_CONVERSA_DIRETA, LIMITE_MAXIMO_DA_CONVERSA_DIRETA } from '../../utils/mensagem-direta';

/**
 * Pede uma página da conversa com outra pessoa, da mais nova para a mais antiga. Sem `cursor` vem a página mais nova; com o
 * `proximoCursor` da resposta anterior vem a seguinte.
 */
export class MensagemDiretaListarDto {
  /** A outra pessoa da conversa. Vem da rota e é preenchido pela controller; nunca pelo corpo ou pela query. */
  usuarioId: number;

  /** Opaco: quem o monta e o lê é o armazenamento. O cliente só devolve o que recebeu. */
  @IsOptional()
  @IsString()
  @MaxLength(LIMITE_CURSOR_DA_CONVERSA_DIRETA)
  cursor?: string;

  /** Quando omitido vale `LIMITE_PADRAO_DA_CONVERSA_DIRETA`. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO_DA_CONVERSA_DIRETA)
  limite?: number;
}
