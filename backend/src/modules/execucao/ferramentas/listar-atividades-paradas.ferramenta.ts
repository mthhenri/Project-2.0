import { Injectable } from '@nestjs/common';
import { AtividadesParadasListadasDto, AtividadesParadasListarDto, TipoAtividadeStatusEnum } from '@project20/shared';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { calcularAtividadesParadas } from '../domain/equipe-do-dia';
import { ExecucaoService } from '../services/execucao.service';

/** Quantas atividades em desenvolvimento a ferramenta examina e quantas paradas devolve. */
export const LIMITE_ATIVIDADES_EXAMINADAS = 200;
export const LIMITE_ATIVIDADES_PARADAS = 30;
export const DIAS_PARADA_PADRAO = 3;

/**
 * As atividades em desenvolvimento que estão paradas (task 153): sem execução em andamento e sem execução há N dias, por demanda ou
 * pessoa. Só o gestor; as services conferem o tipo e o acesso é por tipo, não por `demanda_usuario`.
 */
@Injectable()
export class ListarAtividadesParadasFerramenta extends FerramentaIa<AtividadesParadasListarDto> {
  readonly nome = 'listar_atividades_paradas';
  readonly descricao =
    'Lista as atividades em desenvolvimento que estão paradas: sem execução em andamento e sem execução há `diasParada` dias ou mais (padrão 3), da mais parada para a menos, ' +
    'podendo filtrar por demanda (`demandaId`) ou pessoa (`usuarioId`). Use para "quem está parado na demanda X?" e "o que está encalhado?".';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = AtividadesParadasListarDto;

  constructor(
    private readonly atividadeService: AtividadeService,
    private readonly execucaoService: ExecucaoService,
  ) {
    super();
  }

  async executar(entrada: AtividadesParadasListarDto, usuarioAtivo: JwtPayload): Promise<AtividadesParadasListadasDto> {
    const diasParada = entrada.diasParada ?? DIAS_PARADA_PADRAO;
    const abertas = (
      await this.atividadeService.listar(
        {
          ...(entrada.demandaId ? { demandaId: entrada.demandaId } : {}),
          ...(entrada.usuarioId ? { usuarioId: entrada.usuarioId } : {}),
          status: [TipoAtividadeStatusEnum.DESENVOLVENDO],
          itensPorPagina: LIMITE_ATIVIDADES_EXAMINADAS,
        },
        usuarioAtivo,
      )
    ).dados?.itens ?? [];
    const ultimas = (await this.execucaoService.listarUltimaPorAtividade({ atividadeIds: abertas.map((atividade) => atividade.id) }, usuarioAtivo)).dados ?? [];
    const paradas = calcularAtividadesParadas({
      atividades: abertas.map((atividade) => ({
        id: atividade.id,
        nome: atividade.nome,
        usuario: atividade.nomeUsuario,
        demanda: atividade.nomeDemanda,
        projeto: atividade.nomeProjeto,
        emExecucao: atividade.execucaoAtivaId !== null,
        criadaEm: new Date(atividade.createdDate),
      })),
      ultimaExecucao: new Map(ultimas.map((ultima) => [ultima.atividadeId, new Date(ultima.ultimaData)])),
      agora: this.agora(),
      diasParada,
    });
    return { diasParada, atividades: paradas.slice(0, LIMITE_ATIVIDADES_PARADAS), total: paradas.length, haMais: paradas.length > LIMITE_ATIVIDADES_PARADAS };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
