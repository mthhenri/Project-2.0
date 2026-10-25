import { Component, input, output } from '@angular/core';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { TipoDemandaStatusEnum } from '@project20/shared';
import { OPCOES_STATUS_DEMANDA, ROTULO_STATUS_DEMANDA } from '../../constants/demanda-cores.constants';
import { DemandaStatusMarcaComponent } from '../demanda-status-marca/demanda-status-marca.component';

/**
 * O status da demanda em bolinha (task 238), o mesmo componente na Árvore, no detalhe, no Controle de horas e no cartão do grafo. O nome do status
 * vai no tooltip. Com `editavel` (só gestor), a bolinha vira o gatilho de um popover de troca rápida e emite `statusEscolhido`; a persistência
 * (otimista, com rollback) é de quem hospeda.
 */
@Component({
  selector: 'app-demanda-status',
  standalone: true,
  imports: [PopoverModule, TooltipModule, DemandaStatusMarcaComponent],
  templateUrl: './demanda-status.component.html',
  styleUrl: './demanda-status.component.scss',
})
export class DemandaStatusComponent {
  readonly status = input.required<TipoDemandaStatusEnum>();
  readonly editavel = input<boolean>(false);
  /** Lado da bolinha, em px. */
  readonly tamanho = input<number>(18);
  readonly statusEscolhido = output<TipoDemandaStatusEnum>();

  readonly opcoes = OPCOES_STATUS_DEMANDA;

  rotulo(status: TipoDemandaStatusEnum): string {
    return ROTULO_STATUS_DEMANDA[status];
  }

  abrir(evento: Event, popover: Popover): void {
    evento.stopPropagation();
    popover.toggle(evento);
  }

  escolher(novoStatus: TipoDemandaStatusEnum, popover: Popover): void {
    popover.hide();
    if (novoStatus !== this.status()) this.statusEscolhido.emit(novoStatus);
  }
}
