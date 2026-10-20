import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ProjetoVolumeResumoDto, hojeNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { ProjetoService } from '../../services/projeto.service';
import { montarLinhaDeVolume } from '../../utils/volume-projeto.util';

/**
 * "Volume do mês" (task 197, gestor): por projeto, as horas gastas no mês (execuções encerradas) contra o volume esperado, com a
 * barra de progresso do Planejamento de demandas como análogo. O mês é navegável como no Ponto; o padrão é o atual no fuso do sistema.
 */
@Component({
  selector: 'app-projeto-volume',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, DatePickerModule, ProgressBarModule, TooltipModule, TempoExibicaoPipe, SkeletonListaComponent, BarraRecargaComponent],
  templateUrl: './projeto-volume.component.html',
  styleUrl: './projeto-volume.component.scss',
})
export class ProjetoVolumeComponent implements OnInit {
  private readonly projetoService = inject(ProjetoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  /** O mês atual no fuso do sistema: o teto da navegação e o "voltar ao mês atual". */
  readonly hoje = hojeNoFuso(ambiente.fusoHorario);
  readonly mes = signal<Date>(this.hoje);
  /** O seletor de mês do datepicker; os botões de navegação o atualizam sem disparar nova carga (a carga é do `aoEscolherMes`). */
  readonly mesControl = new FormControl<Date>(this.hoje, { nonNullable: true });
  readonly itens = signal<ProjetoVolumeResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  private readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());

  readonly linhas = computed(() => this.itens().map(montarLinhaDeVolume));
  readonly visualizandoMesAtual = computed(
    () => this.mes().getFullYear() === this.hoje.getFullYear() && this.mes().getMonth() === this.hoje.getMonth(),
  );

  constructor() {
    this.mesControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((mes) => {
      if (mes) this.aoEscolherMes(mes);
    });
  }

  ngOnInit(): void {
    this.carregar();
  }

  aoEscolherMes(mes: Date): void {
    const primeiroDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    this.mes.set(primeiroDia);
    this.mesControl.setValue(primeiroDia, { emitEvent: false });
    this.carregar();
  }

  retornarMes(): void {
    const atual = this.mes();
    this.aoEscolherMes(new Date(atual.getFullYear(), atual.getMonth() - 1, 1));
  }

  avancarMes(): void {
    if (this.visualizandoMesAtual()) return;
    const atual = this.mes();
    this.aoEscolherMes(new Date(atual.getFullYear(), atual.getMonth() + 1, 1));
  }

  irParaMesAtual(): void {
    this.aoEscolherMes(this.hoje);
  }

  private carregar(): void {
    this.carregando.set(true);
    const mes = this.mes();
    this.projetoService
      .listarVolume({ ano: mes.getFullYear(), mes: mes.getMonth() + 1 })
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: (resposta) => {
          // Uma resposta atrasada de outro mês não pode sobrescrever o mês que está na tela.
          if (resposta.sucesso && resposta.dados && this.mes() === mes) this.itens.set(resposta.dados);
        },
      });
  }
}
