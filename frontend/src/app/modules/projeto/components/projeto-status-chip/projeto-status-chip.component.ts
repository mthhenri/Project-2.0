import { Component, input, output } from '@angular/core';
import { Popover, PopoverModule } from 'primeng/popover';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TipoProjetoStatusEnum } from '@project20/shared';

type Severidade = 'success' | 'warn' | 'info' | 'danger';

const SEVERIDADE: Record<TipoProjetoStatusEnum, Severidade> = {
  [TipoProjetoStatusEnum.ATIVO]:     'success',
  [TipoProjetoStatusEnum.PAUSADO]:   'warn',
  [TipoProjetoStatusEnum.CONCLUIDO]: 'info',
  [TipoProjetoStatusEnum.CANCELADO]: 'danger',
};

const ROTULO: Record<TipoProjetoStatusEnum, string> = {
  [TipoProjetoStatusEnum.ATIVO]:     'Ativo',
  [TipoProjetoStatusEnum.PAUSADO]:   'Pausado',
  [TipoProjetoStatusEnum.CONCLUIDO]: 'Concluído',
  [TipoProjetoStatusEnum.CANCELADO]: 'Cancelado',
};

/**
 * Status do projeto (task 112): com `editavel` a tag ganha um caret e abre um popover com os 4 status
 * (troca em 2 cliques); a persistência otimista é de quem hospeda. Mesmo desenho do chip de status da demanda.
 */
@Component({
  selector: 'app-projeto-status-chip',
  standalone: true,
  imports: [Tag, PopoverModule, TooltipModule],
  templateUrl: './projeto-status-chip.component.html',
  styleUrl: './projeto-status-chip.component.scss',
})
export class ProjetoStatusChipComponent {
  readonly status = input.required<TipoProjetoStatusEnum>();
  readonly editavel = input<boolean>(false);
  readonly statusEscolhido = output<TipoProjetoStatusEnum>();

  readonly opcoes = Object.values(TipoProjetoStatusEnum).map((value) => ({ value, label: ROTULO[value] }));

  severidade(status: TipoProjetoStatusEnum): Severidade {
    return SEVERIDADE[status];
  }

  rotulo(status: TipoProjetoStatusEnum): string {
    return ROTULO[status];
  }

  abrir(evento: Event, popover: Popover): void {
    evento.stopPropagation();
    popover.toggle(evento);
  }

  escolher(novoStatus: TipoProjetoStatusEnum, popover: Popover): void {
    popover.hide();
    if (novoStatus !== this.status()) this.statusEscolhido.emit(novoStatus);
  }
}
