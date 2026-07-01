import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PontoJustificativaResumoDto } from '@project20/shared';
import { PontoJustificativaService } from '../../services/ponto-justificativa.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';

@Component({
  selector: 'app-ponto-justificativa-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    ButtonModule,
    DialogModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  templateUrl: './ponto-justificativa-dialog.component.html',
  styleUrl: './ponto-justificativa-dialog.component.scss',
  providers: [ConfirmationService],
})
export class PontoJustificativaDialogComponent {
  private readonly pontoJustificativaService = inject(PontoJustificativaService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);

  /** Emitido após criar ou excluir uma justificativa (o pai recarrega o mensal). */
  @Output() aoAlterar = new EventEmitter<void>();

  readonly mostrarDialog = signal<boolean>(false);
  readonly usuarioId = signal<number | null>(null);
  readonly ano = signal<number>(new Date().getFullYear());
  readonly mes = signal<number>(new Date().getMonth() + 1);

  /** Limites do datepicker: a justificativa é sempre de um dia do mês visível. */
  readonly dataMinima = signal<Date | null>(null);
  readonly dataMaxima = signal<Date | null>(null);

  /** Teto de `horasCobertas` = jornada diária do usuário (também validado no servidor). */
  readonly maximoHoras = signal<number>(24);

  readonly justificativas = signal<PontoJustificativaResumoDto[]>([]);
  readonly carregandoLista = signal<boolean>(false);
  readonly salvando = signal<boolean>(false);

  readonly formulario = this.formBuilder.group({
    diaData:       [null as Date | null, [Validators.required]],
    nome:          ['', [Validators.required, Validators.maxLength(255)]],
    descricao:     ['', [Validators.required]],
    horasCobertas: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  /** Abre a dialog para um usuário no mês visível (`mesAno` — qualquer data do mês). */
  abrir(usuarioId: number, mesAno: Date): void {
    const ano = mesAno.getFullYear();
    const mes = mesAno.getMonth() + 1;
    const diasNoMes = new Date(ano, mes, 0).getDate();

    this.usuarioId.set(usuarioId);
    this.ano.set(ano);
    this.mes.set(mes);
    this.dataMinima.set(new Date(ano, mes - 1, 1));
    this.dataMaxima.set(new Date(ano, mes - 1, diasNoMes));

    this.formulario.reset({ diaData: null, nome: '', descricao: '', horasCobertas: null });
    this.justificativas.set([]);
    this.maximoHoras.set(24);

    this.mostrarDialog.set(true);
    this.carregarJornadaUsuario(usuarioId);
    this.carregarJustificativas();
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  salvar(): void {
    const usuarioId = this.usuarioId();
    if (usuarioId === null || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valor = this.formulario.getRawValue();
    this.salvando.set(true);
    this.pontoJustificativaService
      .criar({
        usuarioId,
        diaData:       this.formatarData(valor.diaData as Date),
        nome:          valor.nome as string,
        descricao:     valor.descricao as string,
        horasCobertas: valor.horasCobertas as number,
      })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (!resposta.sucesso) return;
          this.messageService.add({
            severity: 'success',
            summary:  'Justificativa criada',
            detail:   'A meta do dia foi ajustada.',
          });
          this.formulario.reset({ diaData: null, nome: '', descricao: '', horasCobertas: null });
          this.carregarJustificativas();
          this.aoAlterar.emit();
        },
      });
  }

  confirmarRemocao(justificativa: PontoJustificativaResumoDto): void {
    this.confirmationService.confirm({
      key:        'ponto-justificativa-remover',
      header:     'Remover justificativa',
      message:    `Remover a justificativa "${justificativa.nome}" de ${justificativa.diaData}?`,
      icon:       'pi pi-exclamation-triangle',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      accept: () => this.remover(justificativa.id),
    });
  }

  private remover(id: number): void {
    this.pontoJustificativaService.excluir(id).subscribe({
      next: (resposta) => {
        if (!resposta.sucesso) return;
        this.messageService.add({
          severity: 'success',
          summary:  'Justificativa removida',
          detail:   'A meta do dia foi restaurada.',
        });
        this.carregarJustificativas();
        this.aoAlterar.emit();
      },
    });
  }

  private carregarJornadaUsuario(usuarioId: number): void {
    this.usuarioService.recuperar(usuarioId).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.maximoHoras.set(resposta.dados.horasDiariasNecessarias);
        }
      },
    });
  }

  private carregarJustificativas(): void {
    const usuarioId = this.usuarioId();
    if (usuarioId === null) return;

    this.carregandoLista.set(true);
    this.pontoJustificativaService
      .listar(usuarioId, this.ano(), this.mes())
      .pipe(finalize(() => this.carregandoLista.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.justificativas.set(resposta.dados);
        },
      });
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
