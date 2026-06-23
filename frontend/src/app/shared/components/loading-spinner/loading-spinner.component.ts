import { Component } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { carregamento } from '../../../core/signals/carregamento.signal';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [ProgressSpinnerModule],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
})
export class LoadingSpinnerComponent {
  readonly carregando = carregamento;
}
