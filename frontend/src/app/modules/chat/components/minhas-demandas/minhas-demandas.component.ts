import { Component, OnInit, inject, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaExecutadaResumoDto } from '@project20/shared';
import { DemandaBarraHorasComponent } from '../../../demanda/components/demanda-barra-horas/demanda-barra-horas.component';
import { DemandaStatusMarcaComponent } from '../../../demanda/components/demanda-status-marca/demanda-status-marca.component';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { percentualDesenvolvidas, rotuloDesenvolvidas } from '../../utils/minhas-demandas.util';

/** Quantas demandas a lateral pede à API. */
const QUANTIDADE_DE_DEMANDAS = 20;

/**
 * "Minhas demandas" (task 245): a lateral à direita do chat, com as últimas demandas que o usuário executou — caminho, barra de horas e quantas
 * atividades estão desenvolvidas. Clicar numa abre a demanda ao lado da conversa (a página do chat decide). Análogo: o seletor do chat para o
 * desenho dos itens e a Árvore de demandas (task 239) para a barra de horas e a bolinha de status.
 */
@Component({
  selector: 'app-chat-minhas-demandas',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, TooltipModule, DemandaBarraHorasComponent, DemandaStatusMarcaComponent],
  templateUrl: './minhas-demandas.component.html',
  styleUrl: './minhas-demandas.component.scss',
})
export class MinhasDemandasComponent implements OnInit {
  private readonly demandaService = inject(DemandaService);

  readonly escolhida = output<number>();
  /** Depois da primeira carga: a demanda em que há execução rodando, para a página abri-la por padrão. */
  readonly emExecucaoEncontrada = output<number>();

  readonly itens = signal<DemandaExecutadaResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);

  private avisouExecucao = false;

  readonly rotuloDesenvolvidas = rotuloDesenvolvidas;
  readonly percentualDesenvolvidas = percentualDesenvolvidas;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.demandaService.listarExecutadas(QUANTIDADE_DE_DEMANDAS).subscribe({
      next: (resposta) => {
        const itens = resposta.dados ?? [];
        this.itens.set(itens);
        this.carregando.set(false);
        const rodando = itens.find((item) => item.executando);
        if (rodando && !this.avisouExecucao) {
          this.avisouExecucao = true;
          this.emExecucaoEncontrada.emit(rodando.demandaId);
        }
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }
}
