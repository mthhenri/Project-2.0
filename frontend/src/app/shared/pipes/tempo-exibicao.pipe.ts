import { Pipe, PipeTransform } from '@angular/core';
import { formatarTempoExibicao, UnidadeTempoEntrada } from '../../core/models/visualizacao-tempo.model';

/**
 * Formata um tempo de trabalho (horas estimadas ou minutos executados/restantes, de
 * demanda ou atividade) conforme a preferência horas/dias. `emDias` chega como argumento
 * (lido do signal no template), mantendo o pipe puro e reativo à troca da preferência.
 */
@Pipe({ name: 'tempoExibicao', standalone: true })
export class TempoExibicaoPipe implements PipeTransform {
  transform(valor: number, emDias: boolean, unidade: UnidadeTempoEntrada): string {
    return formatarTempoExibicao(valor, emDias, unidade);
  }
}
