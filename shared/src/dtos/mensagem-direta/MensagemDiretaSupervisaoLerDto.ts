import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LIMITE_CURSOR_DA_CONVERSA_DIRETA, LIMITE_MAXIMO_DA_CONVERSA_DIRETA } from '../../utils/mensagem-direta';

/** Pede uma página de uma conversa de terceiros, da mais nova para a mais antiga (task 214). Cada abertura gera uma linha de auditoria. */
export class MensagemDiretaSupervisaoLerDto {
  /** `<menorUsuarioId>-<maiorUsuarioId>`. Vem da rota e é preenchido pela controller; nunca pelo corpo ou pela query. */
  conversaId: string;

  /** Opaco: o `proximoCursor` da resposta anterior. */
  @IsOptional()
  @IsString()
  @MaxLength(LIMITE_CURSOR_DA_CONVERSA_DIRETA)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO_DA_CONVERSA_DIRETA)
  limite?: number;
}
