import { MensagemDiretaResumoDto } from '../mensagem-direta/MensagemDiretaResumoDto';

/** O que a busca achou dentro do grupo, mais relevantes primeiro; nunca traz mensagem de outro grupo nem de conversa um a um. */
export interface GrupoMensagemBuscadasDto {
    grupoId: number;
    mensagens: MensagemDiretaResumoDto[];
}
