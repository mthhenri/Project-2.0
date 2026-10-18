import { Injectable } from '@nestjs/common';
import { DiasNaoUteisConsultadosDto, DiasNaoUteisConsultarDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { ocorrenciasNoIntervalo } from '../domain/dias-nao-uteis-no-intervalo';
import { CalendarioService } from '../services/calendario.service';

/** Quantos dias voltam de uma vez à IA. */
export const LIMITE_DIAS_NAO_UTEIS_DA_FERRAMENTA = 60;

/** Janela padrão quando o usuário não informa o intervalo: os próximos 60 dias. */
const DIAS_DA_JANELA_PADRAO = 60;

/** Feriados, recessos e pontos facultativos num intervalo, pela `CalendarioService` (leitura aberta a qualquer usuário, como na tela). */
@Injectable()
export class ConsultarDiasNaoUteisFerramenta extends FerramentaIa<DiasNaoUteisConsultarDto> {
  readonly nome = 'consultar_dias_nao_uteis';
  readonly descricao =
    'Lista os feriados, recessos e pontos facultativos de um intervalo (`dataInicio` e `dataFim` em yyyy-mm-dd; sem eles, os próximos 60 dias), com a data, a descrição, o tipo e se é o dia todo ou meio período. ' +
    'Use para "tem feriado na sexta?" e para planejar prazos.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = DiasNaoUteisConsultarDto;

  constructor(
    private readonly calendarioService: CalendarioService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async executar(entrada: DiasNaoUteisConsultarDto, _usuarioAtivo: JwtPayload): Promise<DiasNaoUteisConsultadosDto> {
    const hoje = dataNoFuso(this.agora(), this.configService.obter().aplicacao.fusoHorario);
    const dataInicio = entrada.dataInicio ?? hoje;
    const dataFim = entrada.dataFim ?? this.somarDias(dataInicio, DIAS_DA_JANELA_PADRAO);
    const cadastrados = (await this.calendarioService.listar()).dados ?? [];
    const ocorrencias = ocorrenciasNoIntervalo(cadastrados, dataInicio, dataFim);
    return {
      dataInicio,
      dataFim,
      dias: ocorrencias.slice(0, LIMITE_DIAS_NAO_UTEIS_DA_FERRAMENTA).map(({ data, dia }) => ({
        data,
        descricao: dia.descricao,
        tipo: dia.tipo,
        duracao: dia.duracao,
      })),
      total: ocorrencias.length,
      haMais: ocorrencias.length > LIMITE_DIAS_NAO_UTEIS_DA_FERRAMENTA,
    };
  }

  private somarDias(data: string, dias: number): string {
    const instante = new Date(`${data}T12:00:00Z`);
    instante.setUTCDate(instante.getUTCDate() + dias);
    return instante.toISOString().slice(0, 10);
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
