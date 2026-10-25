import { Component, computed, input } from '@angular/core';
import { TipoDemandaStatusEnum } from '@project20/shared';
import { COR_NO_BORDA } from '../../constants/demanda-cores.constants';

/**
 * A marca do status da demanda, só o desenho (task 238): o mesmo círculo visto de quatro jeitos. Pendente vazio; planejada com um ponto no
 * meio ("está no jogo, pode ser executada"); concluída cheia com ✓; cancelada com um risco. A cor vem de `COR_NO_BORDA`. Não tem tooltip nem
 * ação: quem a usa (`app-demanda-status`, a legenda e os chips de filtro) dá o nome e o clique. O grafo reaproveita a mesma marca no nó (task 241).
 */
@Component({
  selector: 'app-demanda-status-marca',
  standalone: true,
  templateUrl: './demanda-status-marca.component.html',
  styleUrl: './demanda-status-marca.component.scss',
})
export class DemandaStatusMarcaComponent {
  readonly status = input.required<TipoDemandaStatusEnum>();
  /** Lado do desenho, em px. */
  readonly tamanho = input<number>(18);

  readonly Status = TipoDemandaStatusEnum;
  readonly cor = computed(() => COR_NO_BORDA[this.status()]);
}
