import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dataBrasileira', standalone: true })
export class DataBrasileiraPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined): string {
    if (!valor) return '';

    let data: Date;
    if (typeof valor === 'string') {
      // Date-only strings (YYYY-MM-DD) must be parsed as local noon to avoid UTC midnight timezone shift
      data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
        ? new Date(valor + 'T12:00:00')
        : new Date(valor);
    } else {
      data = valor;
    }
    return data.toLocaleDateString('pt-BR');
  }
}
