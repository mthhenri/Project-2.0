import { MensagemDiretaReferenciaResumoDto } from './MensagemDiretaReferenciaResumoDto';

/** As sugestões do `#`: demandas e atividades cujo nome contém o texto, no máximo oito. */
export interface MensagemDiretaReferenciasBuscadasDto {
  referencias: MensagemDiretaReferenciaResumoDto[];
}
