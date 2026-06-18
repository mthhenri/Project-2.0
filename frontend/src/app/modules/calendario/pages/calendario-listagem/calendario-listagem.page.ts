import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  DiaNaoUtilResumoDto,
  DiaNaoUtilCriarDto,
  DiaNaoUtilAlterarDto,
  DiaNaoUtilTipoEnum,
} from '@project20/shared';
import { CalendarioService } from '../../services/calendario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import {
  DIA_NAO_UTIL_TIPO_OPCOES,
  VerificacaoDiaUtil,
  SeveridadeTag,
  severidadeTipoDiaNaoUtil,
  rotuloTipoDiaNaoUtil,
  formatarDataIso,
  partesDaData,
} from '../../models/dia-nao-util.model';

@Component({
  selector: 'app-calendario-listagem',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    DatePickerModule,
    SelectModule,
    CheckboxModule,
    MessageModule,
    TooltipModule,
    DataBrasileiraPipe,
  ],
  templateUrl: './calendario-listagem.page.html',
  styleUrl: './calendario-listagem.page.scss',
  providers: [ConfirmationService],
})
export class CalendarioListagemPage implements OnInit {
  private readonly calendarioService = inject(CalendarioService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);

  readonly tipoOpcoes = DIA_NAO_UTIL_TIPO_OPCOES;

  readonly diasNaoUteis = signal<DiaNaoUtilResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);

  /** Mês/ano atualmente exibido no calendário (mês de 1 a 12). */
  readonly mesExibido = signal<{ ano: number; mes: number }>({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });
  /** Id do dia destacado na tabela após clique no calendário. */
  readonly diaDestacadoId = signal<number | null>(null);

  readonly mostrarDialog = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);
  readonly diaEmEdicao = signal<DiaNaoUtilResumoDto | null>(null);

  readonly resultadoVerificacao = signal<VerificacaoDiaUtil | null>(null);
  readonly carregandoVerificacao = signal<boolean>(false);

  readonly eGestor = this.sessao.eGestor;
  readonly tituloDialog = computed(() =>
    this.diaEmEdicao() ? 'Editar Dia Não Útil' : 'Novo Dia Não Útil',
  );

  readonly formulario = this.formBuilder.group({
    diaData:    this.formBuilder.control<Date | null>(null, Validators.required),
    descricao:  this.formBuilder.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    tipo:       this.formBuilder.control<DiaNaoUtilTipoEnum>(DiaNaoUtilTipoEnum.FERIADO, { nonNullable: true, validators: [Validators.required] }),
    recorrente: this.formBuilder.control<boolean>(false, { nonNullable: true }),
  });

  readonly formularioVerificar = this.formBuilder.group({
    data: this.formBuilder.control<Date | null>(null, Validators.required),
  });

  /** Dias não recorrentes indexados por `ano-mes-dia` (mês de 1 a 12). */
  readonly mapaExatos = computed(() => {
    const mapa = new Map<string, DiaNaoUtilResumoDto>();
    for (const dia of this.diasNaoUteis()) {
      if (dia.recorrente) continue;
      const { ano, mes, dia: numeroDia } = partesDaData(dia.diaData);
      mapa.set(`${ano}-${mes}-${numeroDia}`, dia);
    }
    return mapa;
  });

  /** Dias recorrentes indexados por `mes-dia` (válidos em qualquer ano). */
  readonly mapaRecorrentes = computed(() => {
    const mapa = new Map<string, DiaNaoUtilResumoDto>();
    for (const dia of this.diasNaoUteis()) {
      if (!dia.recorrente) continue;
      const { mes, dia: numeroDia } = partesDaData(dia.diaData);
      mapa.set(`${mes}-${numeroDia}`, dia);
    }
    return mapa;
  });

  /**
   * Dias não úteis do mês exibido no calendário, ordenados por dia.
   * Inclui recorrentes cujo mês bate (qualquer ano) e não recorrentes do mês/ano exatos.
   */
  readonly diasDoMes = computed(() => {
    const { ano, mes } = this.mesExibido();
    return this.diasNaoUteis()
      .filter((dia) => {
        const partes = partesDaData(dia.diaData);
        return dia.recorrente
          ? partes.mes === mes
          : partes.mes === mes && partes.ano === ano;
      })
      .sort((diaA, diaB) => partesDaData(diaA.diaData).dia - partesDaData(diaB.diaData).dia);
  });

  /** Rótulo do mês exibido, com inicial maiúscula (ex: "Junho de 2026"). */
  readonly rotuloMes = computed(() => {
    const { ano, mes } = this.mesExibido();
    const texto = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  });

  ngOnInit(): void {
    this.buscarDias();
  }

  buscarDias(): void {
    this.carregando.set(true);
    this.calendarioService
      .listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.diasNaoUteis.set(resposta.dados);
          }
        },
      });
  }

  severidadeTipo(tipo: DiaNaoUtilTipoEnum): SeveridadeTag {
    return severidadeTipoDiaNaoUtil(tipo);
  }

  rotuloTipo(tipo: DiaNaoUtilTipoEnum): string {
    return rotuloTipoDiaNaoUtil(tipo);
  }

  /** Retorna o dia não útil que marca a célula do calendário, ou null. */
  diaMarcado(ano: number, mes: number, numeroDia: number): DiaNaoUtilResumoDto | null {
    return (
      this.mapaExatos().get(`${ano}-${mes}-${numeroDia}`) ??
      this.mapaRecorrentes().get(`${mes}-${numeroDia}`) ??
      null
    );
  }

  /** Atualiza o mês exibido conforme a navegação do calendário (mês vem de 1 a 12). */
  onMudancaMes(evento: { month?: number; year?: number }): void {
    if (evento.month == null || evento.year == null) return;
    this.mesExibido.set({ ano: evento.year, mes: evento.month });
    this.diaDestacadoId.set(null);
  }

  /** Ao clicar num dia: se marcado, destaca a linha correspondente na tabela. */
  onSelecionarDiaCalendario(data: Date): void {
    const correspondente = this.diaMarcado(
      data.getFullYear(),
      data.getMonth() + 1,
      data.getDate(),
    );
    if (correspondente) {
      this.diaDestacadoId.set(correspondente.id);
      this.rolarParaLinha(correspondente.id);
    } else {
      this.diaDestacadoId.set(null);
    }
  }

  abrirDialogNovo(): void {
    this.diaEmEdicao.set(null);
    this.formulario.reset({
      diaData:    null,
      descricao:  '',
      tipo:       DiaNaoUtilTipoEnum.FERIADO,
      recorrente: false,
    });
    this.formulario.get('diaData')!.enable();
    this.mostrarDialog.set(true);
  }

  abrirDialogEditar(dia: DiaNaoUtilResumoDto): void {
    this.diaEmEdicao.set(dia);
    const { ano, mes, dia: numeroDia } = partesDaData(dia.diaData);
    this.formulario.reset({
      diaData:    new Date(ano, mes - 1, numeroDia),
      descricao:  dia.descricao,
      tipo:       dia.tipo,
      recorrente: dia.recorrente,
    });
    // A data não é alterável: o backend não expõe diaData no DiaNaoUtilAlterarDto.
    this.formulario.get('diaData')!.disable();
    this.mostrarDialog.set(true);
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const diaEmEdicao = this.diaEmEdicao();
    if (diaEmEdicao) {
      this.salvarAlteracao(diaEmEdicao);
    } else {
      this.salvarNovo();
    }
  }

  confirmarExclusao(dia: DiaNaoUtilResumoDto): void {
    this.confirmationService.confirm({
      message: `Deseja excluir "${dia.descricao}"? Esta ação não pode ser desfeita.`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.excluirDia(dia),
    });
  }

  verificar(): void {
    if (this.formularioVerificar.invalid) {
      this.formularioVerificar.markAllAsTouched();
      return;
    }

    const dataIso = formatarDataIso(this.formularioVerificar.value.data!);
    this.carregandoVerificacao.set(true);
    this.resultadoVerificacao.set(null);
    this.calendarioService
      .verificarDiaUtil(dataIso)
      .pipe(finalize(() => this.carregandoVerificacao.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.resultadoVerificacao.set(resposta.dados);
          }
        },
      });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  private rolarParaLinha(id: number): void {
    setTimeout(() => {
      const elemento = document.querySelector(`[data-dia-id="${id}"]`);
      elemento?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  private salvarNovo(): void {
    const dto: DiaNaoUtilCriarDto = {
      diaData:    formatarDataIso(this.formulario.value.diaData!),
      descricao:  this.formulario.value.descricao!,
      tipo:       this.formulario.value.tipo!,
      recorrente: this.formulario.value.recorrente!,
    };

    this.carregandoSalvar.set(true);
    this.calendarioService
      .criar(dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: `"${dto.descricao}" cadastrado com sucesso`,
          });
          this.mostrarDialog.set(false);
          this.buscarDias();
        },
      });
  }

  private salvarAlteracao(dia: DiaNaoUtilResumoDto): void {
    const dto: DiaNaoUtilAlterarDto = {
      descricao:  this.formulario.value.descricao!,
      tipo:       this.formulario.value.tipo!,
      recorrente: this.formulario.value.recorrente!,
    };

    this.carregandoSalvar.set(true);
    this.calendarioService
      .alterar(dia.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Dia não útil alterado com sucesso',
          });
          this.mostrarDialog.set(false);
          this.buscarDias();
        },
      });
  }

  private excluirDia(dia: DiaNaoUtilResumoDto): void {
    this.calendarioService.excluir(dia.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `"${dia.descricao}" excluído com sucesso`,
        });
        if (this.diaDestacadoId() === dia.id) {
          this.diaDestacadoId.set(null);
        }
        this.buscarDias();
      },
    });
  }
}
