import { IsDateString } from 'class-validator';

/**
 * Marca a conversa com uma pessoa como lida até a mensagem mais nova que quem lê já viu. O corpo traz a data dessa mensagem
 * (`createdDate`), e não o instante da leitura: uma mensagem que chega entre a busca e a marcação nunca é dada como lida sem ter sido vista.
 */
export class MensagemDiretaLeituraAlterarDto {
  /** A outra pessoa da conversa. Vem da rota e é preenchido pela controller; nunca pelo corpo. */
  usuarioId: number;

  @IsDateString()
  lidaAteDate: string;
}
