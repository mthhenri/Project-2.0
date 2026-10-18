import { Injectable } from '@nestjs/common';
import { ProporPausarExecucaoDto, PropostaPausarExecucaoDadosDto, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ExecucaoService } from '../services/execucao.service';

/** Propõe pausar a execução em andamento; **não pausa nada** (só o clique de Confirmar pausa). Sem execução ativa, nem propõe. */
@Injectable()
export class ProporPausarExecucaoFerramenta extends FerramentaPropostaIa<ProporPausarExecucaoDto> {
  readonly nome = 'propor_pausar_execucao';
  readonly descricao =
    'Propõe pausar a execução em andamento do usuário. Passe descricao com o trabalho feito até ali, em linguagem formal e sem "eu" (é o que fica registrado na execução); ' +
    'é o caso de "vou almoçar" ou de um intervalo no meio de uma atividade. Só descreva trabalho: almoço ou pausa pessoal nunca entram na descrição. ' +
    'Sem descricao, vale a descrição provisória. Nada é pausado até o usuário confirmar. ' +
    'O gestor pode pausar a execução de OUTRA pessoa informando `usuarioId` (de listar_usuarios); sem ele, é a de quem conversa com você.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporPausarExecucaoDto;
  readonly tipoProposta = TipoPropostaIaEnum.PAUSAR_EXECUCAO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly atividadeService: AtividadeService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly execucaoService: ExecucaoService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporPausarExecucaoDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const { usuarioId, ...semUsuario } = entrada;
    const alvoId = usuarioId ?? usuarioAtivo.sub;
    const deOutro = alvoId !== usuarioAtivo.sub;
    if (deOutro && !temPermissaoDeGestor(usuarioAtivo.tipo)) throw new BusinessException('Só o gestor pausa a execução de outra pessoa.');
    const ativa = (await this.execucaoService.recuperarAtivaDoUsuario({ usuarioId: alvoId }, usuarioAtivo)).dados;
    if (!ativa) throw new BusinessException(deOutro ? 'Essa pessoa não tem execução em andamento: não há o que pausar' : 'O usuário não tem execução em andamento: não há o que pausar');
    const atividade = (await this.atividadeService.recuperar({ id: ativa.atividadeId }, usuarioAtivo)).dados;
    const demanda = atividade ? await this.demandaRepositorio.recuperar({ id: atividade.demandaId }) : null;

    const dados: PropostaPausarExecucaoDadosDto = {
      ...semUsuario,
      atividadeNome: atividade?.nome,
      demandaNome: demanda?.nome,
      ...(deOutro ? { usuarioId: alvoId, usuarioNome: atividade?.nomeUsuario } : {}),
    };
    return { ...dados };
  }
}
