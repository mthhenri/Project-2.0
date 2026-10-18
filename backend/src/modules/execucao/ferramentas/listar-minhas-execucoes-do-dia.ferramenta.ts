import { Injectable } from '@nestjs/common';
import { MinhasExecucoesDoDiaListadasDto, MinhasExecucoesDoDiaListarDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { ExecucaoService } from '../services/execucao.service';

/** Quantas execuções voltam de uma vez à IA. */
export const LIMITE_EXECUCOES_DA_FERRAMENTA = 30;

/** As execuções de hoje (no fuso do sistema) do **próprio** usuário, com o total de minutos do dia. */
@Injectable()
export class ListarMinhasExecucoesDoDiaFerramenta extends FerramentaIa<MinhasExecucoesDoDiaListarDto> {
  readonly nome = 'listar_minhas_execucoes_do_dia';
  readonly descricao =
    'Lista as execuções do usuário que começaram num dia (hoje, se não informar `data` em yyyy-mm-dd), com o id, a atividade, a demanda, a descrição, o horário e a duração, e o total de minutos do dia. ' +
    'Use para responder o que o usuário já fez, para retomar o contexto do dia e para achar o execucaoId de uma execução a corrigir.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = MinhasExecucoesDoDiaListarDto;

  constructor(
    private readonly execucaoService: ExecucaoService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async executar(entrada: MinhasExecucoesDoDiaListarDto, usuarioAtivo: JwtPayload): Promise<MinhasExecucoesDoDiaListadasDto> {
    const data = entrada.data ?? dataNoFuso(this.agora(), this.configService.obter().aplicacao.fusoHorario);
    const resposta = await this.execucaoService.listar(
      { usuarioId: usuarioAtivo.sub, data, itensPorPagina: LIMITE_EXECUCOES_DA_FERRAMENTA },
      usuarioAtivo,
    );
    const dados = resposta.dados;
    const itens = dados?.itens ?? [];
    const total = dados?.totalItens ?? 0;
    return {
      data,
      execucoes: itens.map((execucao) => ({
        id: execucao.id,
        atividade: execucao.nomeAtividade,
        demanda: execucao.nomeDemanda,
        projeto: execucao.nomeProjeto,
        descricao: execucao.descricao,
        inicio: new Date(execucao.inicioData).toISOString(),
        fim: execucao.fimData ? new Date(execucao.fimData).toISOString() : null,
        minutos: execucao.duracaoMinutos,
      })),
      totalMinutos: dados?.totalMinutosDia ?? 0,
      total,
      haMais: total > itens.length,
    };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
