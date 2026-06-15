import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'minutosParagHoras', standalone: true })
export class MinutosParaHorasPipe implements PipeTransform {
  transform(totalMinutos: number | null | undefined): string {
    if (totalMinutos == null) return '0h 0min';

    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas}h ${minutos}min`;
  }
}
