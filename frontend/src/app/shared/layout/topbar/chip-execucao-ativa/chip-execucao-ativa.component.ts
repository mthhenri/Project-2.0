import { Component, effect, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { PopoverModule, Popover } from 'primeng/popover';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EstadoIaEnum, ExecucaoAtivaDto, ExecucaoEncerrarDto, REGEX_SEM_CARACTERES_PROIBIDOS } from '@project20/shared';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { ExecucaoService } from '../../../../modules/execucao/services/execucao.service';
import { MinutosParaHorasPipe } from '../../../pipes/minutos-para-horas.pipe';
import { BloquearCaracteresProibidosDirective } from '../../../directives/bloquear-caracteres-proibidos.directive';

/**
 * Chip global da execução ativa (task 95): ponto pulsante, descrição, cronômetro ao vivo e pausa
 * inline. Vive na topbar, então aparece em todas as telas autenticadas.
 */
@Component({
  selector: 'app-chip-execucao-ativa',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    ButtonModule,
    PopoverModule,
    TextareaModule,
    TooltipModule,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './chip-execucao-ativa.component.html',
  styleUrl: './chip-execucao-ativa.component.scss',
})
export class ChipExecucaoAtivaComponent {
  readonly execucaoAtiva = inject(ExecucaoAtivaService);
  private readonly execucaoService = inject(ExecucaoService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly messageService = inject(MessageService);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);

  private readonly agora = signal<number>(Date.now());
  readonly pausando = signal<boolean>(false);

  /**
   * Para onde vai o "Sem execução ativa": com a IA no ar a tela de Atividades fica desabilitada (o chat a substitui), então o chip leva às
   * Execuções, que seguem abertas para todos; sem a IA, às Atividades, onde se inicia uma execução.
   */
  readonly destinoSemExecucao = computed(() => (this.iaDisponibilidade.estado() === EstadoIaEnum.NO_AR ? '/execucao' : '/atividade'));

  /** Obrigatória para desenvolvedor, opcional para gestor (regra do `ExecucaoEncerrarDto`). */
  readonly descricaoObrigatoria = computed(() => !this.sessao.eGestor());
  readonly descricao = new FormControl<string>('', { nonNullable: true });

  readonly cronometro = computed(() => {
    const execucao = this.execucaoAtiva.ativa();
    if (!execucao) return '';
    const segundos = Math.max(0, Math.floor((this.agora() - new Date(execucao.inicioData).getTime()) / 1000));
    const hh = String(Math.floor(segundos / 3600)).padStart(2, '0');
    const mm = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0');
    const ss = String(segundos % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  });

  constructor() {
    // O relógio só corre enquanto há execução ativa.
    effect((limpar) => {
      if (!this.execucaoAtiva.ativa()) return;
      const intervalo = setInterval(() => this.agora.set(Date.now()), 1000);
      this.agora.set(Date.now());
      limpar(() => clearInterval(intervalo));
    });
  }

  abrirPausa(evento: Event, popover: Popover): void {
    const execucao = this.execucaoAtiva.ativa();
    if (!execucao) return;
    this.descricao.reset(execucao.descricao);
    this.descricao.setValidators(
      this.descricaoObrigatoria()
        ? [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]
        : [Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)],
    );
    this.descricao.updateValueAndValidity();
    popover.toggle(evento);
  }

  focarDescricao(): void {
    // O próprio popover foca o primeiro botão ao abrir; o foco da descrição vem depois dele.
    setTimeout(() => {
      const campo = document.querySelector<HTMLTextAreaElement>('.chip-execucao__descricao');
      campo?.focus();
      campo?.setSelectionRange(campo.value.length, campo.value.length);
    }, 50);
  }

  /** Enter confirma; Shift+Enter quebra linha. */
  aoTeclar(evento: Event, popover: Popover): void {
    const tecla = evento as KeyboardEvent;
    if (tecla.shiftKey) return;
    tecla.preventDefault();
    this.pausar(popover);
  }

  pausar(popover: Popover): void {
    const execucao = this.execucaoAtiva.ativa();
    if (!execucao || this.pausando()) return;
    if (this.descricao.invalid) {
      this.descricao.markAsTouched();
      return;
    }

    const dto: ExecucaoEncerrarDto = { descricao: this.descricao.value.trim() || undefined };
    popover.hide();
    this.pausando.set(true);
    this.execucaoAtiva.definir(null); // otimista: o chip some na hora

    this.execucaoService
      .encerrar(execucao.id, dto)
      .pipe(finalize(() => this.pausando.set(false)))
      .subscribe({
        next: (resposta) => {
          this.execucaoAtiva.registrarPausaDoChip();
          const duracao = new MinutosParaHorasPipe().transform(resposta.dados?.duracaoMinutos ?? 0);
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `Execução pausada — ${duracao} registradas` });
        },
        error: () => this.execucaoAtiva.definir(execucao as ExecucaoAtivaDto),
      });
  }
}
