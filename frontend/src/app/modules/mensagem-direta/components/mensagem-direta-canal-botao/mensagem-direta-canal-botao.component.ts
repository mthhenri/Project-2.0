import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GrupoResumoDto, TipoGrupoEnum } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaGrupoService } from '../../services/mensagem-direta-grupo.service';

/** O que o botão sabe do chat da demanda ou do projeto. */
type SituacaoDoCanal = 'CARREGANDO' | 'SEM_ACESSO' | 'SEM_CANAL' | 'COM_CANAL' | 'ERRO';

/**
 * O botão "Criar chat" / "Abrir chat" das telas da demanda e do projeto (task 248). Pergunta ao servidor se a demanda ou o projeto já tem chat e se a pessoa
 * tem acesso: sem acesso (403) o botão nem aparece; sem chat oferece criar; com chat abre o popup nele; na falha mostra um botão para tentar de novo. Criar
 * é idempotente no servidor, então duas pessoas clicando juntas acabam no mesmo chat. A tela que o usa só informa de que demanda ou projeto é.
 */
@Component({
    selector: 'app-mensagem-direta-canal-botao',
    standalone: true,
    imports: [ButtonModule, TooltipModule],
    templateUrl: './mensagem-direta-canal-botao.component.html',
    styleUrl: './mensagem-direta-canal-botao.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaCanalBotaoComponent {
    private readonly api = inject(MensagemDiretaGrupoService);
    private readonly estado = inject(MensagemDiretaEstadoService);

    /** `DEMANDA` (o chat da demanda) ou `PROJETO` (o chat do projeto). */
    readonly tipo = input.required<TipoGrupoEnum.DEMANDA | TipoGrupoEnum.PROJETO>();
    /** O id da demanda ou do projeto. */
    readonly alvoId = input.required<number>();

    protected readonly situacao = signal<SituacaoDoCanal>('CARREGANDO');
    protected readonly ocupado = signal(false);
    private readonly canal = signal<GrupoResumoDto | null>(null);
    /** Só a resposta da última pergunta vale (a tela troca de demanda sem desmontar o botão). */
    private geracao = 0;

    protected readonly rotulo = computed(() => (this.situacao() === 'COM_CANAL' ? 'Abrir chat' : 'Criar chat'));
    protected readonly dica = computed(() => {
        const alvo = this.tipo() === TipoGrupoEnum.DEMANDA ? 'da demanda' : 'do projeto';
        if (this.situacao() === 'ERRO') return 'Não foi possível verificar o chat. Clique para tentar de novo.';
        return this.situacao() === 'COM_CANAL' ? `Abrir o chat ${alvo}` : `Criar o chat ${alvo}, com quem está nele`;
    });

    constructor() {
        effect(() => {
            this.tipo();
            this.alvoId();
            untracked(() => void this.carregar());
        });
    }

    private async carregar(): Promise<void> {
        const geracao = ++this.geracao;
        this.situacao.set('CARREGANDO');
        this.canal.set(null);
        try {
            const resposta = await firstValueFrom(this.api.recuperarCanal(this.tipo(), this.alvoId()));
            if (geracao !== this.geracao) return;
            this.canal.set(resposta.dados?.grupo ?? null);
            this.situacao.set(resposta.dados?.grupo ? 'COM_CANAL' : 'SEM_CANAL');
        } catch (erro) {
            if (geracao !== this.geracao) return;
            this.situacao.set((erro as { status?: number })?.status === 403 ? 'SEM_ACESSO' : 'ERRO');
        }
    }

    protected async aoClicar(): Promise<void> {
        if (this.ocupado()) return;
        if (this.situacao() === 'ERRO') return this.carregar();
        this.ocupado.set(true);
        try {
            const geracao = this.geracao;
            let canal = this.canal();
            if (!canal) {
                // Criar é idempotente: se alguém criou no meio-tempo, volta o chat que já existe.
                canal = (await firstValueFrom(this.api.criarCanal(this.tipo(), this.alvoId()))).dados?.grupo ?? null;
                if (geracao === this.geracao) {
                    this.canal.set(canal);
                    this.situacao.set(canal ? 'COM_CANAL' : 'ERRO');
                }
            }
            if (canal) await this.estado.abrirCanal(canal);
        } catch (erro) {
            this.situacao.set((erro as { status?: number })?.status === 403 ? 'SEM_ACESSO' : 'ERRO');
        } finally {
            this.ocupado.set(false);
        }
    }
}
