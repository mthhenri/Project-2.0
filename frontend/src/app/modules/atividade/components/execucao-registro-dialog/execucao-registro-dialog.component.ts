import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import {
  ExecucaoRegistrarDto,
  MENSAGEM_CARACTERES_PROIBIDOS,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  instanteParaRelogioLocal,
  relogioLocalParaInstante,
} from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { ExecucaoService } from '../../../execucao/services/execucao.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DURACOES_REGISTRO, intervaloDaManha, intervaloRetroativo, minutosDoIntervalo } from '../../utils/intervalo-registro.util';

/** A atividade para a qual se registra a execução: só o que o dialog mostra e usa. */
export interface AtividadeParaRegistro {
  id: number;
  nome: string;
  nomeProjeto: string;
  nomeUsuario: string;
}

/**
 * Dialog "Registrar execução" (gestor): um intervalo passado e a descrição, com atalhos de duração. Usado pela listagem e pelo
 * detalhe da atividade; quem abre só passa a atividade e escuta `registrado` para se recarregar.
 */
@Component({
  selector: 'app-execucao-registro-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    TextareaModule,
    AssistenteDescricaoComponent,
    BloquearCaracteresProibidosDirective,
    DialogDicaAtalhosComponent,
    DialogFormularioDirective,
  ],
  templateUrl: './execucao-registro-dialog.component.html',
  styleUrl: './execucao-registro-dialog.component.scss',
})
export class ExecucaoRegistroDialogComponent {
  private readonly execucaoService = inject(ExecucaoService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  /** Textarea de descrição; recebe o foco ao abrir o dialog, não o campo de início. */
  private readonly descricaoRegistro = viewChild<ElementRef<HTMLTextAreaElement>>('descricaoRegistro');

  readonly mostrarDialog = signal<boolean>(false);
  readonly salvando = signal<boolean>(false);
  readonly atividade = signal<AtividadeParaRegistro | null>(null);
  readonly registrado = output<void>();

  readonly duracoes = DURACOES_REGISTRO;
  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  readonly formulario = this.formBuilder.group(
    {
      inicioData: [null as Date | null, [Validators.required]],
      fimData:    [null as Date | null, [Validators.required]],
      descricao:  ['', [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    },
    { validators: [this.fimPosteriorAoInicio] },
  );

  /** Validador cross-field: a data de fim deve ser posterior à data de início. */
  private fimPosteriorAoInicio(controle: AbstractControl): ValidationErrors | null {
    const inicio = controle.get('inicioData')?.value as Date | null;
    const fim = controle.get('fimData')?.value as Date | null;
    if (!inicio || !fim) return null;
    return fim > inicio ? null : { fimAntesDoInicio: true };
  }

  /** Agora como relógio do fuso do sistema nos campos locais: é o que o datepicker com hora mostra e edita. */
  private agoraNoFuso(): Date {
    return instanteParaRelogioLocal(new Date(), ambiente.fusoHorario);
  }

  abrir(atividade: AtividadeParaRegistro): void {
    this.atividade.set(atividade);
    // Padrão: o trabalho que acabou de terminar e durou 1h; os chips de duração reescrevem o intervalo.
    const padrao = intervaloRetroativo(this.agoraNoFuso(), 60);
    this.formulario.reset({ inicioData: padrao.inicioData, fimData: padrao.fimData, descricao: '' });
    this.mostrarDialog.set(true);
  }

  /** Aplica um atalho de duração ("2h", "Manhã") ao intervalo, sempre terminando em agora (exceto a manhã). */
  aplicarDuracao(minutos: number | 'manha'): void {
    const intervalo = minutos === 'manha' ? intervaloDaManha(this.agoraNoFuso()) : intervaloRetroativo(this.agoraNoFuso(), minutos);
    this.formulario.patchValue({ inicioData: intervalo.inicioData, fimData: intervalo.fimData });
  }

  /** Atalho já aplicado ao intervalo atual (para destacar o chip), ou null quando o intervalo foi editado à mão. */
  duracaoAtiva(): number | 'manha' | null {
    const { inicioData, fimData } = this.formulario.value;
    if (!inicioData || !fimData) return null;
    const manha = intervaloDaManha(inicioData);
    if (inicioData.getTime() === manha.inicioData.getTime() && fimData.getTime() === manha.fimData.getTime()) return 'manha';
    const minutos = minutosDoIntervalo({ inicioData, fimData });
    return this.duracoes.find((duracao) => duracao.minutos === minutos)?.minutos ?? null;
  }

  /** Foca a descrição ao abrir o dialog — em vez do primeiro campo (início). */
  focarDescricao(): void {
    this.descricaoRegistro()?.nativeElement.focus();
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const atividade = this.atividade();
    if (!atividade) return;

    const { inicioData, fimData, descricao } = this.formulario.value;
    const dto: ExecucaoRegistrarDto = {
      atividadeId: atividade.id,
      inicioData:  relogioLocalParaInstante(inicioData as Date, ambiente.fusoHorario).toISOString(),
      fimData:     relogioLocalParaInstante(fimData as Date, ambiente.fusoHorario).toISOString(),
      descricao:   (descricao ?? '').trim(),
    };

    this.salvando.set(true);
    this.execucaoService
      .registrar(dto)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso) {
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Execução registrada com sucesso' });
            this.mostrarDialog.set(false);
            this.registrado.emit();
          }
        },
      });
  }

  aceitarDescricaoAssistente(texto: string): void {
    this.formulario.patchValue({ descricao: texto });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  iniciais(nome: string): string {
    return (nome ?? '').split(' ').slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  }
}
