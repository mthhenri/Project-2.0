import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { iniciaisDoNome } from '../avatar-usuario/avatar-usuario.component';
import { fundoDoGrupo } from './avatar-grupo.util';

/**
 * O círculo do grupo do chat: o emoji que o grupo escolheu ou, sem ele, as iniciais do nome (as mesmas regras do avatar da pessoa). O fundo é a cor
 * do grupo ou, sem cor, o degradê das cores de bolinha dos membros (`coresDosMembros`); sem nenhuma, o acento do tema.
 */
@Component({
    selector: 'app-avatar-grupo',
    standalone: true,
    templateUrl: './avatar-grupo.component.html',
    styleUrl: './avatar-grupo.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarGrupoComponent {
    readonly nome = input.required<string>();
    /** A cor escolhida pelo grupo (`#RRGGBB`); `null` = degradê dos membros. */
    readonly cor = input<string | null>(null);
    /** Um emoji no lugar das iniciais; `null` = iniciais. */
    readonly emoji = input<string | null>(null);
    /** As cores de bolinha dos membros (só as que escolheram uma). */
    readonly coresDosMembros = input<string[]>([]);
    readonly pequeno = input(false);
    /** O diâmetro (qualquer medida CSS); sem ele vale o padrão do avatar (ou o do `pequeno`). */
    readonly tamanho = input<string | null>(null);

    protected readonly iniciais = computed(() => iniciaisDoNome(this.nome()));
    private readonly aparencia = computed(() => fundoDoGrupo(this.cor(), this.coresDosMembros()));
    protected readonly fundo = computed(() => this.aparencia().fundo);
    protected readonly corDoTexto = computed(() => this.aparencia().corDoTexto);
}
