import type { PropostaIaRecuperadaDto } from '../proposta-ia/PropostaIaRecuperadaDto';

/**
 * Uma proposta da IA **para quem está olhando** a conversa (task 315). Sem acesso ao alvo, `acessivel` é `false` e **nenhum dado** da proposta volta: a
 * tela mostra "Ação oculta por falta de acesso". Só quem chamou a IA resolve a proposta (`podeResolver`).
 */
export interface MensagemDiretaPropostaRecuperadaDto {
    propostaId: number;
    acessivel: boolean;
    podeResolver: boolean;
    proposta: PropostaIaRecuperadaDto | null;
}
