import { MensagemDiretaResumoDto, ReacaoMensagemDiretaDto } from '@project20/shared';
import { MensagemDiretaReacaoRepository } from '../repositories/mensagem-direta-reacao.repository';

/**
 * Põe as reações (tabela do PostgreSQL) nas mensagens que o armazenamento devolveu, numa consulta só. O armazenamento sempre devolve `reacoes: []`.
 * Vale para a conversa um a um (task 314) e para o grupo (task 326).
 */
export async function juntarReacoesNasMensagens(reacaoRepositorio: MensagemDiretaReacaoRepository, mensagens: MensagemDiretaResumoDto[]): Promise<MensagemDiretaResumoDto[]> {
    if (mensagens.length === 0) return mensagens;
    const reacoes = await reacaoRepositorio.listarPorMensagens({ mensagemIds: mensagens.map((mensagem) => mensagem.mensagemId) });
    if (reacoes.length === 0) return mensagens;
    return mensagens.map((mensagem) => ({
        ...mensagem,
        reacoes: reacoes
            .filter((reacao) => reacao.mensagemId === mensagem.mensagemId.toLowerCase())
            .map(({ usuarioId, reacao }): ReacaoMensagemDiretaDto => ({ usuarioId, reacao })),
    }));
}
