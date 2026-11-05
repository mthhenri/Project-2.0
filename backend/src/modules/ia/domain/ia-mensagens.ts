import { IaMensagem } from './ia.tipos';

/**
 * O histórico neutro sem a `assinatura` opaca das chamadas de ferramenta. A assinatura (a `thoughtSignature` do Gemini) só vale para o
 * provedor que a gerou: ao tentar outro item da cadeia no meio de um turno, ela é descartada para não ir a quem não a entende. Devolve
 * as próprias mensagens quando não há assinatura nenhuma.
 */
export function descartarAssinaturas(mensagens: IaMensagem[]): IaMensagem[] {
    const temAssinatura = mensagens.some(
        (mensagem) => typeof mensagem.conteudo !== 'string' && mensagem.conteudo.some((bloco) => bloco.tipo === 'uso_ferramenta' && bloco.assinatura !== undefined),
    );
    if (!temAssinatura) return mensagens;
    return mensagens.map((mensagem) => {
        if (typeof mensagem.conteudo === 'string') return mensagem;
        return {
            ...mensagem,
            conteudo: mensagem.conteudo.map((bloco) => {
                if (bloco.tipo !== 'uso_ferramenta' || bloco.assinatura === undefined) return bloco;
                const { assinatura: _descartada, ...semAssinatura } = bloco;
                return semAssinatura;
            }),
        };
    });
}
