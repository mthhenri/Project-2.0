import { MensagemDiretaResumoDto } from './MensagemDiretaResumoDto';

/** Resultado da busca: mais relevantes primeiro. */
export interface MensagemDiretaBuscadoDto {
  mensagens: MensagemDiretaResumoDto[];
}
