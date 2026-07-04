import { Pipe, PipeTransform } from '@angular/core';
import { formatarTempoDemanda, UnidadeTempoEntrada } from '../../core/models/visualizacao-tempo.model';

/**
 * Formata um tempo de demanda (horas estimadas ou minutos executados/restantes) conforme
 * a preferência horas/dias. `emDias` chega como argumento (lido do signal no template),
 * mantendo o pipe puro e reativo à troca da preferência.
 */
@Pipe({ name: 'tempoDemanda', standalone: true })
export class TempoDemandaPipe implements PipeTransform {
  transform(valor: number, emDias: boolean, unidade: UnidadeTempoEntrada): string {
    return formatarTempoDemanda(valor, emDias, unidade);
  }
}
