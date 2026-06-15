import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { carregamentoAtivo } from '../../../core/signals/carregamento.signal';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
})
export class LoadingSpinnerComponent {
  readonly carregando = carregamentoAtivo;
}
