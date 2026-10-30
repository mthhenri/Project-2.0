import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { ContextMenu } from 'primeng/contextmenu';
import { MenuItem, MessageService } from 'primeng/api';
import { DemandaGrafoNoDto, DemandaPlanejamentoDto, TipoDemandaStatusEnum, demandaEstaParada } from '@project20/shared';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { DemandaService } from '../../services/demanda.service';
import { DemandaStatusComponent } from '../demanda-status/demanda-status.component';
import { DemandaBarraControleHorasComponent } from '../demanda-barra-controle-horas/demanda-barra-controle-horas.component';
import {
  construirMenuDemanda,
  CampoDescricaoDemanda,
  DemandaMenuAlvo,
} from '../../utils/demanda-context-menu.factory';
import {
  NoHoras,
  ExecutorDoResumo,
  ancestraisDe,
  executoresUnicos,
  haQuantoTempo,
  iniciaisDoNome,
  linhasVisiveisDeHoras,
  montarArvoreDeHoras,
  resumirHoras,
} from '../../utils/demanda-horas.util';

/** Quantas bolinhas de quem executa cabem no resumo antes do "+N". */
const EXECUTORES_VISIVEIS_NO_RESUMO = 4;

interface LinhaHoras {
  noHoras: NoHoras;
  recolhida: boolean;
  executores: ExecutorDoResumo[];
}

interface CartaoSemEstimativa {
  no: DemandaGrafoNoDto;
  pasta: string;
  controle: FormControl<number | null>;
}

interface CartaoParada {
  linha: DemandaPlanejamentoDto;
  situacao: string;
}

/**
 * O Controle de horas (task 240): as horas do projeto em árvore, com o total de cada pasta, a barra que passa dos 100%, quem executa agora e
 * dois cartões do que pede atenção (sem estimativa e paradas). A hierarquia e as horas vêm do grafo do projeto (`nos`); o que o grafo não
 * tem — quem executa, a última execução — vem do planejamento (`itens`, só as demandas pendentes e planejadas).
 */
@Component({
  selector: 'app-demanda-controle-horas-painel',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    TooltipModule,
    ContextMenu,
    DemandaStatusComponent,
    DemandaBarraControleHorasComponent,
    SkeletonListaComponent,
    TempoExibicaoPipe,
  ],
  templateUrl: './demanda-controle-horas-painel.component.html',
  styleUrl: './demanda-controle-horas-painel.component.scss',
})
export class DemandaControleHorasPainelComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  readonly sessao = inject(UsuarioSessaoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  /** Todas as demandas do projeto (o grafo): hierarquia, status e horas. */
  readonly nos = input<DemandaGrafoNoDto[]>([]);
  /** O planejamento: quem executa agora e a última execução das demandas pendentes e planejadas. */
  readonly itens = input<DemandaPlanejamentoDto[]>([]);
  readonly carregando = input<boolean>(false);
  /** A pasta escolhida na Árvore: o Controle de horas mostra o projeto todo, mas realça e rola até ela. */
  readonly pastaId = input<number | null>(null);

  // Ações do menu de contexto: abrem os diálogos hospedados no painel da árvore (via página).
  readonly demandaVisualizarSolicitada = output<number>();
  readonly demandaEditarSolicitada = output<number>();
  readonly demandaNovaFilhaSolicitada = output<number>();
  readonly demandaTagsSolicitadas = output<number>();
  readonly demandaMembrosSolicitados = output<number>();
  readonly demandaDescricaoSolicitada = output<{ id: number; campo: CampoDescricaoDemanda }>();
  /**
   * Troca de status otimista: emitida já ao escolher (a página aplica no grafo e no planejamento) e de novo com o status anterior se a API
   * recusar (rollback). Sem recarregar nada (task 98).
   */
  readonly statusAlterado = output<{ demandaId: number; status: TipoDemandaStatusEnum }>();
  /** Estimativa gravada pelo cartão "Sem estimativa": a página aplica no grafo e no planejamento. */
  readonly horasEstimadasAlteradas = output<{ demandaId: number; horasEstimadas: number }>();

  itensMenu: MenuItem[] = [];

  /** Pastas recolhidas: por padrão tudo está aberto. */
  readonly recolhidas = signal<ReadonlySet<number>>(new Set());
  readonly apenasAbertas = signal(false);
  private readonly controlesDeEstimativa = new Map<number, FormControl<number | null>>();
  readonly salvandoEstimativa = signal<ReadonlySet<number>>(new Set());

  readonly raizes = computed(() => montarArvoreDeHoras(this.nos()));
  readonly resumo = computed(() => resumirHoras(this.raizes()));
  readonly projetoVazio = computed(() => this.raizes().length === 0);

  private readonly itensPorDemanda = computed(() => new Map(this.itens().map((item) => [item.demandaId, item])));

  readonly idsAbertos = computed(() => {
    const ids = new Set<number>();
    if (!this.apenasAbertas()) return ids;
    for (const no of this.nos()) {
      if (!no.isEstrutural && (no.status === TipoDemandaStatusEnum.PENDENTE || no.status === TipoDemandaStatusEnum.PLANEJADA)) {
        ids.add(no.id);
        for (const id of ancestraisDe(this.raizes(), no.id)) ids.add(id);
      }
    }
    return ids;
  });

  readonly linhas = computed<LinhaHoras[]>(() =>
    linhasVisiveisDeHoras(this.raizes(), this.recolhidas())
      .filter((no) => !this.apenasAbertas() || this.idsAbertos().has(no.no.id)).map((noHoras) => ({
      noHoras,
      recolhida: this.recolhidas().has(noHoras.no.id),
      executores: executoresUnicos(this.itensPorDemanda().get(noHoras.no.id)?.executoresAtivos ?? []),
    })),
  );

  /** Quem executa agora no projeto todo, cada pessoa uma vez. */
  readonly executoresDoProjeto = computed(() => executoresUnicos(this.itens().flatMap((item) => item.executoresAtivos)));
  readonly executoresNoResumo = computed(() => this.executoresDoProjeto().slice(0, EXECUTORES_VISIVEIS_NO_RESUMO));
  readonly executoresExcedentes = computed(() => this.executoresDoProjeto().slice(EXECUTORES_VISIVEIS_NO_RESUMO));

  /** Demandas de trabalho (não pastas) pendentes ou planejadas, sem estimativa. */
  readonly semEstimativa = computed<CartaoSemEstimativa[]>(() => {
    const nomePorId = new Map(this.nos().map((no) => [no.id, no.nome]));
    return this.nos()
      .filter((no) => !no.isEstrutural && (no.status === TipoDemandaStatusEnum.PENDENTE || no.status === TipoDemandaStatusEnum.PLANEJADA) && !(no.horasEstimadas > 0))
      .map((no) => ({ no, pasta: no.demandaPaiId ? (nomePorId.get(no.demandaPaiId) ?? '') : '', controle: this.controleDeEstimativa(no.id) }));
  });

  /** As mais antigas primeiro. */
  readonly paradas = computed<CartaoParada[]>(() => {
    const agora = new Date();
    return this.itens()
      .filter((item) => !item.isEstrutural && demandaEstaParada(item, agora))
      .sort((a, b) => new Date(a.ultimaExecucaoData ?? a.criadaData).getTime() - new Date(b.ultimaExecucaoData ?? b.criadaData).getTime())
      .map((linha) => ({
        linha,
        situacao: linha.ultimaExecucaoData
          ? `última execução ${haQuantoTempo(linha.ultimaExecucaoData, agora)}`
          : `nunca executada, criada ${haQuantoTempo(linha.criadaData, agora)}`,
      }));
  });

  constructor() {
    // A pasta escolhida na Árvore: abre o caminho até ela e rola até a linha. Só reage à troca da pasta (ou ao primeiro carregamento), para
    // não reabrir pastas que o gestor acabou de recolher a cada edição.
    effect(() => {
      const chave = `${this.pastaId()}|${this.projetoVazio()}`;
      void chave;
      const pastaId = this.pastaId();
      if (pastaId === null || this.projetoVazio()) return;
      untracked(() => {
        const ancestrais = ancestraisDe(this.raizes(), pastaId);
        if (ancestrais.some((id) => this.recolhidas().has(id))) {
          this.recolhidas.update((atuais) => new Set([...atuais].filter((id) => !ancestrais.includes(id))));
        }
        setTimeout(() => document.getElementById(`horas-linha-${pastaId}`)?.scrollIntoView?.({ block: 'nearest' }));
      });
    });
  }

  alternarPasta(noHoras: NoHoras, evento?: Event): void {
    evento?.stopPropagation();
    this.recolhidas.update((atuais) => {
      const proximas = new Set(atuais);
      if (!proximas.delete(noHoras.no.id)) proximas.add(noHoras.no.id);
      return proximas;
    });
  }

  /** A pasta abre e fecha; a demanda abre na Árvore. */
  aoClicarLinha(linha: LinhaHoras): void {
    if (linha.noHoras.no.isEstrutural && linha.noHoras.filhos.length > 0) this.alternarPasta(linha.noHoras);
    else this.demandaVisualizarSolicitada.emit(linha.noHoras.no.id);
  }

  // ---------------------------------------------------------------------------
  // Menu de contexto (botão direito)
  // ---------------------------------------------------------------------------

  abrirMenu(evento: MouseEvent, no: DemandaGrafoNoDto, menu: ContextMenu): void {
    const alvo: DemandaMenuAlvo = {
      id: no.id,
      isEstrutural: no.isEstrutural,
      temDescricaoTecnica: no.temDescricaoTecnica,
      temDescricaoCliente: no.temDescricaoCliente,
      temDocumentacao: no.temDocumentacao,
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
  // Troca de status (a bolinha editável abre o popover; aqui só a persistência)
  // ---------------------------------------------------------------------------

  alterarStatus(no: DemandaGrafoNoDto, novoStatus: TipoDemandaStatusEnum): void {
    if (novoStatus === no.status) return;

    const statusAnterior = no.status;
    this.statusAlterado.emit({ demandaId: no.id, status: novoStatus });

    this.demandaService.alterar(no.id, { status: novoStatus }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso) {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' });
        }
      },
      error: () => this.statusAlterado.emit({ demandaId: no.id, status: statusAnterior }),
    });
  }

  // ---------------------------------------------------------------------------
  // Cartão "Sem estimativa"
  // ---------------------------------------------------------------------------

  private controleDeEstimativa(demandaId: number): FormControl<number | null> {
    let controle = this.controlesDeEstimativa.get(demandaId);
    if (!controle) {
      controle = new FormControl<number | null>(null);
      this.controlesDeEstimativa.set(demandaId, controle);
    }
    return controle;
  }

  /** Grava a estimativa pela alteração de demanda; a demanda sai do cartão e entra na árvore com a barra. */
  estimar(cartao: CartaoSemEstimativa): void {
    const horas = cartao.controle.value;
    const demandaId = cartao.no.id;
    if (!horas || horas <= 0 || this.salvandoEstimativa().has(demandaId)) return;

    this.salvandoEstimativa.update((atuais) => new Set(atuais).add(demandaId));
    this.demandaService.alterar(demandaId, { horasEstimadas: horas }).subscribe({
      next: (resposta) => {
        this.liberarEstimativa(demandaId);
        if (!resposta.sucesso) return;
        this.controlesDeEstimativa.delete(demandaId);
        this.horasEstimadasAlteradas.emit({ demandaId, horasEstimadas: horas });
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Estimativa registrada' });
      },
      error: () => this.liberarEstimativa(demandaId),
    });
  }

  private liberarEstimativa(demandaId: number): void {
    this.salvandoEstimativa.update((atuais) => {
      const proximas = new Set(atuais);
      proximas.delete(demandaId);
      return proximas;
    });
  }

  // ---------------------------------------------------------------------------
  // Apresentação
  // ---------------------------------------------------------------------------

  iniciais(nomeCompleto: string): string {
    return iniciaisDoNome(nomeCompleto);
  }

  haQuantoTempo(data: Date | string): string {
    return haQuantoTempo(data);
  }

  /** Tooltip da bolinha de quem executa: o nome e há quanto tempo. */
  dicaDoExecutor(executor: ExecutorDoResumo): string {
    return `${executor.nomeCompleto} · ${haQuantoTempo(executor.inicioData)}`;
  }

  dicaDosExecutores(executores: readonly ExecutorDoResumo[]): string {
    return executores.map((executor) => this.dicaDoExecutor(executor)).join('\n');
  }
}
