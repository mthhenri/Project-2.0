import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { FixadaNoGrupo } from '../../services/mensagem-direta-grupo-estado.service';
import { MembroNoGrupo, nomeDoAutorNoGrupo } from '../../utils/grupo.util';
import { previaDaMensagem } from '../../utils/mensagem-direta.util';

/**
 * A faixa das mensagens fixadas no topo da conversa de um grupo ou canal (task 250): mostra a fixada mais recente e, havendo mais de uma, abre a lista; clicar numa
 * fixada leva a conversa até a mensagem original. Quem pode desafixar (todo membro) vê o botão de desafixar em cada uma.
 */
@Component({
    selector: 'app-mensagem-direta-grupo-fixadas',
    standalone: true,
    imports: [TooltipModule],
    templateUrl: './mensagem-direta-grupo-fixadas.component.html',
    styleUrl: './mensagem-direta-grupo-fixadas.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoFixadasComponent {
    readonly fixadas = input.required<FixadaNoGrupo[]>();
    readonly membros = input<MembroNoGrupo[]>([]);
    readonly meuId = input<number | undefined>(undefined);
    readonly podeDesafixar = input(true);

    /** Clicou numa fixada: a conversa rola até ela. */
    readonly ir = output<string>();
    readonly desafixar = output<string>();

    protected readonly expandida = signal(false);
    protected readonly maisRecente = computed(() => this.fixadas()[0] ?? null);

    protected previa(fixada: FixadaNoGrupo): string {
        return previaDaMensagem(fixada.mensagem.texto, fixada.mensagem.contemCodigo, false);
    }

    protected autor(fixada: FixadaNoGrupo): string {
        return nomeDoAutorNoGrupo(this.membros(), fixada.mensagem.autorUsuarioId, this.meuId());
    }

    protected alternar(): void {
        this.expandida.update((aberta) => !aberta);
    }
}
