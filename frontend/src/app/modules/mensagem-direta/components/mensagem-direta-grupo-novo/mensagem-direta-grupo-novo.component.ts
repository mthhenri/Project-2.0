import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LIMITE_NOME_DO_GRUPO } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MAXIMO_DE_MEMBROS_DO_GRUPO } from '../../utils/grupo.util';
import { MensagemDiretaGrupoAparenciaComponent } from '../mensagem-direta-grupo-aparencia/mensagem-direta-grupo-aparencia.component';
import { MensagemDiretaGrupoPessoasComponent } from '../mensagem-direta-grupo-pessoas/mensagem-direta-grupo-pessoas.component';

/** Criar um grupo (task 247): nome, cor, emoji e as pessoas do time. Quem cria vira o primeiro membro; qualquer um pode adicionar mais gente depois. */
@Component({
    selector: 'app-mensagem-direta-grupo-novo',
    standalone: true,
    imports: [ButtonModule, TooltipModule, MensagemDiretaGrupoAparenciaComponent, MensagemDiretaGrupoPessoasComponent],
    templateUrl: './mensagem-direta-grupo-novo.component.html',
    styleUrl: './mensagem-direta-grupo-novo.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoNovoComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);
    protected readonly grupoEstado = this.estado.grupoEstado;

    protected readonly nome = signal('');
    protected readonly cor = signal<string | null>(null);
    protected readonly emoji = signal<string | null>(null);
    protected readonly escolhidas = signal<number[]>([]);

    /** O criador já ocupa uma vaga. */
    protected readonly vagas = MAXIMO_DE_MEMBROS_DO_GRUPO - 1;
    /** O nome vale a partir de uma letra; o servidor confere o limite e os caracteres de novo. */
    protected readonly podeCriar = computed(() => this.nome().trim().length > 0 && [...this.nome().trim()].length <= LIMITE_NOME_DO_GRUPO && !this.grupoEstado.salvando());
    /** O degradê do grupo sem cor mostra as cores de quem foi escolhido, mais a minha. */
    protected readonly coresEscolhidas = computed(() => {
        const escolhidas = new Set(this.escolhidas());
        return (this.estado.pessoas() ?? []).filter((pessoa) => escolhidas.has(pessoa.usuarioId) && pessoa.corAvatar).map((pessoa) => pessoa.corAvatar as string);
    });

    protected voltar(): void {
        this.estado.visao.set('LISTA');
    }

    protected criar(): void {
        if (!this.podeCriar()) return;
        void this.estado.criarGrupo({
            nome: this.nome().trim(),
            corAvatar: this.cor(),
            emojiAvatar: this.emoji(),
            membroUsuarioIds: this.escolhidas(),
        });
    }
}
