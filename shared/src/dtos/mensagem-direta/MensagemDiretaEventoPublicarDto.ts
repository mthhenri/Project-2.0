import { MensagemDiretaEventoDto } from './MensagemDiretaEventoDto';

/** Interno (backend): publica um evento para os streams dos usuários listados, em qualquer instância da API. */
export interface MensagemDiretaEventoPublicarDto {
  usuarioIds: number[];
  evento: MensagemDiretaEventoDto;
}
