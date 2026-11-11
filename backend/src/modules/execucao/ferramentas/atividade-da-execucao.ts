import { AtividadeRecuperadaDto, AtividadeRecuperarDto } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadeService } from '../../atividade/services/atividade.service';

/**
 * A atividade de uma execução em andamento, ou `null` quando ela não pode mais ser aberta: a demanda ou o projeto dela foi excluído com o
 * cronômetro rodando. A execução continua ativa e precisa poder ser pausada; a proposta só usa o nome da atividade e sai sem ele.
 */
export async function recuperarAtividadeDaExecucao(
    atividadeService: Pick<AtividadeService, 'recuperar'>,
    dto: AtividadeRecuperarDto,
    usuarioAtivo: JwtPayload,
): Promise<AtividadeRecuperadaDto | null> {
    try {
        return (await atividadeService.recuperar(dto, usuarioAtivo)).dados ?? null;
    } catch (erro) {
        if (erro instanceof ResourceNotFoundException) return null;
        throw erro;
    }
}
