import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { REACOES_RAPIDAS_MENSAGEM_DIRETA, ReacaoMensagemDiretaDto } from '@project20/shared';
import { TooltipModule } from 'primeng/tooltip';
import { PilulaDeReacao, agruparReacoes, minhaReacao } from '../../utils/reacoes.util';

/**
 * As reações de uma mensagem (task 314): as pílulas sob o balão (um emoji, quantas pessoas, a minha destacada; clicar nela remove ou troca) e, quando
 * aberta, a faixa com os seis atalhos e o "+" para o seletor completo. Só apresenta: quem reage é o estado do chat.
 */
@Component({
    selector: 'app-mensagem-direta-reacoes',
    standalone: true,
    imports: [TooltipModule],
    templateUrl: './mensagem-direta-reacoes.component.html',
    styleUrl: './mensagem-direta-reacoes.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaReacoesComponent {
    readonly reacoes = input.required<ReacaoMensagemDiretaDto[]>();
    readonly meuId = input<number | undefined>(undefined);
    /** O nome de quem reagiu (a tela só conhece as duas pessoas da conversa). */
    readonly nomeDe = input.required<(usuarioId: number) => string>();
    /** A faixa de atalhos está à mostra. */
    readonly barraAberta = input(false);

    /** O emoji escolhido: o mesmo da minha reação tira, outro troca. */
    readonly reagir = output<string>();
    readonly abrirSeletor = output<void>();
    readonly fecharBarra = output<void>();

    protected readonly atalhos = REACOES_RAPIDAS_MENSAGEM_DIRETA;
    protected readonly pilulas = computed(() => agruparReacoes(this.reacoes(), this.meuId(), this.nomeDe()));
    protected readonly minha = computed(() => minhaReacao(this.reacoes(), this.meuId()));

    protected rotulo(pilula: PilulaDeReacao): string {
        return `${pilula.reacao} ${pilula.nomes.join(' e ')}${pilula.minha ? ' (clique para remover)' : ''}`;
    }

    /** Esc fecha só a faixa: não deixa o popup do chat ouvir e se ocultar. */
    protected aoApertarEsc(evento: Event): void {
        evento.stopPropagation();
        this.fecharBarra.emit();
    }
}
