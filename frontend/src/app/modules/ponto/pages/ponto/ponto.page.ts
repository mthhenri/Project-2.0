import {
  Component,
  inject,
  signal,
  OnInit,
  HostListener,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { finalize } from 'rxjs';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  PontoDiarioDto,
  PontoMensalDto,
  PontoMensalConsultarDto,
  UsuarioResumoDto,
  UsuarioStatusEnum,
} from '@project20/shared';
import { PontoService } from '../../services/ponto.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { PontoResumoCardComponent } from '../../components/ponto-resumo-card/ponto-resumo-card.component';
import { PontoUsuarioCardComponent } from '../../components/ponto-usuario-card/ponto-usuario-card.component';
import { PontoMesDiaComponent } from '../../components/ponto-mes-dia/ponto-mes-dia.component';
import { formatarSaldoMinutos } from '../../models/ponto.model';

type ModoPonto = 'todos' | 'mensal';

@Component({
  selector: 'app-ponto',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    DatePickerModule,
    Select,
    ProgressSpinnerModule,
    MinutosParaHorasPipe,
    PontoResumoCardComponent,
    PontoUsuarioCardComponent,
    PontoMesDiaComponent,
  ],
  templateUrl: './ponto.page.html',
  styleUrl: './ponto.page.scss',
})
export class PontoPage implements OnInit {
  private readonly pontoService = inject(PontoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly hoje = this.inicioDoDia(new Date());

  readonly formularioFiltros = this.formBuilder.group({
    usuarioId: [null as number | null],
    mesAno:    [this.hoje as Date],
  });

  /** Gestor sem usuário filtrado → "todos hoje"; caso contrário → "mensal". */
  readonly modo = signal<ModoPonto>(this.sessao.eGestor() ? 'todos' : 'mensal');

  readonly carregando = signal<boolean>(false);
  readonly pontosTodos = signal<PontoDiarioDto[]>([]);
  readonly pontoMensal = signal<PontoMensalDto | null>(null);
  readonly usuarios = signal<UsuarioResumoDto[]>([]);

  ngOnInit(): void {
    if (this.sessao.eGestor()) this.carregarUsuarios();
    this.carregar();
  }

  /** Recarrega o modo atual ao voltar para a aba (ex.: após encerrar uma execução). */
  @HostListener('document:visibilitychange')
  aoVoltarParaAba(): void {
    if (document.visibilityState === 'visible') this.carregar();
  }

  carregar(): void {
    if (this.modo() === 'todos') {
      this.carregarTodos();
    } else {
      this.carregarMensal();
    }
  }

  aoMudarUsuario(): void {
    if (!this.sessao.eGestor()) return;
    const usuarioId = this.formularioFiltros.value.usuarioId ?? null;
    this.modo.set(usuarioId ? 'mensal' : 'todos');
    this.carregar();
  }

  aoMudarMes(): void {
    this.carregar();
  }

  formatarSaldo(saldoMinutos: number): string {
    return formatarSaldoMinutos(saldoMinutos);
  }

  nomeMes(mes: number): string {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return meses[mes - 1] ?? '';
  }

  private carregarTodos(): void {
    this.carregando.set(true);
    this.pontoService
      .consultarTodos(this.formatarData(this.hoje))
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.pontosTodos.set(resposta.dados);
        },
      });
  }

  private carregarMensal(): void {
    const mesAno = this.formularioFiltros.value.mesAno ?? this.hoje;
    const filtros: PontoMensalConsultarDto = {
      ano: mesAno.getFullYear(),
      mes: mesAno.getMonth() + 1,
    };

    const usuarioId = this.formularioFiltros.value.usuarioId ?? null;
    if (this.sessao.eGestor() && usuarioId) filtros.usuarioId = usuarioId;

    this.carregando.set(true);
    this.pontoService
      .consultarMensal(filtros)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.pontoMensal.set(resposta.dados);
        },
      });
  }

  private carregarUsuarios(): void {
    this.usuarioService.listar({ status: UsuarioStatusEnum.ATIVO, itensPorPagina: 100 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.usuarios.set(resposta.dados.itens);
      },
    });
  }

  private inicioDoDia(data: Date): Date {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
