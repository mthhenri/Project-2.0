import { MensagemDiretaPessoaResumoDto } from './MensagemDiretaPessoaResumoDto';

/** As pessoas ativas, menos quem pergunta, em ordem alfabética. */
export interface MensagemDiretaPessoasListadasDto {
  pessoas: MensagemDiretaPessoaResumoDto[];
}
