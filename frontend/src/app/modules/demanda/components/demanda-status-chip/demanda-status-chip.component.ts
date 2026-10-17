import { Component, input, output } from '@angular/core';
import { Tag } from 'primeng/tag';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { TipoDemandaStatusEnum } from '@project20/shared';

type SeveridadeStatus = 'secondary' | 'info' | 'success' | 'danger';

const SEVERIDADE: Record<TipoDemandaStatusEnum, SeveridadeStatus> = {
  [TipoDemandaStatusEnum.PENDENTE]:  'secondary',
  [TipoDemandaStatusEnum.PLANEJADA]: 'info',
  [TipoDemandaStatusEnum.CONCLUIDA]: 'success',
  [TipoDemandaStatusEnum.CANCELADA]: 'danger',
};

const ROTULO: Record<TipoDemandaStatusEnum, string> = {
  [TipoDemandaStatusEnum.PENDENTE]:  'Pendente',
  [TipoDemandaStatusEnum.PLANEJADA]: 'Planejada',
  [TipoDemandaStatusEnum.CONCLUIDA]: 'Concluída',
  [TipoDemandaStatusEnum.CANCELADA]: 'Cancelada',
};

/**
 * Chip de status da demanda. Com `editavel`, vira gatilho de um popover de troca rápida (mesmo desenho
 * do Planejamento) e emite `statusEscolhido`; a persistência (otimista, com rollback) é de quem hospeda.
 */
@Component({
  selector: 'app-demanda-status-chip',
  standalone: true,
  imports: [Tag, PopoverModule, TooltipModule],
  templateUrl: './demanda-status-chip.component.html',
  styleUrl: './demanda-status-chip.component.scss',
})
export class DemandaStatusChipComponent {
  readonly status = input.required<TipoDemandaStatusEnum>();
  readonly editavel = input<boolean>(false);
  readonly statusEscolhido = output<TipoDemandaStatusEnum>();

  readonly opcoes = Object.values(TipoDemandaStatusEnum).map((value) => ({ value, label: ROTULO[value] }));

  severidade(status: TipoDemandaStatusEnum): SeveridadeStatus {
    return SEVERIDADE[status];
  }

  rotulo(status: TipoDemandaStatusEnum): string {
    return ROTULO[status];
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
