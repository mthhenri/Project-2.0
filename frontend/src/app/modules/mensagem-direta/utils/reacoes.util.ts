import { ReacaoMensagemDiretaDto } from '@project20/shared';
import { MensagemNaConversa } from './mensagem-direta.util';

// Reações às mensagens do chat entre colaboradores (task 314). Lógica pura: nada aqui conhece Angular nem o DOM.

/** Uma pílula sob o balão: o emoji, quantas pessoas reagiram com ele, se uma delas é o usuário e quem foram. */
export interface PilulaDeReacao {
    reacao: string;
    total: number;
    minha: boolean;
    /** Os nomes, com "Você" primeiro; vai na dica da pílula. */
    nomes: string[];
}

/**
 * Agrupa as reações da mensagem por emoji, na ordem em que cada emoji apareceu pela primeira vez. `nomeDe` dá o nome de quem reagiu (a tela só conhece
 * as duas pessoas da conversa); a reação do próprio usuário vira "Você".
 */
export function agruparReacoes(reacoes: ReacaoMensagemDiretaDto[], meuId: number | undefined, nomeDe: (usuarioId: number) => string): PilulaDeReacao[] {
    const pilulas = new Map<string, PilulaDeReacao>();
    for (const item of reacoes) {
        const minha = item.usuarioId === meuId;
        const nome = minha ? 'Você' : nomeDe(item.usuarioId);
        const atual = pilulas.get(item.reacao);
        if (!atual) {
            pilulas.set(item.reacao, { reacao: item.reacao, total: 1, minha, nomes: [nome] });
            continue;
        }
        atual.total++;
        atual.minha = atual.minha || minha;
        atual.nomes = minha ? [nome, ...atual.nomes] : [...atual.nomes, nome];
    }
    return [...pilulas.values()];
}

/** A reação do usuário à mensagem, ou `null`. */
export function minhaReacao(reacoes: ReacaoMensagemDiretaDto[], meuId: number | undefined): string | null {
    return reacoes.find((item) => item.usuarioId === meuId)?.reacao ?? null;
}

/** Troca as reações de uma mensagem da conversa aberta; as outras mensagens ficam como estão (e a lista só muda se a mensagem existir). */
export function aplicarReacoesNaMensagem(mensagens: MensagemNaConversa[], mensagemId: string, reacoes: ReacaoMensagemDiretaDto[]): MensagemNaConversa[] {
    if (!mensagens.some((mensagem) => mensagem.mensagemId === mensagemId)) return mensagens;
    return mensagens.map((mensagem) => (mensagem.mensagemId === mensagemId ? { ...mensagem, reacoes } : mensagem));
}

/** O texto do aviso ao autor (o nome de quem reagiu vai à parte, como nas mensagens): "reagiu à sua mensagem com 👍". */
export function textoDoAvisoDeReacao(reacao: string): string {
    return `reagiu à sua mensagem com ${reacao}`;
}
