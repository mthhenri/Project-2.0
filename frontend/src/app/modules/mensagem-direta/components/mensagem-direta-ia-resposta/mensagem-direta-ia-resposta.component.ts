import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PropostaIaResumoDto } from '@project20/shared';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { PropostaCartaoComponent } from '../../../chat/components/proposta-cartao/proposta-cartao.component';
import { PropostaGrupoComponent } from '../../../chat/components/proposta-grupo/proposta-grupo.component';
import { MensagemDiretaService } from '../../services/mensagem-direta.service';
import { MensagemNaConversa, rotuloDaRespostaDaIa } from '../../utils/mensagem-direta.util';

/** Uma proposta como a outra pessoa da conversa a vê: carregando, oculta (sem acesso ao alvo), visível (só leitura) ou com erro ao carregar. */
type PropostaVista =
  | { propostaId: number; situacao: 'CARREGANDO' | 'OCULTA' | 'ERRO' }
  | { propostaId: number; situacao: 'VISIVEL'; proposta: PropostaIaResumoDto };

/**
 * A resposta do `@IA` numa conversa do chat entre colaboradores (task 315): o selo da IA, para quem ela respondeu, o texto em Markdown e as propostas do turno.
 * Quem chamou a IA vê o cartão (uma proposta) ou o grupo (duas ou mais) com as ações de sempre, que só o dono resolve; a outra pessoa vê cada proposta só
 * para leitura, se tem acesso ao alvo, ou "Ação oculta por falta de acesso". O acesso é decidido pelo servidor, proposta a proposta.
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

    readonly mensagem = input.required<MensagemNaConversa>();
    /** A outra pessoa da conversa (a rota das propostas é pela conversa com ela). */
    readonly outroUsuarioId = input.required<number>();
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
            const outroUsuarioId = this.outroUsuarioId();
            // Quem chamou lê as próprias propostas pelo cartão e pelo grupo; só a outra pessoa precisa da leitura pela conversa.
            if (this.souQuemChamou() || mensagem.propostaIds.length === 0) {
                this.vistas.set([]);
                return;
            }
            void this.carregarVistas(mensagem.mensagemId, outroUsuarioId, mensagem.propostaIds);
        });
    }

    protected async carregarVistas(mensagemId: string, outroUsuarioId: number, propostaIds: number[]): Promise<void> {
        this.vistas.set(propostaIds.map((propostaId) => ({ propostaId, situacao: 'CARREGANDO' })));
        const vistas = await Promise.all(propostaIds.map((propostaId) => this.carregarVista(mensagemId, outroUsuarioId, propostaId)));
        // A mensagem pode ter mudado enquanto as respostas vinham.
        if (this.mensagem().mensagemId !== mensagemId) return;
        this.vistas.set(vistas);
    }

    protected tentarDeNovo(): void {
        const mensagem = this.mensagem();
        void this.carregarVistas(mensagem.mensagemId, this.outroUsuarioId(), mensagem.propostaIds);
    }

    private async carregarVista(mensagemId: string, outroUsuarioId: number, propostaId: number): Promise<PropostaVista> {
        try {
            const resposta = await firstValueFrom(this.servico.recuperarProposta(outroUsuarioId, mensagemId, propostaId));
            const dados = resposta.dados;
            if (!dados) return { propostaId, situacao: 'ERRO' };
            return dados.acessivel && dados.proposta ? { propostaId, situacao: 'VISIVEL', proposta: dados.proposta } : { propostaId, situacao: 'OCULTA' };
        } catch {
            return { propostaId, situacao: 'ERRO' };
        }
    }
}
