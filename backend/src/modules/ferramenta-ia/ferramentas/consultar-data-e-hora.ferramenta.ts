import { Injectable } from '@nestjs/common';
import { DataHoraConsultadaDto, DataHoraConsultarDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { FerramentaIa } from '../domain/ferramenta-ia';

/** Data, hora e dia da semana no fuso do sistema: o modelo não sabe que dia é hoje (o bom dia e o pad precisam). */
@Injectable()
export class ConsultarDataEHoraFerramenta extends FerramentaIa<DataHoraConsultarDto> {
  readonly nome = 'consultar_data_e_hora';
  readonly descricao = 'Devolve a data, a hora e o dia da semana de agora, no fuso horário do sistema. Use sempre que precisar saber que dia ou que horas são.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = DataHoraConsultarDto;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async executar(): Promise<DataHoraConsultadaDto> {
    const fusoHorario = this.configService.obter().aplicacao.fusoHorario;
    const agora = this.agora();
    return {
      data: dataNoFuso(agora, fusoHorario),
      hora: new Intl.DateTimeFormat('pt-BR', { timeZone: fusoHorario, hour: '2-digit', minute: '2-digit', hour12: false }).format(agora),
      diaDaSemana: new Intl.DateTimeFormat('pt-BR', { timeZone: fusoHorario, weekday: 'long' }).format(agora),
      fusoHorario,
    };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
