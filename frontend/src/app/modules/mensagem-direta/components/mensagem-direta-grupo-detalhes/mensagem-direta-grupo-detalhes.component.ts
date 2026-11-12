import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { TipoGrupoEnum, grupoEhCanal } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { rotuloTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MAXIMO_DE_MEMBROS_DO_GRUPO, coresDosMembros, pessoasParaAdicionar, rotuloDosMembros } from '../../utils/grupo.util';
import { MensagemDiretaGrupoAparenciaComponent } from '../mensagem-direta-grupo-aparencia/mensagem-direta-grupo-aparencia.component';
import { MensagemDiretaGrupoPessoasComponent } from '../mensagem-direta-grupo-pessoas/mensagem-direta-grupo-pessoas.component';

/**
 * Os detalhes do grupo aberto (task 247): qualquer membro muda nome, cor e emoji, vê quem está no grupo, adiciona pessoas e sai (cada um só sai por conta
 * própria; ninguém remove ninguém). A lista mostra só os membros atuais. Sair pede confirmação e avisa quando o grupo fecha por ser o último membro.
 */
@Component({
    selector: 'app-mensagem-direta-grupo-detalhes',
    standalone: true,
    imports: [ButtonModule, TooltipModule, AvatarUsuarioComponent, MensagemDiretaGrupoAparenciaComponent, MensagemDiretaGrupoPessoasComponent],
    templateUrl: './mensagem-direta-grupo-detalhes.component.html',
    styleUrl: './mensagem-direta-grupo-detalhes.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoDetalhesComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);
    protected readonly grupoEstado = this.estado.grupoEstado;
    protected readonly meuId = inject(UsuarioSessaoService).id;
    protected readonly rotuloTipo = rotuloTipoUsuario;
    protected readonly rotuloDosMembros = rotuloDosMembros;

    protected readonly grupo = this.grupoEstado.grupoAbertoNaLista;
    protected readonly membros = computed(() => this.grupo()?.membros ?? []);
    protected readonly alvoDoCanal = computed(() => (this.grupo()?.tipo === TipoGrupoEnum.DEMANDA ? 'demanda' : 'qualquer demanda do projeto'));
    /** O chat de uma demanda ou de um projeto: só se vê quem está nele (os membros acompanham a demanda ou o projeto). */
    protected readonly ehCanal = computed(() => {
        const grupo = this.grupo();
        return !!grupo && grupoEhCanal(grupo.tipo);
    });
    protected readonly coresDosMembros = computed(() => coresDosMembros(this.membros()));

    // O que a pessoa está editando; parte do que o grupo tem e só vira do grupo ao salvar.
    protected readonly nome = signal('');
    protected readonly cor = signal<string | null>(null);
    protected readonly emoji = signal<string | null>(null);
    protected readonly escolhidas = signal<number[]>([]);
    protected readonly confirmandoSaida = signal(false);

    protected readonly alterado = computed(() => {
        const grupo = this.grupo();
        return !!grupo && (this.nome().trim() !== grupo.nome || this.cor() !== grupo.corAvatar || this.emoji() !== grupo.emojiAvatar);
    });
    protected readonly podeSalvar = computed(() => this.alterado() && this.nome().trim().length > 0 && !this.grupoEstado.salvando());
    /** Quem ainda pode entrar: as pessoas ativas que não são membros. */
    protected readonly candidatas = computed(() => pessoasParaAdicionar(this.estado.pessoas() ?? [], this.membros()));
    protected readonly vagas = computed(() => MAXIMO_DE_MEMBROS_DO_GRUPO - this.membros().length);
    /** Sou o último membro: sair encerra o grupo. */
    protected readonly souOUltimo = computed(() => this.membros().length <= 1);

    constructor() {
        // O item "Sair do grupo" do menu abre os detalhes já com a confirmação à vista.
        if (this.estado.saidaPedidaAoAbrirDetalhes()) {
            this.confirmandoSaida.set(true);
            this.estado.saidaPedidaAoAbrirDetalhes.set(false);
        }
        // Parte dos valores do grupo ao abrir (ou ao abrir outro).
        effect(() => {
            const grupo = this.grupo();
            if (!grupo) return;
            untracked(() => {
                this.nome.set(grupo.nome);
                this.cor.set(grupo.corAvatar);
                this.emoji.set(grupo.emojiAvatar);
            });
        });
    }

    protected voltar(): void {
        this.estado.voltarParaOGrupo();
    }

    protected async salvar(): Promise<void> {
        const grupo = this.grupo();
        if (!grupo || !this.podeSalvar()) return;
        await this.grupoEstado.alterarGrupo(grupo.grupoId, {
            ...(this.nome().trim() !== grupo.nome ? { nome: this.nome().trim() } : {}),
            ...(this.cor() !== grupo.corAvatar ? { corAvatar: this.cor() } : {}),
            ...(this.emoji() !== grupo.emojiAvatar ? { emojiAvatar: this.emoji() } : {}),
        });
    }

    protected async adicionar(): Promise<void> {
        const grupo = this.grupo();
        if (!grupo || this.escolhidas().length === 0) return;
        if (await this.grupoEstado.adicionarMembros(grupo.grupoId, this.escolhidas())) this.escolhidas.set([]);
    }

    protected pedirSaida(): void {
        this.confirmandoSaida.set(true);
    }

    protected cancelarSaida(): void {
        this.confirmandoSaida.set(false);
    }

    protected confirmarSaida(): void {
        void this.estado.sairDoGrupoAberto();
    }
}
