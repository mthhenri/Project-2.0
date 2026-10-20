import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { ProjetoVolumeAnualResumoDto, ProjetoVolumeResumoDto, hojeNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { formatarTempoExibicao } from '../../../../core/models/visualizacao-tempo.model';
import { GraficoBarrasComponent } from '../../../../shared/components/grafico-barras/grafico-barras.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { ProjetoService } from '../../services/projeto.service';
import { COR_VOLUME_ESPERADO, COR_VOLUME_ESTOURO, montarCategoriasAnuais, montarCategoriasMensais } from '../../utils/volume-grafico.util';

export type PeriodoVolume = 'MENSAL' | 'ANUAL';

/**
 * "Volume" (tasks 197 e 199, gestor): horas gastas contra o volume esperado por projeto, em gráfico de barras. **Mensal:** um grupo por projeto
 * (gastas × esperadas) no mês escolhido. **Anual:** um cartão por projeto com os doze meses do ano e o esperado por mês como linha tracejada.
 * Mês e ano navegam como no Ponto; o padrão é o atual no fuso do sistema, e não há futuro.
 */
@Component({
  selector: 'app-projeto-volume',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, DatePickerModule, SelectButtonModule, TooltipModule, GraficoBarrasComponent, SkeletonListaComponent, BarraRecargaComponent],
  templateUrl: './projeto-volume.component.html',
  styleUrl: './projeto-volume.component.scss',
})
export class ProjetoVolumeComponent implements OnInit {
  private readonly projetoService = inject(ProjetoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  /** O mês e o ano atuais no fuso do sistema: o teto da navegação e o "voltar ao atual". */
  readonly hoje = hojeNoFuso(ambiente.fusoHorario);

  readonly opcoesPeriodo = [
    { rotulo: 'Mensal', valor: 'MENSAL' as PeriodoVolume },
    { rotulo: 'Anual', valor: 'ANUAL' as PeriodoVolume },
  ];
  readonly periodoControl = new FormControl<PeriodoVolume>('MENSAL', { nonNullable: true });
  readonly periodo = signal<PeriodoVolume>('MENSAL');

  readonly mes = signal<Date>(this.hoje);
  readonly ano = signal<number>(this.hoje.getFullYear());
  /** Os seletores do datepicker; os botões de navegação os atualizam sem disparar nova carga (a carga é do `escolherMes`/`escolherAno`). */
  readonly mesControl = new FormControl<Date>(this.hoje, { nonNullable: true });
  readonly anoControl = new FormControl<Date>(this.hoje, { nonNullable: true });

  readonly itensMensais = signal<ProjetoVolumeResumoDto[]>([]);
  readonly itensAnuais = signal<ProjetoVolumeAnualResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  private readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());

  readonly categoriasMensais = computed(() => montarCategoriasMensais(this.itensMensais(), this.unidadeTempo.emDias()));
  readonly projetosAnuais = computed(() =>
    this.itensAnuais().map((item) => ({
      item,
      categorias: montarCategoriasAnuais(item, this.unidadeTempo.emDias()),
      rotuloEsperado: item.volumeEsperadoHorasMes === null ? 'sem volume definido' : `${formatarTempoExibicao(item.volumeEsperadoHorasMes, this.unidadeTempo.emDias(), 'horas')} por mês`,
    })),
  );

  readonly visualizandoMesAtual = computed(
    () => this.mes().getFullYear() === this.hoje.getFullYear() && this.mes().getMonth() === this.hoje.getMonth(),
  );
  readonly visualizandoAnoAtual = computed(() => this.ano() === this.hoje.getFullYear());

  readonly corEsperado = COR_VOLUME_ESPERADO;
  readonly corEstouro = COR_VOLUME_ESTOURO;

  constructor() {
    this.periodoControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((periodo) => {
      this.periodo.set(periodo);
      this.carregar();
    });
    this.mesControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((mes) => {
      if (mes) this.escolherMes(mes);
    });
    this.anoControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((data) => {
      if (data) this.escolherAno(data.getFullYear());
    });
  }

  ngOnInit(): void {
    this.carregar();
  }

  escolherMes(mes: Date): void {
    const primeiroDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    this.mes.set(primeiroDia);
    this.mesControl.setValue(primeiroDia, { emitEvent: false });
    this.carregar();
  }

  retornarMes(): void {
    const atual = this.mes();
    this.escolherMes(new Date(atual.getFullYear(), atual.getMonth() - 1, 1));
  }

  avancarMes(): void {
    if (this.visualizandoMesAtual()) return;
    const atual = this.mes();
    this.escolherMes(new Date(atual.getFullYear(), atual.getMonth() + 1, 1));
  }

  irParaMesAtual(): void {
    this.escolherMes(this.hoje);
  }

  escolherAno(ano: number): void {
    this.ano.set(ano);
    this.anoControl.setValue(new Date(ano, 0, 1), { emitEvent: false });
    this.carregar();
  }

  retornarAno(): void {
    this.escolherAno(this.ano() - 1);
  }

  avancarAno(): void {
    if (this.visualizandoAnoAtual()) return;
    this.escolherAno(this.ano() + 1);
  }

  irParaAnoAtual(): void {
    this.escolherAno(this.hoje.getFullYear());
  }

  private encerrarCarga(): void {
    this.carregando.set(false);
    this.jaCarregou.set(true);
  }

  private carregar(): void {
    this.carregando.set(true);
    const periodo = this.periodo();

    if (periodo === 'MENSAL') {
      const mes = this.mes();
      this.projetoService
        .listarVolume({ ano: mes.getFullYear(), mes: mes.getMonth() + 1 })
        .pipe(finalize(() => this.encerrarCarga()))
        .subscribe({
          next: (resposta) => {
            // Uma resposta atrasada de outro mês (ou de outra visão) não pode sobrescrever o que está na tela.
            if (resposta.sucesso && resposta.dados && this.periodo() === 'MENSAL' && this.mes() === mes) this.itensMensais.set(resposta.dados);
          },
        });
      return;
    }

    const ano = this.ano();
    this.projetoService
      .listarVolumeAnual({ ano })
      .pipe(finalize(() => this.encerrarCarga()))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados && this.periodo() === 'ANUAL' && this.ano() === ano) this.itensAnuais.set(resposta.dados);
        },
      });
  }
}
