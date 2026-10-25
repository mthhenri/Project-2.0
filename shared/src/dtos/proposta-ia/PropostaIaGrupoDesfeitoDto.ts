import { PropostaIaGrupoItemDto } from './PropostaIaGrupoItemDto';

/** O que aconteceu com cada proposta do grupo, na ordem em que foram tratadas. */
export interface PropostaIaGrupoDesfeitoDto {
  itens: PropostaIaGrupoItemDto[];
}
