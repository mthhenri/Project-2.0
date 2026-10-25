import { Injectable } from '@nestjs/common';
import { ProporExcluirAtividadeDto, PropostaExcluirAtividadeDadosDto, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { AtividadeService } from '../services/atividade.service';

/**
 * Propõe excluir UMA atividade que **nunca teve execução** (task 230); **não exclui nada** ao propor. É uma das duas exceções nomeadas ao "a IA não
 * exclui" (soft delete, desfazível). Só o dono da atividade e o gestor. **Com execução a IA não oferece**: a ferramenta recusa com o motivo, que o
 * modelo repassa ao usuário (a exclusão, nesse caso, é feita pela tela).
 */
@Injectable()
export class ProporExcluirAtividadeFerramenta extends FerramentaPropostaIa<ProporExcluirAtividadeDto> {
  readonly nome = 'propor_excluir_atividade';
  readonly descricao =
    'Propõe excluir UMA atividade que nunca teve execução ("essa atividade foi criada por engano", "apaga essa atividade"). Só o dono da atividade e o gestor. ' +
    'Atividade com execução não pode ser excluída pela IA: a ferramenta devolve o motivo, e você explica ao usuário que a exclusão é feita pela tela de Atividades. ' +
    'Nada é excluído até o usuário confirmar no cartão. O atividadeId vem de listar_minhas_atividades.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporExcluirAtividadeDto;
  readonly tipoProposta = TipoPropostaIaEnum.EXCLUIR_ATIVIDADE;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly atividadeService: AtividadeService,
    private readonly atividadeRepositorio: AtividadeRepository,
    private readonly demandaRepositorio: DemandaRepository,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporExcluirAtividadeDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    // `recuperar` confere a existência e o acesso do usuário à atividade: erro aqui volta ao modelo, e nenhuma proposta nasce.
    const atividade = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    if (!atividade) throw new BusinessException('Atividade não encontrada');
    if (!temPermissaoDeGestor(usuarioAtivo.tipo) && atividade.usuarioId !== usuarioAtivo.sub) {
      throw new BusinessException('Só o dono da atividade ou o gestor exclui a atividade.');
    }
    if (await this.atividadeRepositorio.possuiExecucao({ id: atividade.id })) {
      throw new BusinessException(
        `A atividade "${atividade.nome}" tem execuções, e a IA não exclui atividade com execução. Explique ao usuário que a exclusão, nesse caso, é feita pela tela de Atividades.`,
      );
    }
    const demanda = await this.demandaRepositorio.recuperar({ id: atividade.demandaId });
    const dados: PropostaExcluirAtividadeDadosDto = { atividadeId: atividade.id, atividadeNome: atividade.nome, demandaNome: demanda?.nome };
    return { ...dados };
  }
}
