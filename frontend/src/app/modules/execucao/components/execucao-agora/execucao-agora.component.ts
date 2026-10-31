import { Component, computed, input, output, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ExecucaoItemDto, horaNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { ExecucaoEncerrarDialogComponent } from '../../../../shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component';
import { ExecucaoTimerComponent } from '../execucao-timer/execucao-timer.component';
import { iniciaisDoNome } from '../../utils/execucao.util';

/**
 * Bloco "Em andamento agora" da tela Execuções (task 252): a execução ativa fica fora da tabela, que lista só o que já fechou.
 * Com mais de um usuário (gestor sem filtro) vira uma grade de cartões compactos; sem execução, mostra o estado vazio
 * (com "Iniciar atividade" só para o desenvolvedor). Pausar abre o mesmo diálogo "Encerrar execução" da tela de Atividades.
 */
@Component({
    selector: 'app-execucao-agora',
    standalone: true,
    imports: [ButtonModule, TooltipModule, ExecucaoTimerComponent, ExecucaoEncerrarDialogComponent],
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

    /** Uma execução foi pausada no diálogo: a tela recarrega a lista. */
    readonly encerrada = output<void>();
    readonly iniciar = output<void>();

    private readonly dialogoEncerrar = viewChild.required<ExecucaoEncerrarDialogComponent>('dialogoEncerrar');

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

    abrirPausa(execucao: ExecucaoItemDto): void {
        this.dialogoEncerrar().abrir({
            execucaoId: execucao.id,
            atividadeId: execucao.atividadeId,
            descricao: execucao.descricao,
            descricaoOpcional: !this.descricaoObrigatoria(),
        });
    }
}
