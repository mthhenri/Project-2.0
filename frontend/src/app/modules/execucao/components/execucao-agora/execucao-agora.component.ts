import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ExecucaoItemDto, REGEX_SEM_CARACTERES_PROIBIDOS, horaNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { ExecucaoTimerComponent } from '../execucao-timer/execucao-timer.component';
import { iniciaisDoNome } from '../../utils/execucao.util';

export interface ExecucaoPausaPedida {
  execucao: ExecucaoItemDto;
  descricao: string;
}

/**
 * Bloco "Em andamento agora" da tela Execuções (task 252): a execução ativa fica fora da tabela, que lista só o que já fechou.
 * Com mais de um usuário (gestor sem filtro) vira uma grade de cartões compactos; sem execução, mostra o estado vazio
 * (com "Iniciar atividade" só para o desenvolvedor). Pausar é encerrar com a descrição, como no chip da barra superior.
 */
@Component({
  selector: 'app-execucao-agora',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, PopoverModule, TextareaModule, TooltipModule, BloquearCaracteresProibidosDirective, ExecucaoTimerComponent],
  templateUrl: './execucao-agora.component.html',
  styleUrl: './execucao-agora.component.scss',
})
export class ExecucaoAgoraComponent {
  readonly ativas = input.required<ExecucaoItemDto[]>();
  /** Gestor sem filtro de usuário: cada cartão mostra de quem é a execução. */
  readonly mostrarUsuario = input<boolean>(false);
  /** Só o desenvolvedor vê o atalho que leva ao chat (ou às Atividades). */
  readonly podeIniciar = input<boolean>(false);
  readonly descricaoObrigatoria = input<boolean>(false);
  readonly pausando = input<boolean>(false);

  readonly pausar = output<ExecucaoPausaPedida>();
  readonly iniciar = output<void>();
  readonly abrirAtividade = output<number>();

  readonly execucaoEmPausa = signal<ExecucaoItemDto | null>(null);
  readonly descricao = new FormControl<string>('', { nonNullable: true });

  readonly titulo = computed(() =>
    this.mostrarUsuario() && this.ativas().length > 1 ? `Em andamento agora · ${this.ativas().length}` : 'Em andamento agora',
  );
  readonly textoVazio = computed(() =>
    this.mostrarUsuario() ? 'Ninguém está executando agora.' : 'Nenhuma execução em andamento.',
  );

  iniciais(nomeCompleto: string): string {
    return iniciaisDoNome(nomeCompleto);
  }

  horaDeInicio(execucao: ExecucaoItemDto): string {
    return horaNoFuso(new Date(execucao.inicioData), ambiente.fusoHorario);
  }

  abrirPausa(evento: Event, execucao: ExecucaoItemDto, popover: Popover): void {
    this.execucaoEmPausa.set(execucao);
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
    // O popover foca o primeiro botão ao abrir; o foco do campo vem depois dele.
    setTimeout(() => {
      const campo = document.querySelector<HTMLTextAreaElement>('.execucao-agora__descricao-campo');
      campo?.focus();
      campo?.setSelectionRange(campo.value.length, campo.value.length);
    }, 50);
  }

  /** Enter confirma; Shift+Enter quebra a linha. */
  aoTeclar(evento: Event, popover: Popover): void {
    if ((evento as KeyboardEvent).shiftKey) return;
    evento.preventDefault();
    this.confirmarPausa(popover);
  }

  confirmarPausa(popover: Popover): void {
    const execucao = this.execucaoEmPausa();
    if (!execucao || this.pausando()) return;
    if (this.descricao.invalid) {
      this.descricao.markAsTouched();
      return;
    }
    popover.hide();
    this.pausar.emit({ execucao, descricao: this.descricao.value.trim() });
  }
}
