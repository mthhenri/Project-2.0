import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { AtividadeResumoDto, DemandaRecuperadaDto, TipoAtividadeStatusEnum } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { AtividadeService } from '../../../atividade/services/atividade.service';
import { ROTULO_STATUS_DEMANDA } from '../../../demanda/constants/demanda-cores.constants';
import { DemandaBarraHorasComponent } from '../../../demanda/components/demanda-barra-horas/demanda-barra-horas.component';
import { DemandaStatusMarcaComponent } from '../../../demanda/components/demanda-status-marca/demanda-status-marca.component';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { ItemDoChecklist, ordenarChecklist } from '../../utils/minhas-demandas.util';

/** As abas da demanda aberta no chat; a Cliente só aparece para gestor e administrador. */
export type AbaDemandaLeitura = 'checklist' | 'tecnica' | 'cliente' | 'documentacao';

/** Até quantas atividades o checklist pede à API. */
const LIMITE_DE_ATIVIDADES = 100;

/**
 * A demanda aberta ao lado da conversa (task 245), **só para leitura**: caminho, nome, status e barra de horas, e as abas Checklist (abre
 * primeiro: desenvolvidas riscadas, a que roda destacada e as que faltam), Técnica, Cliente (só gestor e administrador) e Documentação, com
 * Editar (leva à tela de Demandas) e "Planejar com a IA" (o modo planejamento do chat). Não reaproveita a `app-demanda-aberta` da task 239:
 * ela é uma tela de edição (título, status, membros, tags, atividades e conexões editáveis, diálogos) e adaptá-la a leitura exigiria
 * desligar quase tudo, então esta monta o mesmo desenho com os componentes pequenos que servem (barra de horas, bolinha de status,
 * visualizador de Markdown, abas).
 */
@Component({
  selector: 'app-chat-demanda-leitura',
  standalone: true,
  imports: [
    ButtonModule,
    SkeletonModule,
    TabsModule,
    TooltipModule,
    MarkdownVisualizadorComponent,
    TempoExibicaoPipe,
    DemandaBarraHorasComponent,
    DemandaStatusMarcaComponent,
  ],
  templateUrl: './demanda-leitura.component.html',
  styleUrl: './demanda-leitura.component.scss',
})
export class DemandaLeituraComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly atividadeService = inject(AtividadeService);
  private readonly roteador = inject(Router);
  readonly sessao = inject(UsuarioSessaoService);

  readonly demandaId = input.required<number>();
  /** Voltar para a lista de demandas. */
  readonly voltar = output<void>();
  /** "Planejar com a IA": a página do chat troca para o modo planejamento. */
  readonly planejar = output<void>();

  readonly TipoStatus = TipoAtividadeStatusEnum;
  readonly rotuloStatus = ROTULO_STATUS_DEMANDA;

  readonly demanda = signal<DemandaRecuperadaDto | null>(null);
  readonly atividades = signal<AtividadeResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly aba = signal<AbaDemandaLeitura>('checklist');

  /** O checklist na ordem de leitura (desenvolvidas, a que roda, as em aberto). */
  readonly checklist = computed<ItemDoChecklist[]>(() =>
    ordenarChecklist(
      this.atividades().map((atividade) => ({
        id: atividade.id,
        nome: atividade.nome,
        status: atividade.status,
        emExecucao: atividade.execucaoAtivaId !== null,
        minutosExecutados: atividade.totalMinutosExecutados,
        totalExecucoes: atividade.totalExecucoes,
      })),
    ),
  );
  readonly minutosExecutados = computed(() => this.atividades().reduce((soma, atividade) => soma + atividade.totalMinutosExecutados, 0));
  readonly desenvolvidas = computed(() => this.atividades().filter((atividade) => atividade.status === TipoAtividadeStatusEnum.DESENVOLVIDA).length);

  /** A aba que vale: a Cliente só para quem é gestor ou administrador; sem isso volta ao Checklist. */
  readonly abaAtiva = computed<AbaDemandaLeitura>(() => (this.aba() === 'cliente' && !this.sessao.eGestor() ? 'checklist' : this.aba()));

  constructor() {
    effect(() => {
      const id = this.demandaId();
      untracked(() => this.carregar(id));
    });
  }

  carregar(id: number = this.demandaId()): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.aba.set('checklist');
    this.demanda.set(null);
    this.atividades.set([]);
    this.demandaService.recuperar(id).subscribe({
      next: (resposta) => {
        if (id !== this.demandaId()) return;
        this.demanda.set(resposta.dados ?? null);
        this.carregando.set(false);
        this.carregarAtividades(id);
      },
      error: () => {
        if (id !== this.demandaId()) return;
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  private carregarAtividades(id: number): void {
    this.atividadeService.listar({ demandaId: id, itensPorPagina: LIMITE_DE_ATIVIDADES }).subscribe({
      next: (resposta) => {
        if (id === this.demandaId()) this.atividades.set(resposta.dados?.itens ?? []);
      },
    });
  }

  textoDaAba(): string {
    const demanda = this.demanda();
    if (!demanda) return '';
    const aba = this.abaAtiva();
    return (aba === 'tecnica' ? demanda.descricaoTecnica : aba === 'cliente' ? demanda.descricaoCliente : aba === 'documentacao' ? demanda.documentacao : '') ?? '';
  }

  /** "Editar" leva à tela de Demandas do projeto: o chat não edita a demanda. */
  editar(): void {
    const demanda = this.demanda();
    if (demanda) void this.roteador.navigate(['/demanda'], { queryParams: { projetoId: demanda.projetoId } });
  }
}
