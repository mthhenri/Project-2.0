import { Injectable } from '@nestjs/common';
import { ExecucoesDaEquipeListadasDto, ExecucoesDaEquipeListarDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { agruparExecucoesPorPessoa } from '../domain/equipe-do-dia';
import { ExecucaoService } from '../services/execucao.service';

/** Quantas execuções a ferramenta lê de uma vez; o dia de uma equipe cabe com folga. */
export const LIMITE_EXECUCOES_DA_EQUIPE = 150;

/**
 * As execuções da **equipe** num dia, por pessoa (task 153). Só o gestor tem esta ferramenta (o registro a esconde dos demais) e a
 * `ExecucaoService` ainda confere: o gestor vê o trabalho de todos por ser gestor, sem depender de `demanda_usuario`.
 */
@Injectable()
export class ListarExecucoesDaEquipeFerramenta extends FerramentaIa<ExecucoesDaEquipeListarDto> {
  readonly nome = 'listar_execucoes_da_equipe_no_dia';
  readonly descricao =
    'Lista o que a equipe executou num dia (hoje, se não informar `data` em yyyy-mm-dd), agrupado por pessoa, com atividade, demanda, projeto, descrição, horário e o total de minutos de cada um. ' +
    'Use para "o que a equipe fez hoje?" e "o que a Fulana fez ontem?". Só descreva o trabalho de outras pessoas ao gestor que perguntou.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ExecucoesDaEquipeListarDto;

  constructor(
    private readonly execucaoService: ExecucaoService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async executar(entrada: ExecucoesDaEquipeListarDto, usuarioAtivo: JwtPayload): Promise<ExecucoesDaEquipeListadasDto> {
    const data = entrada.data ?? dataNoFuso(this.agora(), this.configService.obter().aplicacao.fusoHorario);
    const dados = (await this.execucaoService.listar({ data, itensPorPagina: LIMITE_EXECUCOES_DA_EQUIPE }, usuarioAtivo)).dados;
    const itens = dados?.itens ?? [];
    return {
      data,
      pessoas: agruparExecucoesPorPessoa(
        itens.map((execucao) => ({
          usuarioId: execucao.usuarioId,
          usuario: execucao.nomeUsuario,
          atividade: execucao.nomeAtividade,
          demanda: execucao.nomeDemanda,
          projeto: execucao.nomeProjeto,
          descricao: execucao.descricao,
          inicio: new Date(execucao.inicioData),
          fim: execucao.fimData ? new Date(execucao.fimData) : null,
          minutos: execucao.duracaoMinutos,
        })),
      ),
      totalExecucoes: dados?.totalItens ?? itens.length,
      haMais: (dados?.totalItens ?? 0) > itens.length,
    };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
