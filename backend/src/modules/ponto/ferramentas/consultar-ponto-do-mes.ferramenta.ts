import { Injectable } from '@nestjs/common';
import { PontoDoMesConsultadoDto, PontoDoMesConsultarDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { PontoService } from '../services/ponto.service';

/**
 * O ponto de um mês (horas feitas, meta e saldo do mês inteiro e os dias com trabalho ou justificativa), pela `PontoService` com o
 * usuário do token. Mesmas permissões de `consultar_ponto_do_dia`.
 */
@Injectable()
export class ConsultarPontoDoMesFerramenta extends FerramentaIa<PontoDoMesConsultarDto> {
  readonly nome = 'consultar_ponto_do_mes';
  readonly descricao =
    'Diz quantas horas o usuário trabalhou no mês (o atual, se não informar `ano` e `mes`), a meta do mês, o saldo (negativo é o que falta) e os dias com trabalho ou justificativa. ' +
    'Use para "como está meu mês?" e "quanto falta para bater a meta?". O gestor pode informar `usuarioId` (de listar_usuarios) para ver o ponto de outra pessoa.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = PontoDoMesConsultarDto;

  constructor(
    private readonly pontoService: PontoService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async executar(entrada: PontoDoMesConsultarDto, usuarioAtivo: JwtPayload): Promise<PontoDoMesConsultadoDto> {
    const hoje = dataNoFuso(this.agora(), this.configService.obter().aplicacao.fusoHorario);
    const ano = entrada.ano ?? Number(hoje.slice(0, 4));
    const mes = entrada.mes ?? Number(hoje.slice(5, 7));
    const ponto = await this.pontoService.consultarMensal({ ano, mes, usuarioId: entrada.usuarioId }, usuarioAtivo);
    return {
      ano: ponto.ano,
      mes: ponto.mes,
      usuario: ponto.nomeUsuario,
      diasUteis: ponto.diasUteisMes,
      metaMinutos: ponto.metaMinutosMes,
      trabalhadosMinutos: ponto.totalMinutosTrabalhadosMes,
      saldoMinutos: ponto.saldoMinutosMes,
      dias: ponto.dias
        .filter((dia) => dia.totalMinutosTrabalhados > 0 || dia.justificativaNome !== null)
        .map((dia) => ({
          data: dia.data,
          trabalhadosMinutos: dia.totalMinutosTrabalhados,
          saldoMinutos: dia.saldoMinutos,
          justificativa: dia.justificativaNome,
        })),
    };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
