import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TipoGrupoEnum } from '@project20/shared';
import { iniciaisDoNome } from '../avatar-usuario/avatar-usuario.component';
import { fundoDoGrupo, iconeDoCanal } from './avatar-grupo.util';

/**
 * O círculo do grupo do chat: o emoji que o grupo escolheu ou, sem ele, as iniciais do nome (as mesmas regras do avatar da pessoa). O fundo é a cor
 * do grupo ou, sem cor, o degradê das cores de bolinha dos membros (`coresDosMembros`); sem nenhuma, o acento do tema. O **canal** de demanda ou de projeto
 * (task 248) mostra um ícone no lugar das iniciais e usa sempre a cor do tema: não há degradê, porque os membros acompanham a demanda.
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
    /** O tipo do grupo: o canal tem ícone (`#` da demanda, pasta do projeto) em vez de iniciais ou emoji. */
    readonly tipo = input<TipoGrupoEnum>(TipoGrupoEnum.LIVRE);
    readonly pequeno = input(false);
    /** O diâmetro (qualquer medida CSS); sem ele vale o padrão do avatar (ou o do `pequeno`). */
    readonly tamanho = input<string | null>(null);

    protected readonly iniciais = computed(() => iniciaisDoNome(this.nome()));
    protected readonly icone = computed(() => iconeDoCanal(this.tipo()));
    private readonly aparencia = computed(() => fundoDoGrupo(this.cor(), this.icone() ? [] : this.coresDosMembros()));
    protected readonly fundo = computed(() => this.aparencia().fundo);
    protected readonly corDoTexto = computed(() => this.aparencia().corDoTexto);
}
