import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { AutorMensagemDiretaEnum, ConversaDiretaSupervisaoResumoDto, MensagemDiretaSupervisaoParticipanteDto } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';
import { MensagemDiretaReferenciaCartaoComponent } from '../../components/mensagem-direta-referencia-cartao/mensagem-direta-referencia-cartao.component';
import { MensagemDiretaGrupoService } from '../../services/mensagem-direta-grupo.service';
import { MensagemDiretaService } from '../../services/mensagem-direta.service';
import {
    MensagemNaConversa,
    agruparPorDia,
    formatarHora,
    mesclarMensagens,
    normalizarMensagem,
    previaDaMensagem,
    rotuloDaLista,
    rotuloDaRespostaDaIa,
} from '../../utils/mensagem-direta.util';

const ESPERA_DA_BUSCA_MS = 400;
const CONVERSAS_POR_PAGINA = 20;
const NOME_DE_USUARIO_REMOVIDO = 'Usuário removido';

/** Uma linha da lista da supervisão: a conversa entre desenvolvedores ou, no modo Grupos, o grupo (com o nome em `titulo`). */
type ItemDaSupervisao = ConversaDiretaSupervisaoResumoDto & { titulo?: string };

type ModoDaSupervisao = 'CONVERSAS' | 'GRUPOS';

interface ConversaAberta {
    conversaId: string;
    /** O nome do grupo aberto; ausente na conversa entre duas pessoas. */
    titulo?: string;
    participantes: MensagemDiretaSupervisaoParticipanteDto[];
    mensagens: MensagemNaConversa[];
    proximoCursor: string | null;
    participantesAvisados: boolean;
    carregando: boolean;
    carregandoMais: boolean;
    erro: 'GERAL' | 'PRIVADA' | null;
}

/**
 * Supervisão do chat (task 214, só gestor): as conversas entre desenvolvedores, somente leitura. Abrir uma conversa grava a auditoria e avisa os
 * participantes (no máximo uma vez por dia); as mensagens mais antigas da mesma conversa não repetem nem a auditoria nem o aviso.
 */
@Component({
    selector: 'app-supervisao-chat',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        SkeletonModule,
        ToggleSwitchModule,
        TooltipModule,
        MarkdownVisualizadorComponent,
        AvatarUsuarioComponent,
        MensagemDiretaReferenciaCartaoComponent,
    ],
    templateUrl: './supervisao-chat.page.html',
    styleUrl: './supervisao-chat.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisaoChatPage {
    private readonly mensagemDiretaService = inject(MensagemDiretaService);
    private readonly grupoService = inject(MensagemDiretaGrupoService);
    private readonly destroyRef = inject(DestroyRef);

    /** Conversas entre desenvolvedores (task 214) ou grupos sem gestor entre os membros (task 247). */
    protected readonly modo = signal<ModoDaSupervisao>('CONVERSAS');

    protected readonly formularioFiltros = new FormGroup({
        busca: new FormControl('', { nonNullable: true }),
        somenteCodigo: new FormControl(false, { nonNullable: true }),
    });

    protected readonly conversas = signal<ItemDaSupervisao[]>([]);
    protected readonly total = signal(0);
    protected readonly pagina = signal(1);
    protected readonly carregandoLista = signal(true);
    protected readonly carregandoMaisConversas = signal(false);
    protected readonly erroDaLista = signal(false);
    protected readonly aberta = signal<ConversaAberta | null>(null);
    /** Os filtros viram signal na hora em que o debounce dispara, para o estado "sem resultado" saber se há filtro. */
    protected readonly filtrosAplicados = signal({ busca: '', somenteCodigo: false });

    protected readonly temFiltro = computed(() => this.filtrosAplicados().busca.trim() !== '' || this.filtrosAplicados().somenteCodigo);
    protected readonly haMaisConversas = computed(() => this.conversas().length < this.total());
    protected readonly grupos = computed(() => {
        const conversa = this.aberta();
        return conversa ? agruparPorDia(conversa.mensagens, new Date()) : [];
    });

    private carregamento = 0;

    constructor() {
        this.formularioFiltros.valueChanges
            .pipe(
                debounceTime(ESPERA_DA_BUSCA_MS),
                distinctUntilChanged((item, segundo) => item.busca === segundo.busca && item.somenteCodigo === segundo.somenteCodigo),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => {
                this.filtrosAplicados.set(this.formularioFiltros.getRawValue());
                this.carregarConversas(1);
            });
        this.carregarConversas(1);
    }

    protected carregarConversas(pagina: number): void {
        const requisicao = ++this.carregamento;
        const { busca, somenteCodigo } = this.filtrosAplicados();
        if (pagina === 1) this.carregandoLista.set(true);
        else this.carregandoMaisConversas.set(true);
        this.erroDaLista.set(false);

        const filtros = { texto: busca.trim() || undefined, somenteCodigo: somenteCodigo || undefined, pagina, porPagina: CONVERSAS_POR_PAGINA };
        const itens$ =
            this.modo() === 'GRUPOS'
                ? this.grupoService.listarGruposSupervisionados(filtros).pipe(
                    map((resposta) => ({
                        itens: resposta.dados!.grupos.map(
                            (grupo): ItemDaSupervisao => ({ conversaId: grupo.conversaId, titulo: grupo.nome, participantes: grupo.membros, totalMensagens: grupo.totalMensagens, ultimaMensagem: grupo.ultimaMensagem }),
                        ),
                        total: resposta.dados!.total,
                    })),
                )
                : this.mensagemDiretaService.listarConversasSupervisionadas(filtros).pipe(map((resposta) => ({ itens: resposta.dados!.conversas as ItemDaSupervisao[], total: resposta.dados!.total })));
        itens$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (resposta) => {
                    if (requisicao !== this.carregamento) return;
                    this.conversas.set(pagina === 1 ? resposta.itens : [...this.conversas(), ...resposta.itens]);
                    this.total.set(resposta.total);
                    this.pagina.set(pagina);
                    this.carregandoLista.set(false);
                    this.carregandoMaisConversas.set(false);
                },
                error: () => {
                    if (requisicao !== this.carregamento) return;
                    this.erroDaLista.set(true);
                    this.carregandoLista.set(false);
                    this.carregandoMaisConversas.set(false);
                },
            });
    }

    protected carregarMaisConversas(): void {
        this.carregarConversas(this.pagina() + 1);
    }

    protected limparFiltros(): void {
        this.formularioFiltros.reset({ busca: '', somenteCodigo: false });
    }

    /** Troca entre as conversas entre desenvolvedores e os grupos: fecha a leitura e relê a lista do modo escolhido. */
    protected trocarModo(modo: ModoDaSupervisao): void {
        if (this.modo() === modo) return;
        this.modo.set(modo);
        this.aberta.set(null);
        this.conversas.set([]);
        this.total.set(0);
        this.carregarConversas(1);
    }

    /** O id do grupo de um `conversaId` `G<id>`, ou `null` quando é uma conversa entre duas pessoas. */
    private grupoIdDe(conversaId: string): number | null {
        return conversaId.startsWith('G') ? Number(conversaId.slice(1)) : null;
    }

    /** Lê a conversa (ou o grupo) como a mesma forma: os participantes e as mensagens, a partir da rota certa. */
    private ler(conversaId: string, cursor?: string | null) {
        const grupoId = this.grupoIdDe(conversaId);
        if (grupoId === null) return this.mensagemDiretaService.lerConversaSupervisionada(conversaId, cursor);
        return this.grupoService.lerGrupoSupervisionado(grupoId, cursor).pipe(
            map((resposta) => ({
                ...resposta,
                dados: resposta.dados && { conversaId, participantes: resposta.dados.membros, mensagens: resposta.dados.mensagens, proximoCursor: resposta.dados.proximoCursor, participantesAvisados: resposta.dados.membrosAvisados },
            })),
        );
    }

    protected abrir(conversa: ItemDaSupervisao): void {
        this.aberta.set({
            conversaId: conversa.conversaId,
            titulo: conversa.titulo,
            participantes: conversa.participantes,
            mensagens: [],
            proximoCursor: null,
            participantesAvisados: false,
            carregando: true,
            carregandoMais: false,
            erro: null,
        });
        this.ler(conversa.conversaId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (resposta) => {
                    if (this.aberta()?.conversaId !== conversa.conversaId) return;
                    this.aberta.set({
                        conversaId: conversa.conversaId,
                        titulo: conversa.titulo,
                        participantes: resposta.dados!.participantes,
                        mensagens: mesclarMensagens([], resposta.dados!.mensagens.map((mensagem) => normalizarMensagem(mensagem))),
                        proximoCursor: resposta.dados!.proximoCursor,
                        participantesAvisados: resposta.dados!.participantesAvisados,
                        carregando: false,
                        carregandoMais: false,
                        erro: null,
                    });
                },
                error: (erro: unknown) => this.falhouAoAbrir(conversa.conversaId, erro),
            });
    }

    protected carregarMensagensAnteriores(): void {
        const conversa = this.aberta();
        if (!conversa?.proximoCursor || conversa.carregandoMais) return;
        this.aberta.set({ ...conversa, carregandoMais: true });
        this.ler(conversa.conversaId, conversa.proximoCursor)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (resposta) => {
                    const atual = this.aberta();
                    if (!atual || atual.conversaId !== conversa.conversaId) return;
                    this.aberta.set({
                        ...atual,
                        mensagens: mesclarMensagens(atual.mensagens, resposta.dados!.mensagens.map((mensagem) => normalizarMensagem(mensagem))),
                        proximoCursor: resposta.dados!.proximoCursor,
                        carregandoMais: false,
                    });
                },
                error: () => {
                    const atual = this.aberta();
                    if (atual?.conversaId === conversa.conversaId) this.aberta.set({ ...atual, carregandoMais: false });
                },
            });
    }

    protected fechar(): void {
        this.aberta.set(null);
    }

    protected nomes(participantes: MensagemDiretaSupervisaoParticipanteDto[]): string {
        return participantes.map((participante) => participante.usuarioNome).join(' e ');
    }

    /** O título da linha e do cabeçalho da leitura: o nome do grupo ou os nomes das duas pessoas. */
    protected titulo(item: { titulo?: string; participantes: MensagemDiretaSupervisaoParticipanteDto[] }): string {
        return item.titulo ?? this.nomes(item.participantes);
    }

    protected nomeDoAutor(mensagem: MensagemNaConversa, participantes: MensagemDiretaSupervisaoParticipanteDto[]): string {
        const nomeDe = (usuarioId: number | null) => participantes.find((participante) => participante.usuarioId === usuarioId)?.usuarioNome ?? NOME_DE_USUARIO_REMOVIDO;
        // A resposta do `@IA` (task 315) diz para quem a IA respondeu; as propostas ficam com quem chamou (a supervisão só lê o texto).
        if (mensagem.autor === AutorMensagemDiretaEnum.IA) return rotuloDaRespostaDaIa(nomeDe(mensagem.chamadaPorUsuarioId));
        return nomeDe(mensagem.autorUsuarioId);
    }

    /** "A IA propôs 2 ações" na resposta do `@IA` (task 315): a supervisão não abre as propostas, que são de quem chamou a IA. */
    protected avisoDasPropostas(mensagem: MensagemNaConversa): string | null {
        const total = mensagem.propostaIds.length;
        if (mensagem.autor !== AutorMensagemDiretaEnum.IA || total === 0) return null;
        return total === 1 ? 'A IA propôs 1 ação.' : `A IA propôs ${total} ações.`;
    }

    protected previa(conversa: ItemDaSupervisao): string {
        return previaDaMensagem(conversa.ultimaMensagem.texto, conversa.ultimaMensagem.contemCodigo, false, conversa.ultimaMensagem.autor === AutorMensagemDiretaEnum.IA);
    }

    protected quando(conversa: ItemDaSupervisao): string {
        return rotuloDaLista(new Date(conversa.ultimaMensagem.createdDate), new Date());
    }

    protected hora(data: Date): string {
        return formatarHora(data);
    }

    private falhouAoAbrir(conversaId: string, erro: unknown): void {
        const atual = this.aberta();
        if (!atual || atual.conversaId !== conversaId) return;
        const privada = erro instanceof HttpErrorResponse && erro.status === 403;
        this.aberta.set({ ...atual, carregando: false, erro: privada ? 'PRIVADA' : 'GERAL' });
    }
}
