import { Component, effect, inject, signal, computed, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ExecucaoEncerradaDto } from '@project20/shared';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MinutosParaHorasPipe } from '../../../pipes/minutos-para-horas.pipe';
import { ExecucaoEncerrarDialogComponent } from '../../../components/execucao-encerrar-dialog/execucao-encerrar-dialog.component';

/**
 * Chip global da execução ativa (task 95): ponto pulsante, descrição, cronômetro ao vivo e pausa.
 * Vive na topbar, então aparece em todas as telas autenticadas. Pausar abre o mesmo diálogo "Encerrar execução" da tela de Atividades.
 */
@Component({
    selector: 'app-chip-execucao-ativa',
    standalone: true,
    imports: [RouterModule, ButtonModule, TooltipModule, ExecucaoEncerrarDialogComponent],
    templateUrl: './chip-execucao-ativa.component.html',
    styleUrl: './chip-execucao-ativa.component.scss',
})
export class ChipExecucaoAtivaComponent {
    readonly execucaoAtiva = inject(ExecucaoAtivaService);
    private readonly sessao = inject(UsuarioSessaoService);
    private readonly messageService = inject(MessageService);

    private readonly agora = signal<number>(Date.now());
    private readonly dialogoEncerrar = viewChild.required<ExecucaoEncerrarDialogComponent>('dialogoEncerrar');

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

    abrirPausa(): void {
        const execucao = this.execucaoAtiva.ativa();
        if (!execucao) return;
        this.dialogoEncerrar().abrir({
            execucaoId: execucao.id,
            atividadeId: execucao.atividadeId,
            descricao: execucao.descricao,
            // Descrição obrigatória para desenvolvedor, opcional para gestor (regra do `ExecucaoEncerrarDto`).
            descricaoOpcional: this.sessao.eGestor(),
        });
    }

    aposEncerrar(resposta: ExecucaoEncerradaDto): void {
        this.execucaoAtiva.definir(null);
        this.execucaoAtiva.registrarPausaDoChip();
        const duracao = new MinutosParaHorasPipe().transform(resposta.duracaoMinutos ?? 0);
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `Execução pausada — ${duracao} registradas` });
    }
}
