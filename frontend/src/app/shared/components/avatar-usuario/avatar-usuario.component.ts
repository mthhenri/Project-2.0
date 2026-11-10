import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { corDoTextoSobre } from '@project20/shared';

/**
 * O círculo com as iniciais de uma pessoa, em qualquer tela. Usa a cor que a pessoa escolheu (`cor`) ou, sem ela, o
 * acento do tema. Se `online` for informado, mostra a bolinha de presença (verde online, cinza offline).
 */
@Component({
    selector: 'app-avatar-usuario',
    standalone: true,
    templateUrl: './avatar-usuario.component.html',
    styleUrl: './avatar-usuario.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarUsuarioComponent {
    readonly nome = input.required<string>();
    /** `null` não mostra a bolinha. */
    readonly online = input<boolean | null>(null);
    readonly pequeno = input(false);
    /** O diâmetro (qualquer medida CSS, ex.: `1.75rem`); sem ele vale o padrão do avatar (ou o do `pequeno`). */
    readonly tamanho = input<string | null>(null);
    /** Um anel na cor da superfície, para avatares empilhados. */
    readonly contorno = input(false);
    /** A cor escolhida pela pessoa (`#RRGGBB`); `null` usa a cor de acento do tema. */
    readonly cor = input<string | null>(null);
    /** Iniciais já decididas pela tela; sem elas valem a primeira e a última palavra do nome. */
    readonly iniciais = input<string | null>(null);

    readonly iniciaisExibidas = computed(() => this.iniciais() ?? iniciaisDoNome(this.nome()));
    protected readonly fundo = computed(() => this.cor());
    protected readonly corDoTexto = computed(() => {
        const cor = this.cor();
        return cor ? corDoTextoSobre(cor) : null;
    });
}

/** "Camila Duarte" → "CD" (primeira e última palavra); nome vazio → "?". */
export function iniciaisDoNome(nome: string): string {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    const primeira = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
}
