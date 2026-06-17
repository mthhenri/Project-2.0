import { Component, Input, Output, EventEmitter, forwardRef, signal, OnChanges, SimpleChanges } from '@angular/core';
import { Tag } from 'primeng/tag';
import { ContextMenu } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { DemandaArvoreItemDto, DemandaStatusEnum, DemandaPrioridadeEnum } from '@project20/shared';

type CampoDescricao = 'descricaoTecnica' | 'descricaoCliente' | 'documentacao';

@Component({
  selector: 'app-demanda-arvore-item',
  standalone: true,
  imports: [Tag, ContextMenu, forwardRef(() => DemandaArvoreItemComponent)],
  templateUrl: './demanda-arvore-item.component.html',
  styleUrl: './demanda-arvore-item.component.scss',
})
export class DemandaArvoreItemComponent implements OnChanges {
  @Input({ required: true }) arvoreItem!: DemandaArvoreItemDto;
  @Input() nivel: number = 0;
  @Output() demandaSelecionada = new EventEmitter<number>();
  @Output() demandaEditarSolicitada = new EventEmitter<number>();
  @Output() demandaEditarDescricaoSolicitada = new EventEmitter<{ id: number; campo: CampoDescricao }>();
  @Output() demandaNovaFilhaSolicitada = new EventEmitter<number>();
  @Output() demandaTagsSolicitadas = new EventEmitter<number>();

  itensMenu: MenuItem[] = [];

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['arvoreItem']) {
      this.reconstruirMenu();
    }
  }

  private reconstruirMenu(): void {
    const itensBase: MenuItem[] = [
      {
        label: 'Visualizar',
        icon: 'pi pi-eye',
        command: () => this.demandaSelecionada.emit(this.arvoreItem.id),
      },
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.demandaEditarSolicitada.emit(this.arvoreItem.id),
      },
    ];

    if (this.arvoreItem.isEstrutural) {
      itensBase.push({
        label: 'Nova Sub-demanda',
        icon: 'pi pi-plus',
        command: () => this.demandaNovaFilhaSolicitada.emit(this.arvoreItem.id),
      });
    }

    itensBase.push(
      { separator: true },
      {
        label: 'Tags',
        icon: 'pi pi-tag',
        command: () => this.demandaTagsSolicitadas.emit(this.arvoreItem.id),
      },
      { separator: true },
      {
        label: 'Desc. Técnica',
        icon: 'pi pi-file-edit',
        iconStyle: this.arvoreItem.temDescricaoTecnica ? { color: 'var(--p-primary-600)' } : {},
        command: () => this.demandaEditarDescricaoSolicitada.emit({ id: this.arvoreItem.id, campo: 'descricaoTecnica' }),
      },
      {
        label: 'Desc. Cliente',
        icon: 'pi pi-file-edit',
        iconStyle: this.arvoreItem.temDescricaoCliente ? { color: 'var(--p-primary-600)' } : {},
        command: () => this.demandaEditarDescricaoSolicitada.emit({ id: this.arvoreItem.id, campo: 'descricaoCliente' }),
      },
      {
        label: 'Documentação',
        icon: 'pi pi-file-edit',
        iconStyle: this.arvoreItem.temDocumentacao ? { color: 'var(--p-primary-600)' } : {},
        command: () => this.demandaEditarDescricaoSolicitada.emit({ id: this.arvoreItem.id, campo: 'documentacao' }),
      },
    );

    this.itensMenu = itensBase;
  }

  readonly expandido = signal(false);

  alternarExpansao(evento: MouseEvent): void {
    evento.stopPropagation();
    this.expandido.update((v) => !v);
  }

  severidadeStatus(status: DemandaStatusEnum): 'secondary' | 'info' | 'success' {
    const mapa: Record<DemandaStatusEnum, 'secondary' | 'info' | 'success'> = {
      [DemandaStatusEnum.PENDENTE]:  'secondary',
      [DemandaStatusEnum.PLANEJADA]: 'info',
      [DemandaStatusEnum.CONCLUIDA]: 'success',
    };
    return mapa[status];
  }

  rotuloStatus(status: DemandaStatusEnum): string {
    const mapa: Record<DemandaStatusEnum, string> = {
      [DemandaStatusEnum.PENDENTE]:  'Pendente',
      [DemandaStatusEnum.PLANEJADA]: 'Planejada',
      [DemandaStatusEnum.CONCLUIDA]:          'Concluída',
    };
    return mapa[status];
  }

  severidadePrioridade(prioridade: DemandaPrioridadeEnum): 'secondary' | 'info' | 'warn' | 'danger' {
    const mapa: Record<DemandaPrioridadeEnum, 'secondary' | 'info' | 'warn' | 'danger'> = {
      [DemandaPrioridadeEnum.BAIXA]:   'secondary',
      [DemandaPrioridadeEnum.MEDIA]:   'info',
      [DemandaPrioridadeEnum.ALTA]:    'warn',
      [DemandaPrioridadeEnum.CRITICA]: 'danger',
    };
    return mapa[prioridade];
  }
}
