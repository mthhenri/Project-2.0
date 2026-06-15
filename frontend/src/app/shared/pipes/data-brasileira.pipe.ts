import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dataBrasileira', standalone: true })
export class DataBrasileiraPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined): string {
    if (!valor) return '';

    const data = typeof valor === 'string' ? new Date(valor) : valor;
    return data.toLocaleDateString('pt-BR');
  }
}
