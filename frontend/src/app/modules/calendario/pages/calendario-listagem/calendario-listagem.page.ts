import { Component, computed, inject, signal, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { Popover, PopoverModule } from 'primeng/popover';
import { MessageService } from 'primeng/api';
import {
  DiaNaoUtilResumoDto,
  DiaNaoUtilCriarDto,
  DiaNaoUtilAlterarDto,
  TipoDiaNaoUtilEnum,
  TipoDiaNaoUtilDuracaoEnum,
} from '@project20/shared';
import { CalendarioService } from '../../services/calendario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import {
  DIA_NAO_UTIL_TIPO_OPCOES,
  DIA_NAO_UTIL_DURACAO_OPCOES,
  classeTagTipoDiaNaoUtil,
  rotuloTipoDiaNaoUtil,
  rotuloDuracaoDiaNaoUtil,
  MESES_CURTOS,
  dataComDiaDaSemana,
  formatarDataIso,
  partesDaData,
} from '../../models/dia-nao-util.model';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { DesfazerService } from '../../../../core/services/desfazer.service';

@Component({
  selector: 'app-calendario-listagem',
  standalone: true,
  imports: [
    SkeletonListaComponent,
    BarraRecargaComponent,
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    TagModule,
    DialogModule,
    DatePickerModule,
    SelectModule,
    CheckboxModule,
    MessageModule,
    TooltipModule,
    PopoverModule,
  ],
  templateUrl: './calendario-listagem.page.html',
  styleUrl: './calendario-listagem.page.scss',
})
export class CalendarioListagemPage implements OnInit {
  private readonly calendarioService = inject(CalendarioService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly formBuilder = inject(FormBuilder);

  @ViewChild(DialogFormularioDirective) private dialogFormulario?: DialogFormularioDirective;
  @ViewChild('popoverDia') private popover?: Popover;

  readonly tipoOpcoes = DIA_NAO_UTIL_TIPO_OPCOES;
  readonly duracaoOpcoes = DIA_NAO_UTIL_DURACAO_OPCOES;
  readonly TipoDiaNaoUtilEnum = TipoDiaNaoUtilEnum;
  readonly TipoDiaNaoUtilDuracaoEnum = TipoDiaNaoUtilDuracaoEnum;
  readonly mesesCurtos = MESES_CURTOS;

  /** Dia aberto no popover do calendário (nome, data, badges, Editar/Excluir). */
  readonly diaDoPopover = signal<DiaNaoUtilResumoDto | null>(null);
  /** Data para o `p-datepicker` do calendário navegar (Hoje, ano ‹ ›, mês); a cada uso vira um objeto novo. */
  readonly dataDeReferencia = signal<Date>(new Date());
  readonly anoDeHoje = new Date().getFullYear();

  readonly diasNaoUteis = signal<DiaNaoUtilResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  private readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());

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

  readonly eGestor = this.sessao.eGestor;
  readonly tituloDialog = computed(() =>
    this.diaEmEdicao() ? 'Editar Dia Não Útil' : 'Novo Dia Não Útil',
  );

  readonly formulario = this.formBuilder.group({
    diaData:    this.formBuilder.control<Date | null>(null, Validators.required),
    descricao:  this.formBuilder.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    tipo:       this.formBuilder.control<TipoDiaNaoUtilEnum>(TipoDiaNaoUtilEnum.FERIADO, { nonNullable: true, validators: [Validators.required] }),
    duracao:    this.formBuilder.control<TipoDiaNaoUtilDuracaoEnum>(TipoDiaNaoUtilDuracaoEnum.INTEGRAL, { nonNullable: true, validators: [Validators.required] }),
    recorrente: this.formBuilder.control<boolean>(false, { nonNullable: true }),
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

  /** Mês em que o datepicker do dialog abre quando ainda não há data (o mês que está na tela). */
  readonly mesDoDialog = computed(() => new Date(this.mesExibido().ano, this.mesExibido().mes - 1, 1));

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
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.diasNaoUteis.set(resposta.dados);
          }
        },
      });
  }

  /** Data da tabela, `qui, 24/12`; recorrentes usam o ano do mês exibido (valem para qualquer ano). */
  dataExibicao(dia: DiaNaoUtilResumoDto): string {
    return dataComDiaDaSemana(dia.diaData, dia.recorrente ? this.mesExibido().ano : undefined);
  }

  classeTagTipo(tipo: TipoDiaNaoUtilEnum): string {
    return classeTagTipoDiaNaoUtil(tipo);
  }

  rotuloTipo(tipo: TipoDiaNaoUtilEnum): string {
    return rotuloTipoDiaNaoUtil(tipo);
  }

  rotuloDuracao(duracao: TipoDiaNaoUtilDuracaoEnum): string {
    return rotuloDuracaoDiaNaoUtil(duracao);
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

  /** "Hoje": volta ao mês corrente. */
  irParaHoje(): void {
    const hoje = new Date();
    this.irParaMes(hoje.getFullYear(), hoje.getMonth() + 1);
  }

  /** Stepper de ano `‹ 2026 ›`: mantém o mês exibido. */
  mudarAno(delta: number): void {
    const { ano, mes } = this.mesExibido();
    this.irParaMes(ano + delta, mes);
  }

  irParaMes(ano: number, mes: number): void {
    this.mesExibido.set({ ano, mes });
    this.dataDeReferencia.set(new Date(ano, mes - 1, 1));
    this.diaDestacadoId.set(null);
  }

  /**
   * Clique num dia do calendário (task 115): marcado → popover com o resumo (e Editar/Excluir para o
   * gestor) e linha destacada na tabela; vazio → gestor abre a criação com a data preenchida.
   */
  aoClicarDia(evento: Event, date: { day: number; month: number; year: number }): void {
    const marcado = this.diaMarcado(date.year, date.month + 1, date.day);
    if (marcado) {
      this.diaDestacadoId.set(marcado.id);
      this.rolarParaLinha(marcado.id);
      this.diaDoPopover.set(marcado);
      this.popover?.show(evento, evento.currentTarget as HTMLElement);
    } else {
      this.diaDestacadoId.set(null);
      this.popover?.hide();
      if (this.eGestor()) this.abrirDialogNovo(new Date(date.year, date.month, date.day));
    }
  }

  editarDoPopover(dia: DiaNaoUtilResumoDto): void {
    this.popover?.hide();
    this.abrirDialogEditar(dia);
  }

  excluirDoPopover(dia: DiaNaoUtilResumoDto): void {
    this.popover?.hide();
    this.excluir(dia);
  }

  /**
   * A data não muda na edição (o backend não a aceita): exclui o registro e reabre a criação com o resto
   * preenchido, só faltando a nova data. O toast de exclusão continua oferecendo "Desfazer".
   */
  excluirERecriar(dia: DiaNaoUtilResumoDto): void {
    this.mostrarDialog.set(false);
    this.excluir(dia);
    this.abrirDialogNovo(null, {
      descricao: dia.descricao,
      tipo: dia.tipo,
      duracao: dia.duracao,
      recorrente: dia.recorrente,
    });
  }

  abrirDialogNovo(
    dataInicial: Date | null = null,
    base: Partial<{ descricao: string; tipo: TipoDiaNaoUtilEnum; duracao: TipoDiaNaoUtilDuracaoEnum; recorrente: boolean }> = {},
  ): void {
    this.diaEmEdicao.set(null);
    this.formulario.reset({
      diaData:    dataInicial,
      descricao:  base.descricao ?? '',
      tipo:       base.tipo ?? TipoDiaNaoUtilEnum.FERIADO,
      duracao:    base.duracao ?? TipoDiaNaoUtilDuracaoEnum.INTEGRAL,
      recorrente: base.recorrente ?? false,
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
      duracao:    dia.duracao,
      recorrente: dia.recorrente,
    });
    // A data não é alterável: o backend não expõe diaData no DiaNaoUtilAlterarDto.
    this.formulario.get('diaData')!.disable();
    this.mostrarDialog.set(true);
  }

  /** `criarOutro`: mantém o dialog aberto (tipo, duração e recorrência preservados) para cadastrar vários dias em série. */
  salvar(criarOutro = false): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const diaEmEdicao = this.diaEmEdicao();
    if (diaEmEdicao) {
      this.salvarAlteracao(diaEmEdicao);
    } else {
      this.salvarNovo(criarOutro);
    }
  }

  /** Exclusão imediata (task 99): a linha sai na hora e o toast oferece "Desfazer". */
  excluir(dia: DiaNaoUtilResumoDto): void {
    const listaAnterior = this.diasNaoUteis();
    this.diasNaoUteis.set(listaAnterior.filter((item) => item.id !== dia.id));
    if (this.diaDestacadoId() === dia.id) this.diaDestacadoId.set(null);

    this.calendarioService.excluir(dia.id).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `"${dia.descricao}" excluído`,
          desfazer: () => this.calendarioService.restaurar(dia.id),
          aposDesfazer: () => this.buscarDias(),
        }),
      error: () => this.diasNaoUteis.set(listaAnterior),
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

  private salvarNovo(criarOutro: boolean): void {
    const dto: DiaNaoUtilCriarDto = {
      diaData:    formatarDataIso(this.formulario.value.diaData!),
      descricao:  this.formulario.value.descricao!,
      tipo:       this.formulario.value.tipo!,
      duracao:    this.formulario.value.duracao!,
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
          if (criarOutro) {
            this.formulario.patchValue({ diaData: null, descricao: '' });
            this.formulario.markAsUntouched();
            this.dialogFormulario?.focar();
          } else {
            this.mostrarDialog.set(false);
          }
          this.buscarDias();
        },
      });
  }

  private salvarAlteracao(dia: DiaNaoUtilResumoDto): void {
    const dto: DiaNaoUtilAlterarDto = {
      descricao:  this.formulario.value.descricao!,
      tipo:       this.formulario.value.tipo!,
      duracao:    this.formulario.value.duracao!,
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
}
