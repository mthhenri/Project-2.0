import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-assistente-descricao',
  standalone: true,
  imports: [CommonModule],
  template: '',
})
export class AssistenteDescricaoComponent {
  @Input() textoAtual: string = '';
  @Input() tipoEntidade: 'execucao' | 'atividade' | 'demanda' = 'execucao';
  @Input() contextoEntidade: string = '';

  @Output() textoAuxiliadoAceito = new EventEmitter<string>();
}
