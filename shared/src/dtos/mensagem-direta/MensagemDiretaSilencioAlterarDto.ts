import { IsBoolean } from 'class-validator';

/** Silencia (ou reativa) os avisos da conversa com uma pessoa. */
export class MensagemDiretaSilencioAlterarDto {
  /** A outra pessoa da conversa. Vem da rota e é preenchido pela controller; nunca pelo corpo. */
  usuarioId: number;

  @IsBoolean()
  silenciada: boolean;
}
