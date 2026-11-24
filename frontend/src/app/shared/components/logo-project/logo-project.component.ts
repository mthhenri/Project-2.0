import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * O símbolo do Project 2.0 (task 489): o P cuja haste é a linha do tempo, com uma órbita em volta que termina na
 * bolinha verde de "em execução" (o mesmo sinal do chip da topbar). As cores vêm dos tokens `--app-logo-*` e não
 * acompanham a cor primária escolhida pelo usuário. Sem `rotulo` o símbolo é decorativo.
 */
@Component({
    selector: 'app-logo-project',
    standalone: true,
    templateUrl: './logo-project.component.html',
    styleUrl: './logo-project.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'logo-project',
        '[style.--logo-tamanho]': 'tamanho()',
        '[attr.role]': 'rotulo() ? "img" : null',
        '[attr.aria-label]': 'rotulo()',
        '[attr.aria-hidden]': 'rotulo() ? null : "true"',
    },
})
export class LogoProjectComponent {
    /** Lado do quadrado (qualquer medida CSS, ex.: `2rem`, `1em`). */
    readonly tamanho = input('2rem');
    /** O símbolo menor, sobre o quadrado azul arredondado (favicon, ícone do Desktop, selo). */
    readonly ladrilho = input(false);
    /** Texto acessível; `null` deixa o símbolo decorativo. */
    readonly rotulo = input<string | null>(null);
}
