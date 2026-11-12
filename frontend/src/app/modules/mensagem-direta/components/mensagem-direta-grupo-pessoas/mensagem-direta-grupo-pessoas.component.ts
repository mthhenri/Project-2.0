import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MensagemDiretaPessoaResumoDto } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { rotuloTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';
import { filtrarPessoasPorNome } from '../../utils/mensagem-direta.util';

/**
 * Escolher várias pessoas para o grupo (task 247): busca pelo nome e uma linha marcável por pessoa ativa. Serve a criar o grupo e a adicionar pessoas a
 * um grupo existente; quem usa decide quem entra na lista (`pessoas`) e lê as escolhas por `[(selecionadas)]`.
 */
@Component({
    selector: 'app-mensagem-direta-grupo-pessoas',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, AvatarUsuarioComponent],
    templateUrl: './mensagem-direta-grupo-pessoas.component.html',
    styleUrl: './mensagem-direta-grupo-pessoas.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoPessoasComponent {
    readonly pessoas = input.required<MensagemDiretaPessoaResumoDto[]>();
    readonly online = input<ReadonlySet<number>>(new Set());
    readonly carregando = input(false);
    readonly erro = input(false);
    /** Quantas pessoas a mais cabem (o grupo tem no máximo 50): com o limite atingido só dá para desmarcar. */
    readonly vagas = input<number>(Number.MAX_SAFE_INTEGER);
    readonly selecionadas = model<number[]>([]);
    readonly recarregar = output<void>();

    protected readonly controleBusca = new FormControl('', { nonNullable: true });
    private readonly texto = toSignal(this.controleBusca.valueChanges, { initialValue: '' });
    protected readonly rotuloTipo = rotuloTipoUsuario;
    protected readonly visiveis = computed(() => filtrarPessoasPorNome(this.pessoas(), this.texto()));
    protected readonly limiteAtingido = computed(() => this.selecionadas().length >= this.vagas());

    protected marcada(usuarioId: number): boolean {
        return this.selecionadas().includes(usuarioId);
    }

    protected alternar(usuarioId: number): void {
        if (this.marcada(usuarioId)) this.selecionadas.update((atuais) => atuais.filter((id) => id !== usuarioId));
        else if (!this.limiteAtingido()) this.selecionadas.update((atuais) => [...atuais, usuarioId]);
    }
}
