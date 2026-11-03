import { Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { CheckinSituacaoConsultadaDto } from '@project20/shared';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { CheckinService } from '../../services/checkin.service';
import { textoDoProximoCheckin } from '../../utils/checkin.util';

/**
 * Quanto falta para o próximo check-in, no menu do perfil da barra superior (task 303). Consulta a situação ao nascer e conta os segundos
 * enquanto está na tela; o popover só monta o conteúdo aberto, então fechar o menu encerra a contagem e reabrir consulta de novo.
 * Com o menu aberto (ou o conteúdo já montado), iniciar, pausar ou trocar a execução — por qualquer tela ou pela IA — refaz a consulta,
 * pois o horário do check-in nasce com a execução.
 */
@Component({
    selector: 'app-checkin-proximo',
    standalone: true,
    templateUrl: './checkin-proximo.component.html',
    styleUrl: './checkin-proximo.component.scss',
})
export class CheckinProximoComponent implements OnInit {
    private readonly checkinService = inject(CheckinService);
    private readonly execucaoAtiva = inject(ExecucaoAtivaService);
    private readonly destroyRef = inject(DestroyRef);

    /** `undefined` até a consulta responder; `null` se ela falhou. */
    private readonly situacao = signal<CheckinSituacaoConsultadaDto | null | undefined>(undefined);
    private readonly agora = signal<number>(Date.now());

    readonly texto = computed(() => textoDoProximoCheckin(this.situacao(), this.agora()));

    constructor() {
        const relogio = setInterval(() => this.agora.set(Date.now()), 1000);
        this.destroyRef.onDestroy(() => clearInterval(relogio));

        let execucaoAnterior: number | null | undefined;
        effect(() => {
            const execucaoAtual = this.execucaoAtiva.ativa()?.id ?? null;
            if (execucaoAnterior !== undefined && execucaoAnterior !== execucaoAtual) untracked(() => this.consultar());
            execucaoAnterior = execucaoAtual;
        });
    }

    ngOnInit(): void {
        this.consultar();
    }

    private consultar(): void {
        this.checkinService.consultarSituacao().subscribe({
            next: (resposta) => this.situacao.set(resposta.sucesso ? (resposta.dados ?? null) : null),
            error: () => this.situacao.set(null),
        });
    }
}
