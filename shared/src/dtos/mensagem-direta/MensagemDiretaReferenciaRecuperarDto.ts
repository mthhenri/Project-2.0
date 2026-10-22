import { ReferenciaMensagemDiretaEnum } from '../../enums/referencia-mensagem-direta.enum';

/** Qual referência resolver para o cartão. Vem da rota (`/referencia/:tipo/:id`) e é preenchido pela controller. */
export class MensagemDiretaReferenciaRecuperarDto {
  tipo: ReferenciaMensagemDiretaEnum;
  id: number;
}
