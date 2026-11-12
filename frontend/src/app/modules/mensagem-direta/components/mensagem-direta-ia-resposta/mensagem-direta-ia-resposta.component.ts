import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PropostaIaResumoDto } from '@project20/shared';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { PropostaCartaoComponent } from '../../../chat/components/proposta-cartao/proposta-cartao.component';
import { PropostaGrupoComponent } from '../../../chat/components/proposta-grupo/proposta-grupo.component';
import { MensagemDiretaGrupoService } from '../../services/mensagem-direta-grupo.service';
import { MensagemDiretaService } from '../../services/mensagem-direta.service';
import { MensagemNaConversa, rotuloDaRespostaDaIa } from '../../utils/mensagem-direta.util';

/** Uma proposta como a outra pessoa da conversa a vê: carregando, oculta (sem acesso ao alvo), visível (só leitura) ou com erro ao carregar. */
type PropostaVista =
  | { propostaId: number; situacao: 'CARREGANDO' | 'OCULTA' | 'ERRO' }
  | { propostaId: number; situacao: 'VISIVEL'; proposta: PropostaIaResumoDto };

/** Onde as propostas da resposta se leem: a conversa com a outra pessoa ou o grupo. */
type AlvoDasPropostas = { usuarioId: number } | { grupoId: number };

/**
 * A resposta do `@IA` numa conversa do chat entre colaboradores (task 315): o selo da IA, para quem ela respondeu, o texto em Markdown e as propostas do turno.
 * Quem chamou a IA vê o cartão (uma proposta) ou o grupo (duas ou mais) com as ações de sempre, que só o dono resolve; a outra pessoa vê cada proposta só
 * para leitura, se tem acesso ao alvo, ou "Ação oculta por falta de acesso". O acesso é decidido pelo servidor, proposta a proposta.
 *
 * No grupo e no canal (task 326) é o mesmo, com `grupoId` no lugar da outra pessoa: cada membro lê as propostas pela rota do grupo.
 */
@Component({
    selector: 'app-mensagem-direta-ia-resposta',
    standalone: true,
    imports: [MarkdownVisualizadorComponent, PropostaCartaoComponent, PropostaGrupoComponent],
    templateUrl: './mensagem-direta-ia-resposta.component.html',
    styleUrl: './mensagem-direta-ia-resposta.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaIaRespostaComponent {
    private readonly servico = inject(MensagemDiretaService);
    private readonly grupoServico = inject(MensagemDiretaGrupoService);

    readonly mensagem = input.required<MensagemNaConversa>();
    /** A outra pessoa da conversa (a rota das propostas é pela conversa com ela). Ausente quando a resposta é de um grupo. */
    readonly outroUsuarioId = input<number | null>(null);
    /** O grupo ou canal da resposta (task 326); quando há, a rota das propostas é a do grupo. */
    readonly grupoId = input<number | null>(null);
    readonly meuId = input.required<number | undefined>();
    /** O nome de quem chamou a IA, como a conversa o mostra. */
    readonly nomeDeQuemChamou = input.required<string>();
    readonly horario = input.required<string>();

    protected readonly souQuemChamou = computed(() => this.meuId() !== undefined && this.mensagem().chamadaPorUsuarioId === this.meuId());
    protected readonly rotulo = computed(() => rotuloDaRespostaDaIa(this.souQuemChamou() ? 'você' : this.nomeDeQuemChamou()));
    protected readonly vistas = signal<PropostaVista[]>([]);

    constructor() {
        effect(() => {
            const mensagem = this.mensagem();
            const alvo = this.alvoDasPropostas();
            // Quem chamou lê as próprias propostas pelo cartão e pelo grupo; só a outra pessoa precisa da leitura pela conversa.
            if (this.souQuemChamou() || mensagem.propostaIds.length === 0 || alvo === null) {
                this.vistas.set([]);
                return;
            }
            void this.carregarVistas(mensagem.mensagemId, alvo, mensagem.propostaIds);
        });
    }

    /** A conversa onde ler as propostas: o grupo ou a outra pessoa; `null` sem nenhum dos dois. */
    private alvoDasPropostas(): AlvoDasPropostas | null {
        const grupoId = this.grupoId();
        if (grupoId !== null) return { grupoId };
        const usuarioId = this.outroUsuarioId();
        return usuarioId === null ? null : { usuarioId };
    }

    protected async carregarVistas(mensagemId: string, alvo: AlvoDasPropostas, propostaIds: number[]): Promise<void> {
        this.vistas.set(propostaIds.map((propostaId) => ({ propostaId, situacao: 'CARREGANDO' })));
        const vistas = await Promise.all(propostaIds.map((propostaId) => this.carregarVista(mensagemId, alvo, propostaId)));
        // A mensagem pode ter mudado enquanto as respostas vinham.
        if (this.mensagem().mensagemId !== mensagemId) return;
        this.vistas.set(vistas);
    }

    protected tentarDeNovo(): void {
        const mensagem = this.mensagem();
        const alvo = this.alvoDasPropostas();
        if (alvo) void this.carregarVistas(mensagem.mensagemId, alvo, mensagem.propostaIds);
    }

    private async carregarVista(mensagemId: string, alvo: AlvoDasPropostas, propostaId: number): Promise<PropostaVista> {
        try {
            const resposta = await firstValueFrom(
                'grupoId' in alvo ? this.grupoServico.recuperarProposta(alvo.grupoId, mensagemId, propostaId) : this.servico.recuperarProposta(alvo.usuarioId, mensagemId, propostaId),
            );
            const dados = resposta.dados;
            if (!dados) return { propostaId, situacao: 'ERRO' };
            return dados.acessivel && dados.proposta ? { propostaId, situacao: 'VISIVEL', proposta: dados.proposta } : { propostaId, situacao: 'OCULTA' };
        } catch {
            return { propostaId, situacao: 'ERRO' };
        }
    }
}
