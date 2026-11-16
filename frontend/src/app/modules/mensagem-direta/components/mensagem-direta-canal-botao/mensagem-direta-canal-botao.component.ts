import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TipoGrupoEnum } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaGrupoService } from '../../services/mensagem-direta-grupo.service';

/**
 * O botão "Criar chat" / "Abrir chat" das telas da demanda e do projeto (task 248). Não pergunta nada ao servidor ao aparecer nem a cada seleção (tasks 360
 * e 405): a tela que o usa já recebe, no detalhe da demanda ou do projeto, se o chat existe (`canalExiste`) e se quem está logado pode abri-lo (`podeAbrir`;
 * o auxiliar, como o desenvolvedor, só nas demandas em que é membro). Sem permissão o botão nem aparece. O servidor só é chamado no clique: abrir busca o
 * chat existente e criar é idempotente, então duas pessoas clicando juntas acabam no mesmo chat. Na falha o botão vira "Chat indisponível" e tenta de novo.
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
    /** O chat já existe (vem do detalhe da demanda ou do projeto). */
    readonly canalExiste = input.required<boolean>();
    /** Quem está logado pode abrir o chat (vem do detalhe); falso esconde o botão. */
    readonly podeAbrir = input.required<boolean>();

    protected readonly ocupado = signal(false);
    protected readonly falhou = signal(false);
    /** O chat que esta pessoa acabou de criar, para o rótulo virar "Abrir chat" sem esperar o detalhe ser recarregado. */
    private readonly criadoAgora = signal(false);

    protected readonly existe = computed(() => this.canalExiste() || this.criadoAgora());
    protected readonly rotulo = computed(() => {
        if (this.falhou()) return 'Chat indisponível';
        return this.existe() ? 'Abrir chat' : 'Criar chat';
    });
    protected readonly dica = computed(() => {
        const alvo = this.tipo() === TipoGrupoEnum.DEMANDA ? 'da demanda' : 'do projeto';
        if (this.falhou()) return 'Não foi possível abrir o chat. Clique para tentar de novo.';
        return this.existe() ? `Abrir o chat ${alvo}` : `Criar o chat ${alvo}, com quem está nele`;
    });

    constructor() {
        // Outra demanda ou outro projeto na mesma tela: o que valia para o anterior não vale para o novo.
        effect(() => {
            this.tipo();
            this.alvoId();
            untracked(() => {
                this.criadoAgora.set(false);
                this.falhou.set(false);
            });
        });
    }

    protected async aoClicar(): Promise<void> {
        if (this.ocupado()) return;
        this.ocupado.set(true);
        this.falhou.set(false);
        const alvo = { tipo: this.tipo(), alvoId: this.alvoId() };
        try {
            // Criar é idempotente: se alguém criou no meio-tempo, volta o chat que já existe.
            const resposta = await firstValueFrom(this.existe() ? this.api.recuperarCanal(alvo.tipo, alvo.alvoId) : this.api.criarCanal(alvo.tipo, alvo.alvoId));
            const canal = resposta.dados?.grupo ?? null;
            if (!canal) {
                this.falhou.set(true);
                return;
            }
            if (alvo.tipo === this.tipo() && alvo.alvoId === this.alvoId()) this.criadoAgora.set(true);
            await this.estado.abrirCanal(canal);
        } catch {
            this.falhou.set(true);
        } finally {
            this.ocupado.set(false);
        }
    }
}
