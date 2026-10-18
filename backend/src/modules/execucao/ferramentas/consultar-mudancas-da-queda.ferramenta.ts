import { Injectable } from '@nestjs/common';
import { MudancasDaQuedaConsultadasDto, MudancasDaQuedaConsultarDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { recuperarExecucaoAtivaDetalhada } from '../domain/execucao-ativa-detalhada';
import { calcularMudancasDaQueda } from '../domain/mudancas-da-queda';
import { ExecucaoService } from '../services/execucao.service';

/** Quantos itens a ferramenta lê de cada lado: o dia de um usuário cabe com folga. */
export const LIMITE_DE_LEITURA_DA_QUEDA = 100;

/**
 * O que mudou no sistema do **próprio** usuário desde um instante (task 158): execuções iniciadas e encerradas hoje, a execução em
 * andamento e atividades criadas. Chama as services com o usuário do token; a IA usa depois de uma queda para continuar do estado real.
 */
@Injectable()
export class ConsultarMudancasDaQuedaFerramenta extends FerramentaIa<MudancasDaQuedaConsultarDto> {
  readonly nome = 'consultar_mudancas_da_queda';
  readonly descricao =
    'Lê o que o usuário mudou à mão no sistema (execuções iniciadas ou pausadas, atividades criadas) depois de um instante, enquanto a IA esteve fora do ar. ' +
    'Use quando a instrução de retomada pedir, passando o instante informado nela em `desde` (ISO 8601).';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = MudancasDaQuedaConsultarDto;

  constructor(
    private readonly execucaoService: ExecucaoService,
    private readonly atividadeService: AtividadeService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async executar(entrada: MudancasDaQuedaConsultarDto, usuarioAtivo: JwtPayload): Promise<MudancasDaQuedaConsultadasDto> {
    const data = dataNoFuso(this.agora(), this.configService.obter().aplicacao.fusoHorario);
    const execucoes = (await this.execucaoService.listar({ usuarioId: usuarioAtivo.sub, data, itensPorPagina: LIMITE_DE_LEITURA_DA_QUEDA }, usuarioAtivo)).dados?.itens ?? [];
    const ativa = await recuperarExecucaoAtivaDetalhada(this.execucaoService, usuarioAtivo);
    const atividades = (await this.atividadeService.listar({ usuarioId: usuarioAtivo.sub, itensPorPagina: LIMITE_DE_LEITURA_DA_QUEDA }, usuarioAtivo)).dados?.itens ?? [];

    const lidas = execucoes.map((execucao) => ({
      atividade: execucao.nomeAtividade,
      demanda: execucao.nomeDemanda,
      descricao: execucao.descricao,
      inicio: new Date(execucao.inicioData),
      fim: execucao.fimData ? new Date(execucao.fimData) : null,
    }));
    // A execução em andamento pode ter começado em outro dia: entra de qualquer jeito.
    if (ativa && !execucoes.some((execucao) => execucao.id === ativa.id)) {
      lidas.push({ atividade: ativa.nomeAtividade ?? '', demanda: ativa.nomeDemanda ?? '', descricao: ativa.descricao, inicio: new Date(ativa.inicioData), fim: null });
    }
    return calcularMudancasDaQueda({
      desde: new Date(entrada.desde),
      execucoes: lidas,
      atividades: atividades.map((atividade) => ({ nome: atividade.nome, demanda: atividade.nomeDemanda, criadaEm: new Date(atividade.createdDate) })),
    });
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
