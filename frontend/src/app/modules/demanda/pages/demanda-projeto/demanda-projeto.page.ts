import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  DemandaGrafoDto,
  DemandaGrafoNoDto,
  DemandaArvoreItemDto,
  DemandaPlanejamentoDto,
  TipoDemandaStatusEnum,
  ProjetoResumoDto,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { ProjetoService } from '../../../projeto/services/projeto.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DemandaGrafoComponent } from '../../components/demanda-grafo/demanda-grafo.component';
import { DemandaFormularioDialogComponent } from '../../components/demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaArvorePainelComponent } from '../../components/demanda-arvore-painel/demanda-arvore-painel.component';
import { DemandaPlanejamentoPainelComponent } from '../../components/demanda-planejamento-painel/demanda-planejamento-painel.component';
import { ModoVisualizacao } from '../../models/demanda.model';
import { COR_NO_BORDA } from '../../constants/demanda-cores.constants';

@Component({
  selector: 'app-demanda-projeto',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    Select,
    TooltipModule,
    DemandaGrafoComponent,
    DemandaFormularioDialogComponent,
    DemandaArvorePainelComponent,
    DemandaPlanejamentoPainelComponent,
  ],
  templateUrl: './demanda-projeto.page.html',
  styleUrl: './demanda-projeto.page.scss',
})
export class DemandaProjetoPage implements OnInit {
  private readonly demandaService = inject(DemandaService);
  private readonly projetoService = inject(ProjetoService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly sessao = inject(UsuarioSessaoService);

  readonly projetos = signal<ProjetoResumoDto[]>([]);
  readonly projetoId = signal<number>(0);
  readonly projetoControle = new FormControl<number | null>(null);
  readonly grafo = signal<DemandaGrafoDto | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly carregandoProjetos = signal<boolean>(false);
  readonly modoVisualizacao = signal<ModoVisualizacao>('lista');
  readonly painelLateralAberto = signal<boolean>(true);
  readonly mostrarDialogNovaDemanda = signal<boolean>(false);
  readonly planejamento = signal<DemandaPlanejamentoDto[]>([]);
  readonly carregandoPlanejamento = signal<boolean>(false);

  readonly legendaStatus = [
    { rotulo: 'Pendente',  cor: COR_NO_BORDA[TipoDemandaStatusEnum.PENDENTE] },
    { rotulo: 'Planejada', cor: COR_NO_BORDA[TipoDemandaStatusEnum.PLANEJADA] },
    { rotulo: 'Concluída', cor: COR_NO_BORDA[TipoDemandaStatusEnum.CONCLUIDA] },
    { rotulo: 'Cancelada', cor: COR_NO_BORDA[TipoDemandaStatusEnum.CANCELADA] },
  ];

  readonly arvoreRaizes = computed<DemandaArvoreItemDto[]>(() => {
    const grafoAtual = this.grafo();
    if (!grafoAtual?.nos?.length) return [];
    return this.construirArvore(grafoAtual.nos);
  });

  ngOnInit(): void {
    this.carregarProjetos();
    this.projetoControle.valueChanges.subscribe((valor) => {
      if (valor) this.selecionarProjeto(valor);
    });
  }

  selecionarProjeto(projetoId: number): void {
    this.projetoId.set(projetoId);
    this.router.navigate([], { queryParams: { projetoId }, replaceUrl: true });
    this.carregarGrafo();
    if (this.modoVisualizacao() === 'planejamento' && this.sessao.eGestor()) {
      this.carregarPlanejamento();
    }
  }

  alternarModo(modo: ModoVisualizacao): void {
    this.modoVisualizacao.set(modo);
    if (modo === 'planejamento' && this.sessao.eGestor() && this.projetoId()) {
      this.carregarPlanejamento();
    }
  }

  private carregarPlanejamento(): void {
    this.carregandoPlanejamento.set(true);
    this.demandaService
      .listarPlanejamento(this.projetoId())
      .pipe(finalize(() => this.carregandoPlanejamento.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.planejamento.set(resposta.dados);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o planejamento' });
        },
      });
  }

  alternarPainel(): void {
    this.painelLateralAberto.update((aberto) => !aberto);
  }

  /**
   * Alteração vinda do painel de Planejamento ou de um diálogo por ele acionado
   * (status, edição, tags, etc.): atualiza o grafo e, se estiver no modo, o planejamento.
   */
  aoAlteradoPlanejamento(): void {
    this.recarregarGrafo();
    if (this.modoVisualizacao() === 'planejamento' && this.sessao.eGestor()) {
      this.carregarPlanejamento();
    }
  }

  /** Recarrega o grafo após qualquer alteração feita pelo painel da árvore. */
  recarregarGrafo(): void {
    this.demandaService.recuperarGrafo(this.projetoId()).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.grafo.set(resposta.dados);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível atualizar o grafo' });
      },
    });
  }

  projetoAtual(): ProjetoResumoDto | undefined {
    return this.projetos().find((projeto) => projeto.id === this.projetoId());
  }

  navegarParaProjeto(): void {
    if (this.projetoId()) {
      this.router.navigate(['/projeto', this.projetoId()]);
    } else {
      this.router.navigate(['/projeto']);
    }
  }

  private carregarProjetos(): void {
    this.carregandoProjetos.set(true);
    this.projetoService
      .listar({ itensPorPagina: 100 })
      .pipe(finalize(() => this.carregandoProjetos.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.projetos.set(resposta.dados.itens);
            const projetoIdParam = Number(this.route.snapshot.queryParamMap.get('projetoId'));
            if (projetoIdParam) {
              this.projetoControle.setValue(projetoIdParam, { emitEvent: false });
              this.projetoId.set(projetoIdParam);
              this.carregarGrafo();
            }
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os projetos' });
        },
      });
  }

  private carregarGrafo(): void {
    this.carregando.set(true);
    this.grafo.set(null);
    this.demandaService
      .recuperarGrafo(this.projetoId())
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.grafo.set(resposta.dados);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar as demandas' });
        },
      });
  }

  private construirArvore(nos: DemandaGrafoNoDto[]): DemandaArvoreItemDto[] {
    const mapa = new Map<number, DemandaArvoreItemDto>();

    for (const no of nos) {
      mapa.set(no.id, {
        id:                  no.id,
        nome:                no.nome,
        status:              no.status,
        isEstrutural:        no.isEstrutural,
        horasEstimadas:      no.horasEstimadas,
        minutosExecutados:   no.minutosExecutados,
        temDescricaoTecnica: no.temDescricaoTecnica,
        temDescricaoCliente: no.temDescricaoCliente,
        temDocumentacao:     no.temDocumentacao,
        tags:                no.tags ?? [],
        nivel:               0,
        filhos:              [],
      });
    }

    const raizes: DemandaArvoreItemDto[] = [];
    for (const no of nos) {
      const item = mapa.get(no.id)!;
      if (no.demandaPaiId && mapa.has(no.demandaPaiId)) {
        mapa.get(no.demandaPaiId)!.filhos.push(item);
      } else {
        raizes.push(item);
      }
    }

    return raizes;
  }
}
