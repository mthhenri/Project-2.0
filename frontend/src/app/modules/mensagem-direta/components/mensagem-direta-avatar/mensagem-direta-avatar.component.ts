import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { corDoTextoSobre } from '@project20/shared';
import { iniciais } from '../../utils/mensagem-direta.util';

/** O círculo com as iniciais da pessoa e, se `online` for informado, a bolinha de presença (verde online, cinza offline). */
@Component({
    selector: 'app-mensagem-direta-avatar',
    standalone: true,
    templateUrl: './mensagem-direta-avatar.component.html',
    styleUrl: './mensagem-direta-avatar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaAvatarComponent {
    readonly nome = input.required<string>();
    /** `null` não mostra a bolinha. */
    readonly online = input<boolean | null>(null);
    readonly pequeno = input(false);
    /** A cor escolhida pela pessoa (`#RRGGBB`); `null` usa a cor de acento do tema. */
    readonly cor = input<string | null>(null);

    readonly iniciais = computed(() => iniciais(this.nome()));
    protected readonly fundo = computed(() => this.cor());
    protected readonly corDoTexto = computed(() => {
        const cor = this.cor();
        return cor ? corDoTextoSobre(cor) : null;
    });
}
