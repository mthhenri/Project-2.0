import { Component, Input, Output, EventEmitter, forwardRef, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { Tag } from 'primeng/tag';
import { ContextMenu } from 'primeng/contextmenu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { DemandaArvoreItemDto, TipoDemandaStatusEnum } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { construirMenuDemanda, CampoDescricaoDemanda } from '../../utils/demanda-context-menu.factory';

type CampoDescricao = CampoDescricaoDemanda;

@Component({
  selector: 'app-demanda-arvore-item',
  standalone: true,
  imports: [Tag, ContextMenu, TooltipModule, TempoExibicaoPipe, forwardRef(() => DemandaArvoreItemComponent)],
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
  @Output() demandaMembrosSolicitados = new EventEmitter<number>();

  private readonly sessao = inject(UsuarioSessaoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  /** Único menu de contexto aberto na árvore, compartilhado entre todas as instâncias. */
  private static menuAberto: ContextMenu | null = null;

  itensMenu: MenuItem[] = [];

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['arvoreItem']) {
      this.reconstruirMenu();
    }
  }

  private reconstruirMenu(): void {
    this.itensMenu = construirMenuDemanda(
      this.arvoreItem,
      {
        aoVisualizar: (id) => this.demandaSelecionada.emit(id),
        aoEditar:     (id) => this.demandaEditarSolicitada.emit(id),
        aoNovaFilha:  (id) => this.demandaNovaFilhaSolicitada.emit(id),
        aoTags:       (id) => this.demandaTagsSolicitadas.emit(id),
        aoMembros:    (id) => this.demandaMembrosSolicitados.emit(id),
        aoDescricao:  (id, campo) => this.demandaEditarDescricaoSolicitada.emit({ id, campo }),
      },
      this.sessao.eGestor(),
    );
  }

  /** Abre o menu desta demanda, fechando antes qualquer outro já aberto na árvore. */
  abrirMenuContexto(evento: MouseEvent, menu: ContextMenu): void {
    const menuAnterior = DemandaArvoreItemComponent.menuAberto;
    if (menuAnterior && menuAnterior !== menu) {
      menuAnterior.hide();
    }
    DemandaArvoreItemComponent.menuAberto = menu;
    menu.show(evento);
  }

  /** Limpa a referência compartilhada quando este menu fecha (clique fora, comando, etc.). */
  aoFecharMenu(menu: ContextMenu): void {
    if (DemandaArvoreItemComponent.menuAberto === menu) {
      DemandaArvoreItemComponent.menuAberto = null;
    }
  }

  readonly expandido = signal(false);

  alternarExpansao(evento: MouseEvent): void {
    evento.stopPropagation();
    this.expandido.update((v) => !v);
  }

  severidadeStatus(status: TipoDemandaStatusEnum): 'secondary' | 'info' | 'success' | 'danger' {
    const mapa: Record<TipoDemandaStatusEnum, 'secondary' | 'info' | 'success' | 'danger'> = {
      [TipoDemandaStatusEnum.PENDENTE]:  'secondary',
      [TipoDemandaStatusEnum.PLANEJADA]: 'info',
      [TipoDemandaStatusEnum.CONCLUIDA]: 'success',
      [TipoDemandaStatusEnum.CANCELADA]: 'danger',
    };
    return mapa[status];
  }

  rotuloStatus(status: TipoDemandaStatusEnum): string {
    const mapa: Record<TipoDemandaStatusEnum, string> = {
      [TipoDemandaStatusEnum.PENDENTE]:  'Pendente',
      [TipoDemandaStatusEnum.PLANEJADA]: 'Planejada',
      [TipoDemandaStatusEnum.CONCLUIDA]:          'Concluída',
      [TipoDemandaStatusEnum.CANCELADA]:          'Cancelada',
    };
    return mapa[status];
  }
}
