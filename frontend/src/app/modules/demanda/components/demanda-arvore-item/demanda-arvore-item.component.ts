import { Component, Input, Output, EventEmitter, forwardRef, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { Tag } from 'primeng/tag';
import { ContextMenu } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { DemandaArvoreItemDto, TipoDemandaStatusEnum } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';

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
  @Output() demandaMembrosSolicitados = new EventEmitter<number>();

  private readonly sessao = inject(UsuarioSessaoService);

  /** Único menu de contexto aberto na árvore, compartilhado entre todas as instâncias. */
  private static menuAberto: ContextMenu | null = null;

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
    ];

    // Editar é gestor-only na árvore; o desenvolvedor edita pela dialog de detalhe,
    // onde a membresia da demanda (podeEditar) é conhecida.
    if (this.sessao.eGestor()) {
      itensBase.push({
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.demandaEditarSolicitada.emit(this.arvoreItem.id),
      });
    }

    if (this.arvoreItem.isEstrutural) {
      itensBase.push({
        label: 'Nova Sub-demanda',
        icon: 'pi pi-plus',
        command: () => this.demandaNovaFilhaSolicitada.emit(this.arvoreItem.id),
      });
    }

    // Tags e Membros dependem de membresia (gestor-only na árvore, pelo mesmo motivo de Editar).
    if (this.sessao.eGestor()) {
      itensBase.push(
        { separator: true },
        {
          label: 'Tags',
          icon: 'pi pi-tag',
          command: () => this.demandaTagsSolicitadas.emit(this.arvoreItem.id),
        },
        {
          label: 'Membros',
          icon: 'pi pi-users',
          command: () => this.demandaMembrosSolicitados.emit(this.arvoreItem.id),
        },
      );
    }

    itensBase.push(
      { separator: true },
      {
        label: 'Desc. Técnica',
        icon: 'pi pi-code',
        iconStyle: this.estiloIconeDescricao('--app-icone-tecnica', this.arvoreItem.temDescricaoTecnica),
        command: () => this.demandaEditarDescricaoSolicitada.emit({ id: this.arvoreItem.id, campo: 'descricaoTecnica' }),
      },
      {
        label: 'Desc. Cliente',
        icon: 'pi pi-user',
        iconStyle: this.estiloIconeDescricao('--app-icone-cliente', this.arvoreItem.temDescricaoCliente),
        command: () => this.demandaEditarDescricaoSolicitada.emit({ id: this.arvoreItem.id, campo: 'descricaoCliente' }),
      },
      {
        label: 'Documentação',
        icon: 'pi pi-book',
        iconStyle: this.estiloIconeDescricao('--app-icone-doc', this.arvoreItem.temDocumentacao),
        command: () => this.demandaEditarDescricaoSolicitada.emit({ id: this.arvoreItem.id, campo: 'documentacao' }),
      },
    );

    this.itensMenu = itensBase;
  }

  /**
   * Estilo do ícone de descrição: azul da família + bold + glow quando preenchido,
   * neutro quando vazio. Padroniza com a listagem de atividades e o dialog de detalhe.
   */
  private estiloIconeDescricao(tokenCor: string, preenchido: boolean): { [klass: string]: string } {
    if (!preenchido) return {};
    return {
      color: `var(${tokenCor})`,
      fontWeight: '700',
      textShadow: '0 0 4px color-mix(in srgb, currentColor 45%, transparent)',
    };
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

  severidadeStatus(status: TipoDemandaStatusEnum): 'secondary' | 'info' | 'success' {
    const mapa: Record<TipoDemandaStatusEnum, 'secondary' | 'info' | 'success'> = {
      [TipoDemandaStatusEnum.PENDENTE]:  'secondary',
      [TipoDemandaStatusEnum.PLANEJADA]: 'info',
      [TipoDemandaStatusEnum.CONCLUIDA]: 'success',
    };
    return mapa[status];
  }

  rotuloStatus(status: TipoDemandaStatusEnum): string {
    const mapa: Record<TipoDemandaStatusEnum, string> = {
      [TipoDemandaStatusEnum.PENDENTE]:  'Pendente',
      [TipoDemandaStatusEnum.PLANEJADA]: 'Planejada',
      [TipoDemandaStatusEnum.CONCLUIDA]:          'Concluída',
    };
    return mapa[status];
  }
}
