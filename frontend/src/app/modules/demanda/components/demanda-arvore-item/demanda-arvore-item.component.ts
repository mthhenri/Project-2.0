import { Component, Input, Output, EventEmitter, forwardRef, inject, OnChanges, SimpleChanges } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ContextMenu } from 'primeng/contextmenu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { DemandaArvoreItemDto, TipoDemandaStatusEnum } from '@project20/shared';
import { DemandaStatusChipComponent } from '../demanda-status-chip/demanda-status-chip.component';
import { dividirDestaque } from '../../utils/demanda-filtro.util';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { construirMenuDemanda, CampoDescricaoDemanda } from '../../utils/demanda-context-menu.factory';

type CampoDescricao = CampoDescricaoDemanda;

@Component({
  selector: 'app-demanda-arvore-item',
  standalone: true,
  imports: [ButtonModule, DemandaStatusChipComponent, ContextMenu, TooltipModule, TempoExibicaoPipe, forwardRef(() => DemandaArvoreItemComponent)],
  templateUrl: './demanda-arvore-item.component.html',
  styleUrl: './demanda-arvore-item.component.scss',
})
export class DemandaArvoreItemComponent implements OnChanges {
  @Input({ required: true }) arvoreItem!: DemandaArvoreItemDto;
  @Input() nivel: number = 0;
  /** IDs expandidos, guardados no painel: sobrevivem a recargas e recriação dos itens (task 98). */
  @Input() expandidos: ReadonlySet<number> = new Set<number>();
  /** Termo da busca da toolbar: destacado no nome (task 106). */
  @Input() termoBusca: string = '';
  /** Linha com o foco do teclado na árvore (↑↓→←); null quando a árvore não está focada. */
  @Input() focoId: number | null = null;
  /** O chip de status vira popover de troca rápida (só onde há quem persista: o painel da árvore). */
  @Input() statusEditavel: boolean = false;
  /** Executores ativos por demanda, quando os dados do planejamento estão carregados (gestor). */
  @Input() executoresPorDemanda: ReadonlyMap<number, string[]> = new Map();
  @Output() expansaoAlternada = new EventEmitter<number>();
  @Output() focoAlterado = new EventEmitter<number>();
  @Output() statusAlterado = new EventEmitter<{ demandaId: number; de: TipoDemandaStatusEnum; para: TipoDemandaStatusEnum }>();
  @Output() demandaSelecionada = new EventEmitter<number>();
  @Output() demandaEditarSolicitada = new EventEmitter<number>();
  @Output() demandaEditarDescricaoSolicitada = new EventEmitter<{ id: number; campo: CampoDescricao }>();
  @Output() demandaNovaFilhaSolicitada = new EventEmitter<number>();
  @Output() demandaTagsSolicitadas = new EventEmitter<number>();
  @Output() demandaMembrosSolicitados = new EventEmitter<number>();

  private readonly sessao = inject(UsuarioSessaoService);

  /** Ícones de descrição da linha: ícone, nome do campo e o tipo que escolhe a cor (tokens de ícone de descrição). */
  readonly descricoes: Array<{ campo: CampoDescricao; icone: string; rotulo: string; tipo: string }> = [
    { campo: 'descricaoTecnica', icone: 'pi pi-code', rotulo: 'Descrição técnica',   tipo: 'tecnica' },
    { campo: 'descricaoCliente', icone: 'pi pi-user', rotulo: 'Descrição do cliente', tipo: 'cliente' },
    { campo: 'documentacao',     icone: 'pi pi-book', rotulo: 'Documentação',        tipo: 'doc' },
  ];

  descricaoPreenchida(campo: CampoDescricao): boolean {
    const item = this.arvoreItem;
    return campo === 'descricaoTecnica' ? item.temDescricaoTecnica : campo === 'descricaoCliente' ? item.temDescricaoCliente : item.temDocumentacao;
  }

  abrirDescricao(evento: Event, campo: CampoDescricao): void {
    evento.stopPropagation();
    this.demandaEditarDescricaoSolicitada.emit({ id: this.arvoreItem.id, campo });
  }

  get eGestor(): boolean {
    return this.sessao.eGestor();
  }
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

  get expandido(): boolean {
    return this.expandidos.has(this.arvoreItem.id);
  }

  get nomeEmPartes(): { texto: string; destaque: boolean }[] {
    return dividirDestaque(this.arvoreItem.nome, this.termoBusca);
  }

  get executores(): string[] {
    return this.executoresPorDemanda.get(this.arvoreItem.id) ?? [];
  }

  /** Fração 0..100 do executado sobre o estimado; a barra trava em 100 mesmo estourando. */
  get percentualExecutado(): number {
    const minutosEstimados = this.arvoreItem.horasEstimadas * 60;
    if (minutosEstimados <= 0) return 0;
    return Math.min(100, Math.round((this.arvoreItem.minutosExecutados / minutosEstimados) * 100));
  }

  get estourou(): boolean {
    return this.arvoreItem.horasEstimadas > 0 && this.arvoreItem.minutosExecutados >= this.arvoreItem.horasEstimadas * 60;
  }

  /** Clicar na linha abre o detalhe (como no grafo); só o chevron expande. */
  selecionar(): void {
    this.focoAlterado.emit(this.arvoreItem.id);
    this.demandaSelecionada.emit(this.arvoreItem.id);
  }

  alternarExpansao(evento: Event): void {
    evento.stopPropagation();
    this.focoAlterado.emit(this.arvoreItem.id);
    this.expansaoAlternada.emit(this.arvoreItem.id);
  }

  novaFilha(evento: Event): void {
    evento.stopPropagation();
    this.demandaNovaFilhaSolicitada.emit(this.arvoreItem.id);
  }

  abrirMenuPelaLinha(evento: Event, menu: ContextMenu): void {
    evento.stopPropagation();
    this.abrirMenuContexto(evento as MouseEvent, menu);
  }

  aoEscolherStatus(para: TipoDemandaStatusEnum): void {
    this.statusAlterado.emit({ demandaId: this.arvoreItem.id, de: this.arvoreItem.status, para });
  }
}
