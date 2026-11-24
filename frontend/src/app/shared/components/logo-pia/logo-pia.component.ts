import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A logo da Piá, a IA do sistema (task 489): o nome "piá" escrito, com o acento do á em âmbar no lugar do brilho genérico
 * de IA. Vai onde a Piá é quem fala (avatar da mensagem no chat, no check-in e no grupo). Ícone de ação ou de menu da IA
 * não usa esta logo: usa o brilho `pi pi-sparkles app-icone-pia`. Sem `rotulo` a logo é decorativa.
 */
@Component({
    selector: 'app-logo-pia',
    standalone: true,
    templateUrl: './logo-pia.component.html',
    styleUrl: './logo-pia.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[style.--logo-tamanho]': 'tamanho()',
        '[attr.role]': 'rotulo() ? "img" : null',
        '[attr.aria-label]': 'rotulo()',
        '[attr.aria-hidden]': 'rotulo() ? null : "true"',
    },
})
export class LogoPiaComponent {
    /** Altura do nome (qualquer medida CSS); a largura acompanha na proporção 1,23. */
    readonly tamanho = input('1.25rem');
    /** Texto acessível; `null` deixa a logo decorativa. */
    readonly rotulo = input<string | null>(null);
}
