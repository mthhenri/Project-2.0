import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ContextMenu } from 'primeng/contextmenu';
import { Popover, PopoverModule } from 'primeng/popover';
import { MenuItem, MessageService } from 'primeng/api';
import { DemandaPlanejamentoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { TempoDemandaPipe } from '../../../../shared/pipes/tempo-demanda.pipe';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { DemandaService } from '../../services/demanda.service';
import {
  construirMenuDemanda,
  CampoDescricaoDemanda,
  DemandaMenuAlvo,
} from '../../utils/demanda-context-menu.factory';

/** Linha da tabela de Planejamento com os derivados de apresentação (percentual/estouro/cor). */
interface LinhaPlanejamento extends DemandaPlanejamentoDto {
  /** Fração 0..1 do executado sobre o estimado; null quando não há estimativa. */
  percentual: number | null;
  /** Percentual exibido, limitado a 100 para a barra. */
  percentualBarra: number;
  /** Percentual real (pode passar de 100) para o rótulo. */
  percentualRotulo: number | null;
  estourou: boolean;
  /** Minutos que faltam para bater o estimado; null quando não há estimativa ou já estourou. */
  minutosRestantes: number | null;
  /** Cor da barra em função do quanto já foi executado (azul → amarelo → laranja → vermelho). */
  corBarra: string;
}

/** Opção do seletor rápido de status (popover). */
interface StatusOpcao {
  value: TipoDemandaStatusEnum;
  label: string;
}

@Component({
  selector: 'app-demanda-planejamento-painel',
  standalone: true,
  imports: [TableModule, Tag, ProgressBarModule, TooltipModule, ContextMenu, PopoverModule, TempoDemandaPipe],
  templateUrl: './demanda-planejamento-painel.component.html',
  styleUrl: './demanda-planejamento-painel.component.scss',
})
export class DemandaPlanejamentoPainelComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  readonly sessao = inject(UsuarioSessaoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  readonly itens = input<DemandaPlanejamentoDto[]>([]);
  readonly carregando = input<boolean>(false);

  // Ações do menu de contexto: abrem os diálogos hospedados no painel da árvore (via página).
  readonly demandaVisualizarSolicitada = output<number>();
  readonly demandaEditarSolicitada = output<number>();
  readonly demandaNovaFilhaSolicitada = output<number>();
  readonly demandaTagsSolicitadas = output<number>();
  readonly demandaMembrosSolicitados = output<number>();
  readonly demandaDescricaoSolicitada = output<{ id: number; campo: CampoDescricaoDemanda }>();
  /** Emitido após a troca de status; a página recarrega planejamento e grafo. */
  readonly alterado = output<void>();

  /** Cores-âncora (RGB) das faixas de execução; interpoladas para dar o "vai ficando". */
  private readonly ancoraAzul: [number, number, number] = [59, 130, 246];
  private readonly ancoraAmarelo: [number, number, number] = [234, 179, 8];
  private readonly ancoraLaranja: [number, number, number] = [249, 115, 22];
  private readonly ancoraVermelho: [number, number, number] = [239, 68, 68];
  private readonly ancoraVermelhoForte: [number, number, number] = [185, 28, 28];

  readonly statusOpcoes: StatusOpcao[] = [
    { value: TipoDemandaStatusEnum.PENDENTE,  label: 'Pendente' },
    { value: TipoDemandaStatusEnum.PLANEJADA, label: 'Planejada' },
    { value: TipoDemandaStatusEnum.CONCLUIDA, label: 'Concluída' },
    { value: TipoDemandaStatusEnum.CANCELADA, label: 'Cancelada' },
  ];

  itensMenu: MenuItem[] = [];
  readonly linhaStatusEdicao = signal<LinhaPlanejamento | null>(null);

  readonly linhas = computed<LinhaPlanejamento[]>(() =>
    this.itens().map((item) => {
      const minutosEstimados = item.horasEstimadas * 60;
      const temEstimativa = item.horasEstimadas > 0;
      const percentual = temEstimativa ? item.minutosExecutados / minutosEstimados : null;
      const estourou = temEstimativa && item.minutosExecutados >= minutosEstimados;
      return {
        ...item,
        percentual,
        percentualBarra: percentual === null ? 0 : Math.min(100, Math.round(percentual * 100)),
        percentualRotulo: percentual === null ? null : Math.round(percentual * 100),
        estourou,
        minutosRestantes: temEstimativa && !estourou ? minutosEstimados - item.minutosExecutados : null,
        corBarra: this.corParaPercentual(percentual),
      };
    }),
  );

  // ---------------------------------------------------------------------------
  // Menu de contexto (botão direito)
  // ---------------------------------------------------------------------------

  abrirMenu(evento: MouseEvent, linha: LinhaPlanejamento, menu: ContextMenu): void {
    const alvo: DemandaMenuAlvo = {
      id: linha.demandaId,
      isEstrutural: linha.isEstrutural,
      temDescricaoTecnica: linha.temDescricaoTecnica,
      temDescricaoCliente: linha.temDescricaoCliente,
      temDocumentacao: linha.temDocumentacao,
    };
    this.itensMenu = construirMenuDemanda(
      alvo,
      {
        aoVisualizar: (id) => this.demandaVisualizarSolicitada.emit(id),
        aoEditar:     (id) => this.demandaEditarSolicitada.emit(id),
        aoNovaFilha:  (id) => this.demandaNovaFilhaSolicitada.emit(id),
        aoTags:       (id) => this.demandaTagsSolicitadas.emit(id),
        aoMembros:    (id) => this.demandaMembrosSolicitados.emit(id),
        aoDescricao:  (id, campo) => this.demandaDescricaoSolicitada.emit({ id, campo }),
      },
      this.sessao.eGestor(),
    );
    menu.show(evento);
  }

  // ---------------------------------------------------------------------------
  // Troca de status (popover no chip)
  // ---------------------------------------------------------------------------

  abrirSeletorStatus(evento: Event, linha: LinhaPlanejamento, popover: Popover): void {
    this.linhaStatusEdicao.set(linha);
    popover.toggle(evento);
  }

  alterarStatus(novoStatus: TipoDemandaStatusEnum, popover: Popover): void {
    const linha = this.linhaStatusEdicao();
    popover.hide();
    if (!linha || novoStatus === linha.status) return;

    this.demandaService.alterar(linha.demandaId, { status: novoStatus }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso) {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' });
          this.alterado.emit();
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Apresentação
  // ---------------------------------------------------------------------------

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
      [TipoDemandaStatusEnum.CONCLUIDA]: 'Concluída',
      [TipoDemandaStatusEnum.CANCELADA]: 'Cancelada',
    };
    return mapa[status];
  }

  /** Nomes dos executores ativos concatenados, para o tooltip. */
  nomesExecutores(linha: LinhaPlanejamento): string {
    return linha.executoresAtivos.map((executor) => executor.nomeCompleto).join(', ');
  }

  /**
   * Cor da barra pelo percentual executado/estimado: azul até 75%, transiciona para
   * amarelo (75–85%), laranja (85–95%) e vermelho (95–100%); acima de 100% escurece um
   * pouco mais em direção a um vermelho forte, saturando a partir de 150%.
   */
  private corParaPercentual(percentual: number | null): string {
    if (percentual === null) return this.rgb(this.ancoraAzul);
    const p = percentual * 100;
    if (p <= 75)  return this.rgb(this.ancoraAzul);
    if (p <= 85)  return this.rgb(this.interpolar(this.ancoraAzul,    this.ancoraAmarelo, (p - 75) / 10));
    if (p <= 95)  return this.rgb(this.interpolar(this.ancoraAmarelo, this.ancoraLaranja, (p - 85) / 10));
    if (p <= 100) return this.rgb(this.interpolar(this.ancoraLaranja, this.ancoraVermelho, (p - 95) / 5));
    return this.rgb(this.interpolar(this.ancoraVermelho, this.ancoraVermelhoForte, (p - 100) / 50));
  }

  private interpolar(
    de: [number, number, number],
    ate: [number, number, number],
    t: number,
  ): [number, number, number] {
    const fator = Math.max(0, Math.min(1, t));
    return [
      Math.round(de[0] + (ate[0] - de[0]) * fator),
      Math.round(de[1] + (ate[1] - de[1]) * fator),
      Math.round(de[2] + (ate[2] - de[2]) * fator),
    ];
  }

  private rgb(canal: [number, number, number]): string {
    return `rgb(${canal[0]}, ${canal[1]}, ${canal[2]})`;
  }
}
