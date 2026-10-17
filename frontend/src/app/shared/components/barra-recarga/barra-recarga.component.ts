import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Barra fina indeterminada no topo do contêiner (`position: relative`) enquanto uma recarga
 * acontece com o conteúdo anterior ainda visível, esmaecido (classe global `conteudo-recarregando`).
 */
@Component({
  selector: 'app-barra-recarga',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (ativa) {
    <div class="barra-recarga" role="progressbar" aria-label="Atualizando" aria-busy="true"></div>
  }`,
  styles: `
    .barra-recarga {
      position: absolute;
      inset: 0 0 auto 0;
      height: 3px;
      overflow: hidden;
      z-index: 2;
      background: color-mix(in srgb, var(--p-primary-color) 18%, transparent);
    }
    .barra-recarga::after {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 35%;
      background: var(--p-primary-color);
      animation: barra-recarga-correr 1s ease-in-out infinite;
    }
    @keyframes barra-recarga-correr {
      from { transform: translateX(-100%); }
      to { transform: translateX(300%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .barra-recarga::after { animation-duration: 3s; }
    }
  `,
})
export class BarraRecargaComponent {
  @Input() ativa = false;
}
