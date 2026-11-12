import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AutorMensagemDiretaEnum, CitacaoMensagemDto, ReferenciaMensagemDiretaEnum, trechoDaMensagemDireta } from '@project20/shared';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ContextMenu } from 'primeng/contextmenu';
import { Menu } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AvatarGrupoComponent } from '../../../../shared/components/avatar-grupo/avatar-grupo.component';
import { TEMPO_DO_COPIADO_MS } from '../../../../shared/components/markdown-bloco-codigo/markdown-bloco-codigo.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaReferenciaService } from '../../services/mensagem-direta-referencia.service';
import { EnvioDoCompositor } from '../../services/mensagem-direta-estado.service';
import { coresDosMembros, nomeDoAutorNoGrupo, rotuloDosMembros } from '../../utils/grupo.util';
import { agruparPorDia, formatarHora, marcarEmendas, MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaCompositorComponent } from '../mensagem-direta-compositor/mensagem-direta-compositor.component';
import { MensagemDiretaReferenciaCartaoComponent } from '../mensagem-direta-referencia-cartao/mensagem-direta-referencia-cartao.component';

/** Distância do fim (px) até a qual a conversa continua acompanhando as mensagens que chegam. */
const MARGEM_DO_FIM_PX = 80;
/** Quanto o usuário precisa ter subido (px) para o botão "voltar ao atual" aparecer. */
const DISTANCIA_DO_BOTAO_PX = 200;
/** Distância do topo (px) a partir da qual se pede a página mais antiga. */
const MARGEM_DO_TOPO_PX = 40;
const PAGINAS_PARA_ACHAR_A_ORIGINAL = 5;
const TEMPO_DO_REALCE_MS = 1_500;
const TEMPO_DO_AVISO_MS = 4_000;
const AVISO_ORIGINAL_NAO_ACHADA = 'Mensagem antiga demais para localizar.';
/** Onde o duplo clique mantém o comportamento próprio (selecionar texto, abrir, copiar) em vez de responder. */
const SELETOR_DO_QUE_NAO_RESPONDE_COM_DOIS_CLIQUES = 'a, button, pre, code, app-mensagem-direta-referencia-cartao';

/**
 * A conversa de um grupo no popup (task 247). Parte da conversa um a um (mesmos balões, compositor, citação e rolagem), com o que é de grupo: o nome de quem
 * escreveu em cada sequência, o avatar e o número de membros no cabeçalho, o menu do grupo (membros, silêncio, sair), `@todos` e nenhum indicador de leitura por
 * pessoa. Não há edição nem reação em grupo. Fica em componente próprio, e não como ramo do componente da conversa um a um, para esse não ganhar mais
 * responsabilidade; os estilos são os da conversa (`styleUrls`), para os dois parecerem o mesmo chat.
 */
@Component({
    selector: 'app-mensagem-direta-grupo-conversa',
    standalone: true,
    imports: [ButtonModule, ContextMenu, Menu, SkeletonModule, TooltipModule, MarkdownVisualizadorComponent, AvatarGrupoComponent, MensagemDiretaCompositorComponent, MensagemDiretaReferenciaCartaoComponent],
    templateUrl: './mensagem-direta-grupo-conversa.component.html',
    styleUrls: ['../mensagem-direta-conversa/mensagem-direta-conversa.component.scss', './mensagem-direta-grupo-conversa.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoConversaComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);
    protected readonly grupoEstado = this.estado.grupoEstado;
    private readonly sessao = inject(UsuarioSessaoService);
    private readonly referencias = inject(MensagemDiretaReferenciaService);
    private readonly messageService = inject(MessageService);
    private readonly rolagem = viewChild<ElementRef<HTMLElement>>('rolagem');
    private readonly menuAcoes = viewChild<ContextMenu>('menuAcoes');
    protected readonly itensMenu = signal<MenuItem[]>([]);
    protected readonly mensagemDoMenu = signal<string | null>(null);

    protected readonly aberto = this.grupoEstado.grupoAberto;
    protected readonly grupo = this.grupoEstado.grupoAbertoNaLista;
    protected readonly meuId = this.sessao.id;
    protected readonly membros = computed(() => this.grupo()?.membros ?? []);
    protected readonly coresDosMembros = computed(() => coresDosMembros(this.membros()));
    protected readonly rotuloDosMembros = computed(() => rotuloDosMembros(this.membros().length));

    /** Os outros membros, que o `@` oferece (o servidor só aceita membros atuais). */
    protected readonly pessoasMencionaveis = computed(() =>
        this.membros()
            .filter((membro) => membro.usuarioId !== this.meuId())
            .map((membro) => ({ usuarioId: membro.usuarioId, nome: membro.usuarioNome, corAvatar: membro.corAvatar })),
    );
    /** Quem está digitando agora (primeiro nome); vazio = ninguém. */
    protected readonly quemDigita = computed(() => {
        const aberto = this.aberto();
        if (!aberto) return [] as string[];
        const ids = this.grupoEstado.digitando().get(aberto.conversaId);
        if (!ids) return [];
        return [...ids].map((usuarioId) => nomeDoAutorNoGrupo(this.membros(), usuarioId, this.meuId()).split(' ')[0]);
    });
    protected readonly rotuloDoDigitando = computed(() => {
        const nomes = this.quemDigita();
        if (nomes.length === 0) return '';
        return nomes.length === 1 ? `${nomes[0]} digitando` : `${nomes.length} pessoas digitando`;
    });
    protected readonly silenciado = computed(() => this.grupo()?.silenciada ?? false);

    protected readonly emendas = computed(() => marcarEmendas(this.aberto()?.mensagens ?? []));
    protected readonly dias = computed(() => agruparPorDia(this.aberto()?.mensagens ?? [], new Date()));
    protected readonly ultimaMinhaId = computed(() => {
        const aberto = this.aberto();
        const meuId = this.meuId();
        if (!aberto || meuId === undefined) return null;
        return [...aberto.mensagens].reverse().find((mensagem) => mensagem.autorUsuarioId === meuId && mensagem.situacao === 'ENVIADA')?.mensagemId ?? null;
    });
    /** Só muda quando se abre OUTRO grupo: o compositor foca o campo por ele. */
    protected readonly grupoAbertoId = computed(() => this.aberto()?.grupoId ?? null);
    private readonly totalDeMensagens = computed(() => this.aberto()?.mensagens.length ?? 0);
    private readonly nomesDasReferencias = signal<ReadonlyMap<string, string>>(new Map());

    protected readonly respostaEmPreparo = computed(() => {
        const respondida = this.grupoEstado.respondendoA();
        if (!respondida || respondida.autorUsuarioId === null) return null;
        return { nome: this.nomeDoAutor(respondida.autorUsuarioId), trecho: trechoDaMensagemDireta(respondida.texto) };
    });
    protected readonly destacadaId = signal<string | null>(null);
    protected readonly avisoDaOriginal = signal<string | null>(null);
    protected readonly copiadaId = signal<string | null>(null);
    protected readonly longeDoFim = signal(false);
    private temporizadorDoRealce: ReturnType<typeof setTimeout> | null = null;
    private temporizadorDoAviso: ReturnType<typeof setTimeout> | null = null;
    private temporizadorDoCopiado: ReturnType<typeof setTimeout> | null = null;
    private colarNoFim = true;
    private alturaAntes: number | null = null;
    private topoAntes = 0;
    private totalAntes = 0;
    private totalVisto = 0;

    /** O menu do cabeçalho do grupo: membros, silêncio e sair. */
    protected readonly itensDoGrupo = computed<MenuItem[]>(() => [
        { label: 'Membros e detalhes', icon: 'pi pi-users', command: () => this.estado.abrirDetalhesDoGrupo() },
        {
            label: this.silenciado() ? 'Reativar avisos' : 'Silenciar avisos',
            icon: this.silenciado() ? 'pi pi-bell' : 'pi pi-bell-slash',
            command: () => this.alternarSilencio(),
        },
        { separator: true },
        { label: 'Sair do grupo', icon: 'pi pi-sign-out', command: () => this.estado.abrirDetalhesDoGrupo(true) },
    ]);

    constructor() {
        effect(() => {
            this.grupoAbertoId();
            this.menuAcoes()?.hide();
            this.mensagemDoMenu.set(null);
            this.longeDoFim.set(false);
        });
        effect(() => {
            this.totalDeMensagens();
            setTimeout(() => this.ajustarRolagem(), 0);
        });
        effect(() => {
            if (this.quemDigita().length > 0) setTimeout(() => this.acompanharOFim(), 0);
        });
        effect(() => {
            for (const mensagem of this.aberto()?.mensagens ?? []) {
                for (const referencia of mensagem.referencias) void this.guardarNomeDaReferencia(referencia.tipo, referencia.id);
            }
        });
        inject(DestroyRef).onDestroy(() => {
            if (this.temporizadorDoCopiado) clearTimeout(this.temporizadorDoCopiado);
            if (this.temporizadorDoRealce) clearTimeout(this.temporizadorDoRealce);
            if (this.temporizadorDoAviso) clearTimeout(this.temporizadorDoAviso);
        });
    }

    /** `@Nome` das pessoas mencionadas, `@todos` e `#Nome` das referências: o que o texto mostra com destaque. */
    protected destaquesDe(mensagem: { texto: string; mencoes: number[]; referencias: { tipo: ReferenciaMensagemDiretaEnum; id: number }[] }): string[] {
        const destaques: string[] = [];
        for (const usuarioId of mensagem.mencoes) {
            const membro = this.membros().find((item) => item.usuarioId === usuarioId);
            const nome = usuarioId === this.meuId() ? this.sessao.nomeCompleto() : membro?.usuarioNome;
            if (nome) destaques.push(`@${nome}`);
        }
        if (/@todos(?![\p{L}\p{N}_])/iu.test(mensagem.texto)) destaques.push('@todos');
        for (const referencia of mensagem.referencias) {
            const nome = this.nomesDasReferencias().get(`${referencia.tipo}:${referencia.id}`);
            if (nome) destaques.push(`#${nome}`);
        }
        return destaques;
    }

    private async guardarNomeDaReferencia(tipo: ReferenciaMensagemDiretaEnum, id: number): Promise<void> {
        const chave = `${tipo}:${id}`;
        if (this.nomesDasReferencias().has(chave)) return;
        const dados = await this.referencias.recuperar(tipo, id);
        if (!dados?.acessivel || !dados.nome) return;
        this.nomesDasReferencias.update((atuais) => new Map(atuais).set(chave, dados.nome as string));
    }

    /** Quem escreveu: "Você" ou o nome do membro (que já saiu: "Usuário removido"). */
    protected nomeDoAutor(autorUsuarioId: number | null): string {
        return nomeDoAutorNoGrupo(this.membros(), autorUsuarioId, this.meuId());
    }

    /** A cor do nome do autor, a da bolinha dele; sem cor escolhida, a cor de acento do tema. */
    protected corDoAutor(autorUsuarioId: number | null): string | null {
        return this.membros().find((membro) => membro.usuarioId === autorUsuarioId)?.corAvatar ?? null;
    }

    protected nomeDaCitacao(citacao: CitacaoMensagemDto): string {
        return this.nomeDoAutor(citacao.autorUsuarioId);
    }

    /** O nome do autor só aparece no começo de cada sequência de mensagens de uma pessoa, e nunca nas minhas. */
    protected mostraAutor(mensagem: MensagemNaConversa): boolean {
        return mensagem.autorUsuarioId !== this.meuId() && !this.emendas().get(mensagem.mensagemId)?.comAnterior;
    }

    protected abrirMenu(evento: MouseEvent, mensagem: MensagemNaConversa, peloBotao = false): void {
        if (mensagem.situacao !== 'ENVIADA' || mensagem.autor !== AutorMensagemDiretaEnum.USUARIO) return;
        evento.preventDefault();
        evento.stopPropagation();
        if (peloBotao && this.mensagemDoMenu() === mensagem.mensagemId) {
            this.menuAcoes()?.hide();
            return;
        }
        this.mensagemDoMenu.set(mensagem.mensagemId);
        this.itensMenu.set([
            { label: 'Responder', icon: 'pi pi-reply', command: () => this.grupoEstado.responder(mensagem) },
            { label: 'Copiar texto', icon: 'pi pi-copy', command: () => void this.copiar(mensagem.mensagemId, mensagem.texto) },
        ]);
        const botao = peloBotao ? (evento.currentTarget as HTMLElement) : null;
        const limites = botao?.getBoundingClientRect();
        const janela = botao?.ownerDocument.defaultView;
        this.menuAcoes()?.show(
            limites
                ? {
                    pageX: limites.left + (janela?.scrollX ?? 0),
                    pageY: limites.bottom + (janela?.scrollY ?? 0),
                    preventDefault: () => evento.preventDefault(),
                    stopPropagation: () => evento.stopPropagation(),
                }
                : evento,
        );
    }

    /** Dois cliques no balão respondem à mensagem (como na conversa um a um). */
    protected aoDarDoisCliques(evento: MouseEvent, mensagem: MensagemNaConversa): void {
        if (mensagem.situacao !== 'ENVIADA' || mensagem.autor !== AutorMensagemDiretaEnum.USUARIO) return;
        const alvo = evento.target instanceof Element ? evento.target : null;
        if (alvo?.closest(SELETOR_DO_QUE_NAO_RESPONDE_COM_DOIS_CLIQUES)) return;
        evento.preventDefault();
        alvo?.ownerDocument.defaultView?.getSelection()?.removeAllRanges();
        this.grupoEstado.responder(mensagem);
    }

    protected async copiar(mensagemId: string, texto: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(texto);
        } catch {
            this.messageService.add({ severity: 'warn', summary: 'Mensagem', detail: 'Não foi possível copiar a mensagem' });
            return;
        }
        this.copiadaId.set(mensagemId);
        if (this.temporizadorDoCopiado) clearTimeout(this.temporizadorDoCopiado);
        this.temporizadorDoCopiado = setTimeout(() => this.copiadaId.set(null), TEMPO_DO_COPIADO_MS);
    }

    protected alternarSilencio(): void {
        const aberto = this.aberto();
        if (aberto) void this.grupoEstado.alternarSilencio(aberto.grupoId);
    }

    protected async irParaOriginal(mensagemId: string): Promise<void> {
        this.avisoDaOriginal.set(null);
        for (let paginas = 0; ; paginas++) {
            const aberto = this.aberto();
            if (!aberto) return;
            if (aberto.mensagens.some((mensagem) => mensagem.mensagemId === mensagemId)) {
                await new Promise((resolver) => setTimeout(resolver, 50));
                const alvo = this.rolagem()?.nativeElement.querySelector<HTMLElement>(`[data-mensagem-id="${mensagemId}"]`);
                if (!alvo) break;
                this.colarNoFim = false;
                alvo.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
                this.destacadaId.set(mensagemId);
                if (this.temporizadorDoRealce) clearTimeout(this.temporizadorDoRealce);
                this.temporizadorDoRealce = setTimeout(() => this.destacadaId.set(null), TEMPO_DO_REALCE_MS);
                return;
            }
            if (!aberto.proximoCursor || paginas >= PAGINAS_PARA_ACHAR_A_ORIGINAL) break;
            this.colarNoFim = false;
            await this.grupoEstado.carregarMais();
        }
        this.avisoDaOriginal.set(AVISO_ORIGINAL_NAO_ACHADA);
        if (this.temporizadorDoAviso) clearTimeout(this.temporizadorDoAviso);
        this.temporizadorDoAviso = setTimeout(() => this.avisoDaOriginal.set(null), TEMPO_DO_AVISO_MS);
    }

    protected voltar(): void {
        this.estado.voltarParaALista();
    }

    protected hora(data: Date): string {
        return formatarHora(data);
    }

    protected aoRolar(): void {
        const elemento = this.rolagem()?.nativeElement;
        if (!elemento) return;
        const distanciaDoFim = elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight;
        this.colarNoFim = distanciaDoFim < MARGEM_DO_FIM_PX;
        this.longeDoFim.set(distanciaDoFim >= DISTANCIA_DO_BOTAO_PX);
        const aberto = this.aberto();
        if (elemento.scrollTop < MARGEM_DO_TOPO_PX && aberto?.proximoCursor && !aberto.carregandoMais && !aberto.carregando) {
            this.alturaAntes = elemento.scrollHeight;
            this.topoAntes = elemento.scrollTop;
            this.totalAntes = aberto.mensagens.length;
            void this.grupoEstado.carregarMais();
        }
    }

    private ajustarRolagem(): void {
        const elemento = this.rolagem()?.nativeElement;
        if (!elemento) return;
        const total = this.aberto()?.mensagens.length ?? 0;
        const cresceu = total > this.totalVisto;
        this.totalVisto = total;
        if (this.alturaAntes !== null) {
            if (total > this.totalAntes) {
                elemento.scrollTop = elemento.scrollHeight - this.alturaAntes + this.topoAntes;
                this.alturaAntes = null;
            } else if (!this.aberto()?.carregandoMais) {
                this.alturaAntes = null;
            }
            return;
        }
        if (this.colarNoFim && cresceu) elemento.scrollTop = elemento.scrollHeight;
    }

    protected irParaOAtual(): void {
        const elemento = this.rolagem()?.nativeElement;
        if (!elemento) return;
        this.colarNoFim = true;
        if (elemento.scrollTo) elemento.scrollTo({ top: elemento.scrollHeight, behavior: 'smooth' });
        else elemento.scrollTop = elemento.scrollHeight;
    }

    private acompanharOFim(): void {
        const elemento = this.rolagem()?.nativeElement;
        if (elemento && this.colarNoFim) elemento.scrollTop = elemento.scrollHeight;
    }

    /** O rodapé (horário e estado) só aparece na última mensagem da sequência, salvo quando carrega um estado que não pode sumir. */
    protected rodapeCompacto(mensagem: MensagemNaConversa): boolean {
        return !!this.emendas().get(mensagem.mensagemId)?.comProxima && mensagem.situacao === 'ENVIADA' && mensagem.mensagemId !== this.ultimaMinhaId();
    }

    protected aoDigitar(): void {
        const aberto = this.aberto();
        if (aberto) this.grupoEstado.avisarDigitacao(aberto.grupoId);
    }

    protected aoEnviar(envio: EnvioDoCompositor): void {
        this.colarNoFim = true;
        void this.estado.enviarAoGrupo({ texto: envio.texto, mencoes: envio.mencoes, mencionaTodos: envio.mencionaTodos, referencias: envio.referencias });
    }

    protected tentarDeNovo(mensagemId: string): void {
        void this.grupoEstado.tentarDeNovo(mensagemId);
    }

    protected excluir(mensagemId: string): void {
        this.grupoEstado.excluirLocal(mensagemId);
    }
}
