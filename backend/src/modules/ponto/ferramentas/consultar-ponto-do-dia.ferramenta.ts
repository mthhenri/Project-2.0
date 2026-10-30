import { Injectable } from '@nestjs/common';
import { PontoDoDiaConsultadoDto, PontoDoDiaConsultarDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { PontoService } from '../services/ponto.service';

/**
 * O ponto de um dia (horas feitas, meta e saldo), pela `PontoService` com o usuário do token: o desenvolvedor só lê o próprio e o gestor
 * pode pedir o de outro usuário. Devolve totais, nunca a lista de execuções (essas vêm de `listar_minhas_execucoes_do_dia`).
 */
@Injectable()
export class ConsultarPontoDoDiaFerramenta extends FerramentaIa<PontoDoDiaConsultarDto> {
  readonly nome = 'consultar_ponto_do_dia';
  readonly descricao =
    'Diz quantas horas o usuário trabalhou num dia (hoje, se não informar `data` em yyyy-mm-dd), a meta do dia, o saldo (negativo é o que falta) e se o dia é útil. ' +
    'Use para "quantas horas fiz hoje?" e "quanto falta para fechar o dia?". Dia anterior ao cadastro do usuário não tem meta: volta como não útil, com o motivo "Antes do cadastro". ' +
    'O gestor pode informar `usuarioId` (de listar_usuarios) para ver o ponto de outra pessoa.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = PontoDoDiaConsultarDto;

  constructor(
    private readonly pontoService: PontoService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async executar(entrada: PontoDoDiaConsultarDto, usuarioAtivo: JwtPayload): Promise<PontoDoDiaConsultadoDto> {
    const data = entrada.data ?? dataNoFuso(this.agora(), this.configService.obter().aplicacao.fusoHorario);
    const ponto = await this.pontoService.consultarDiario({ data, usuarioId: entrada.usuarioId }, usuarioAtivo);
    return {
      data: ponto.data,
      usuario: ponto.nomeUsuario,
      ehDiaUtil: ponto.ehDiaUtil,
      motivoNaoUtil: ponto.motivoNaoUtil,
      metaMinutos: ponto.metaMinutos,
      trabalhadosMinutos: ponto.totalMinutosTrabalhados,
      extraMinutos: ponto.minutosTrabalhadosExtra,
      saldoMinutos: ponto.saldoMinutos,
      totalExecucoes: ponto.execucoes.length,
    };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
