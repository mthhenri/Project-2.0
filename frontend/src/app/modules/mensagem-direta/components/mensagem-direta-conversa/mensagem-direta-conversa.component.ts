import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AutorMensagemDiretaEnum, CitacaoMensagemDto, EstadoIaEnum, ReferenciaMensagemDiretaEnum, chamadaDaIa, pedidoPendenteDaIa, podeEditarMensagemDireta, trechoDaMensagemDireta } from '@project20/shared';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ContextMenu } from 'primeng/contextmenu';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { TEMPO_DO_COPIADO_MS } from '../../../../shared/components/markdown-bloco-codigo/markdown-bloco-codigo.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { MensagemDiretaReferenciaService } from '../../services/mensagem-direta-referencia.service';
import { EnvioDoCompositor, MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { EdicaoEmPreparo } from '../../utils/compositor.util';
import { AVISO_DE_LEITURA_DAS_CONVERSAS, DESTAQUES_DA_IA, ICONES_DOS_DESTAQUES_DA_IA, MensagemNaConversa, agruparPorDia, formatarHora, idDaUltimaLidaPelaOutraPessoa, marcarEmendas } from '../../utils/mensagem-direta.util';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';
import { MensagemDiretaCompositorComponent } from '../mensagem-direta-compositor/mensagem-direta-compositor.component';
import { MensagemDiretaEmojiSeletorComponent } from '../mensagem-direta-emoji-seletor/mensagem-direta-emoji-seletor.component';
import { MensagemDiretaIaRespostaComponent } from '../mensagem-direta-ia-resposta/mensagem-direta-ia-resposta.component';
import { MensagemDiretaReacoesComponent } from '../mensagem-direta-reacoes/mensagem-direta-reacoes.component';
import { MensagemDiretaReferenciaCartaoComponent } from '../mensagem-direta-referencia-cartao/mensagem-direta-referencia-cartao.component';

/** Distância do fim (px) até a qual a conversa continua acompanhando as mensagens que chegam. */
const MARGEM_DO_FIM_PX = 80;
/** Quanto o usuário precisa ter subido (px) para o botão "voltar ao atual" aparecer. */
const DISTANCIA_DO_BOTAO_PX = 200;
/** Quantas páginas mais antigas a citação carrega, no máximo, ao procurar a mensagem original (task 220). */
const PAGINAS_PARA_ACHAR_A_ORIGINAL = 5;
/** Quanto tempo a mensagem original fica realçada depois de a citação levar até ela. */
const TEMPO_DO_REALCE_MS = 1_500;
const TEMPO_DO_AVISO_MS = 4_000;
const AVISO_ORIGINAL_NAO_ACHADA = 'Mensagem antiga demais para localizar.';
/** Onde o duplo clique mantém o comportamento próprio (selecionar texto, abrir, copiar) em vez de responder. */
const SELETOR_DO_QUE_NAO_RESPONDE_COM_DOIS_CLIQUES = 'a, button, pre, code, app-mensagem-direta-referencia-cartao';
const NOME_DE_USUARIO_REMOVIDO = 'Usuário removido';
/** Distância do topo (px) a partir da qual se pede a página mais antiga. */
const MARGEM_DO_TOPO_PX = 40;
/** De quanto em quanto tempo a dica do `@IA` sozinho (task 315) confere se o prazo do pedido acabou. */
const INTERVALO_DO_RELOGIO_DA_IA_MS = 30_000;

/** A conversa com uma pessoa no popup (mockups 1 e 9): balões, "Enviada"/"Lida", falha com reenvio e o campo de mensagem. */
@Component({
    selector: 'app-mensagem-direta-conversa',
    standalone: true,
    imports: [ButtonModule, ContextMenu, SkeletonModule, TooltipModule, MarkdownVisualizadorComponent, AvatarUsuarioComponent, MensagemDiretaCompositorComponent, MensagemDiretaReferenciaCartaoComponent, MensagemDiretaReacoesComponent, MensagemDiretaEmojiSeletorComponent, MensagemDiretaIaRespostaComponent],
    templateUrl: './mensagem-direta-conversa.component.html',
    styleUrl: './mensagem-direta-conversa.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaConversaComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);
    protected readonly avisoDeLeitura = AVISO_DE_LEITURA_DAS_CONVERSAS;
    private readonly sessao = inject(UsuarioSessaoService);
    private readonly referencias = inject(MensagemDiretaReferenciaService);
    private readonly messageService = inject(MessageService);
    private readonly rolagem = viewChild<ElementRef<HTMLElement>>('rolagem');
    private readonly menuAcoes = viewChild<ContextMenu>('menuAcoes');
    protected readonly itensMenu = signal<MenuItem[]>([]);
    protected readonly mensagemDoMenu = signal<string | null>(null);

    protected readonly aberta = this.estado.conversaAberta;
    protected readonly meuId = this.sessao.id;
    /** Só a outra pessoa da conversa pode ser mencionada (a regra do servidor: quem não lê a conversa não é avisado dela). */
    protected readonly pessoasMencionaveis = computed(() => {
        const aberta = this.aberta();
        return aberta ? [{ usuarioId: aberta.usuarioId, nome: aberta.usuarioNome, corAvatar: this.estado.corDe(aberta.usuarioId) }] : [];
    });
    protected readonly estaDigitando = computed(() => {
        const aberta = this.aberta();
        return aberta ? this.estado.digitando().has(aberta.usuarioId) : false;
    });
    private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
    /** O `@IA` só é oferecido no compositor com a IA no ar (task 315); o servidor confere de novo e avisa na conversa se ela não puder responder. */
    protected readonly iaDisponivel = computed(() => this.iaDisponibilidade.estadoReal() === EstadoIaEnum.NO_AR);
    /** A IA está respondendo a um `@IA` desta conversa (task 315): as duas pessoas veem "IA digitando…". */
    protected readonly iaRespondendo = computed(() => {
        const aberta = this.aberta();
        return aberta ? this.estado.iaDigitando().has(aberta.conversaId) : false;
    });
    /** O relógio da dica do `@IA` sozinho: o prazo do pedido acaba sem nenhuma mensagem nova chegar. */
    private readonly relogioDaIa = signal(Date.now());
    /** O usuário mandou só `@IA` há menos de 10 minutos: a próxima mensagem dele é o pedido (a mesma regra do servidor, no `shared`). */
    protected readonly aguardandoPedidoDaIa = computed(() => {
        const aberta = this.aberta();
        const meuId = this.sessao.id();
        if (!aberta || meuId === undefined || this.iaRespondendo()) return false;
        const enviadas = aberta.mensagens.filter((mensagem) => mensagem.situacao === 'ENVIADA');
        // A regra recusa idade negativa, e o relógio só bate a cada 30 s (e a data do servidor chega alguns milissegundos depois da local): o "agora" nunca fica
        // antes da mensagem mais recente, senão o `@IA` recém-enviado só teria a dica na próxima batida (P-088).
        const maisRecente = enviadas.reduce((maior, mensagem) => Math.max(maior, mensagem.createdDate.getTime()), 0);
        return pedidoPendenteDaIa(enviadas, meuId, new Date(Math.max(this.relogioDaIa(), maisRecente)));
    });
    protected readonly estaOnline = computed(() => {
        const aberta = this.aberta();
        return aberta ? this.estado.online().has(aberta.usuarioId) : false;
    });

    protected readonly emendas = computed(() => marcarEmendas(this.aberta()?.mensagens ?? []));
    protected readonly grupos = computed(() => agruparPorDia(this.aberta()?.mensagens ?? [], new Date()));
    protected readonly lidaId = computed(() => {
        const aberta = this.aberta();
        const meuId = this.sessao.id();
        return aberta && meuId !== undefined ? idDaUltimaLidaPelaOutraPessoa(aberta.mensagens, meuId, aberta.lidaPeloOutroAte) : null;
    });
    protected readonly ultimaMinhaId = computed(() => {
        const aberta = this.aberta();
        const meuId = this.sessao.id();
        if (!aberta || meuId === undefined) return null;
        return [...aberta.mensagens].reverse().find((mensagem) => mensagem.autorUsuarioId === meuId && mensagem.situacao === 'ENVIADA')?.mensagemId ?? null;
    });

    /** Só muda quando se abre OUTRA pessoa: o compositor foca o campo por ela, e o foco não pode voltar a cada mensagem, leitura ou releitura. */
    protected readonly pessoaAberta = computed(() => this.aberta()?.usuarioId ?? null);
    private readonly totalDeMensagens = computed(() => this.aberta()?.mensagens.length ?? 0);

    /** Nome de cada demanda/atividade citada (`TIPO:id`), conforme chega do servidor; só as acessíveis têm nome. */
    private readonly nomesDasReferencias = signal<ReadonlyMap<string, string>>(new Map());

    /** A mensagem a que o compositor está respondendo, no formato da barra "Respondendo a…". */
    protected readonly respostaEmPreparo = computed(() => {
        const respondida = this.estado.respondendoA();
        if (!respondida || respondida.autorUsuarioId === null) return null;
        return { nome: this.nomeDoAutor(respondida.autorUsuarioId), trecho: trechoDaMensagemDireta(respondida.texto) };
    });
    /** A mensagem própria em edição, no formato do compositor (task 313): o texto, as menções e as referências com o nome que o texto traz. */
    protected readonly edicaoEmPreparo = computed<EdicaoEmPreparo | null>(() => {
        const editando = this.estado.editando();
        if (!editando) return null;
        const referencias = editando.referencias.flatMap((referencia) => {
            const nome = this.nomesDasReferencias().get(`${referencia.tipo}:${referencia.id}`);
            return nome ? [{ ...referencia, nome }] : [];
        });
        return { mensagemId: editando.mensagemId, texto: editando.texto, mencoes: editando.mencoes, referencias };
    });
    /** A mensagem realçada depois de a citação levar até ela, e o aviso quando ela não foi achada. */
    protected readonly destacadaId = signal<string | null>(null);
    protected readonly avisoDaOriginal = signal<string | null>(null);
    private temporizadorDoRealce: ReturnType<typeof setTimeout> | null = null;
    private temporizadorDoAviso: ReturnType<typeof setTimeout> | null = null;

    /** A mensagem cujo texto acabou de ser copiado (o botão mostra "Copiado" por um instante). */
    protected readonly copiadaId = signal<string | null>(null);
    private temporizadorDoCopiado: ReturnType<typeof setTimeout> | null = null;

    private colarNoFim = true;
    /** O usuário subiu na conversa: mostra a setinha que leva de volta à mensagem mais recente. */
    protected readonly longeDoFim = signal(false);
    /** A mensagem cuja faixa de reações está aberta e a que está escolhendo o emoji no seletor completo (task 314); no máximo uma de cada. */
    protected readonly reagindoId = signal<string | null>(null);
    protected readonly seletorDaReacaoId = signal<string | null>(null);
    protected readonly nomeDeQuemReagiu = (usuarioId: number): string => this.nomeDoAutor(usuarioId);
    private alturaAntes: number | null = null;
    private topoAntes = 0;
    private totalAntes = 0;
    private totalVisto = 0;

    constructor() {
        effect(() => {
            this.pessoaAberta();
            this.menuAcoes()?.hide();
            this.mensagemDoMenu.set(null);
            this.longeDoFim.set(false);
            this.reagindoId.set(null);
            this.seletorDaReacaoId.set(null);
        });
        // Quando o NÚMERO de mensagens muda: acompanha o fim se o usuário está lá, ou mantém o ponto que ele lia quando chega uma página mais antiga.
        effect(() => {
            this.totalDeMensagens();
            setTimeout(() => this.ajustarRolagem(), 0);
        });

        // O balão de "digitando" ocupa o fim da conversa: quem lê o fim continua vendo-o sem rolar.
        effect(() => {
            if (this.estaDigitando() || this.iaRespondendo() || this.aguardandoPedidoDaIa()) setTimeout(() => this.acompanharOFim(), 0);
        });
        // A janela de chat do Project Desktop não passa pelo layout, que é quem lê o estado da IA: lê aqui se ninguém leu ainda.
        if (this.iaDisponibilidade.estadoReal() === null) this.iaDisponibilidade.carregar();
        // Fora da zona do Angular: um intervalo permanente não pode impedir a tela de ficar estável (o signal ainda atualiza a tela).
        const relogio = inject(NgZone).runOutsideAngular(() => setInterval(() => this.relogioDaIa.set(Date.now()), INTERVALO_DO_RELOGIO_DA_IA_MS));

        inject(DestroyRef).onDestroy(() => {
            clearInterval(relogio);
            if (this.temporizadorDoCopiado) clearTimeout(this.temporizadorDoCopiado);
            if (this.temporizadorDoRealce) clearTimeout(this.temporizadorDoRealce);
            if (this.temporizadorDoAviso) clearTimeout(this.temporizadorDoAviso);
        });

        // Os nomes das referências vêm da consulta dos cartões (guardada por sessão, então não repete a chamada).
        effect(() => {
            for (const mensagem of this.aberta()?.mensagens ?? []) {
                for (const referencia of mensagem.referencias) void this.guardarNomeDaReferencia(referencia.tipo, referencia.id);
            }
        });

    }

    /** `@Nome` das pessoas mencionadas e `#Nome` das referências da mensagem: o que o texto mostra com destaque. */
    /** O ícone da IA antes do `@IA` destacado (task 315): o `@IA` parece uma menção de pessoa, com o ícone na frente. */
    protected readonly iconesDosDestaques = ICONES_DOS_DESTAQUES_DA_IA;

    protected destaquesDe(mensagem: { texto: string; mencoes: number[]; referencias: { tipo: ReferenciaMensagemDiretaEnum; id: number }[] }): string[] {
        const aberta = this.aberta();
        const nomes = new Map<number, string>();
        if (aberta) nomes.set(aberta.usuarioId, aberta.usuarioNome);
        const meuId = this.sessao.id();
        const meuNome = this.sessao.nomeCompleto();
        if (meuId !== undefined && meuNome) nomes.set(meuId, meuNome);
        const destaques: string[] = [];
        for (const usuarioId of mensagem.mencoes) {
            const nome = nomes.get(usuarioId);
            if (nome) destaques.push(`@${nome}`);
        }
        for (const referencia of mensagem.referencias) {
            const nome = this.nomesDasReferencias().get(`${referencia.tipo}:${referencia.id}`);
            if (nome) destaques.push(`#${nome}`);
        }
        // O `@IA` (task 315) ganha o mesmo destaque da menção quando a mensagem chama a IA (a regra do servidor, no `shared`: fora de código).
        if (chamadaDaIa(mensagem.texto)) destaques.push(...DESTAQUES_DA_IA);
        return destaques;
    }

    /** A cor da bolinha de cada pessoa marcada, por `@Nome` (quem não escolheu cor fica de fora e usa a cor de acento). */
    protected coresDosDestaquesDe(mensagem: { mencoes: number[] }): Record<string, string> {
        const aberta = this.aberta();
        const cores: Record<string, string> = {};
        for (const usuarioId of mensagem.mencoes) {
            const eu = usuarioId === this.sessao.id();
            const nome = eu ? this.sessao.nomeCompleto() : aberta?.usuarioId === usuarioId ? aberta.usuarioNome : null;
            const cor = eu ? this.sessao.corAvatar() : this.estado.corDe(usuarioId);
            if (nome && cor) cores[`@${nome}`] = cor;
        }
        return cores;
    }

    private async guardarNomeDaReferencia(tipo: ReferenciaMensagemDiretaEnum, id: number): Promise<void> {
        const chave = `${tipo}:${id}`;
        if (this.nomesDasReferencias().has(chave)) return;
        const dados = await this.referencias.recuperar(tipo, id);
        if (!dados?.acessivel || !dados.nome) return;
        this.nomesDasReferencias.update((atuais) => new Map(atuais).set(chave, dados.nome as string));
    }

    /** A opção "Editar" só aparece na mensagem própria enviada, dentro do prazo de 1 hora (a mesma regra pura da service, que é quem decide de verdade). */
    protected podeEditar(mensagem: MensagemNaConversa): boolean {
        const meuId = this.sessao.id();
        return meuId !== undefined && mensagem.situacao === 'ENVIADA' && podeEditarMensagemDireta({ ...mensagem, usuarioId: meuId, agora: new Date() });
    }

    /** Menu da mensagem enviada: o botão direito e os três pontos oferecem as mesmas ações. */
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
            { label: 'Responder', icon: 'pi pi-reply', command: () => this.estado.responder(mensagem) },
            { label: 'Reagir', icon: 'pi pi-face-smile', command: () => this.abrirReacao(mensagem.mensagemId) },
            ...(this.podeEditar(mensagem) ? [{ label: 'Editar', icon: 'pi pi-pencil', command: () => this.estado.editar(mensagem) }] : []),
            { label: 'Copiar texto', icon: 'pi pi-copy', command: () => void this.copiar(mensagem.mensagemId, mensagem.texto) },
        ]);
        // Cliques de teclado têm coordenadas zero: ancorar o menu no botão também atende Enter/Espaço.
        const botao = peloBotao ? evento.currentTarget as HTMLElement : null;
        const limites = botao?.getBoundingClientRect();
        const janela = botao?.ownerDocument.defaultView;
        this.menuAcoes()?.show(limites ? {
            pageX: limites.left + (janela?.scrollX ?? 0),
            pageY: limites.bottom + (janela?.scrollY ?? 0),
            preventDefault: () => evento.preventDefault(),
            stopPropagation: () => evento.stopPropagation(),
        } : evento);
    }

    /**
     * Dois cliques no balão respondem à mensagem (como no WhatsApp). Ficam de fora o duplo clique em link, botão, código e cartão de referência (que
     * têm o seu uso próprio e onde o duplo clique seleciona texto) e a mensagem que ainda não foi enviada. O duplo clique selecionaria uma palavra:
     * a seleção é desfeita, porque o gesto aqui é o de responder.
     */
    protected aoDarDoisCliques(evento: MouseEvent, mensagem: MensagemNaConversa): void {
        if (mensagem.situacao !== 'ENVIADA' || mensagem.autor !== AutorMensagemDiretaEnum.USUARIO) return;
        const alvo = evento.target instanceof Element ? evento.target : null;
        if (alvo?.closest(SELETOR_DO_QUE_NAO_RESPONDE_COM_DOIS_CLIQUES)) return;
        evento.preventDefault();
        alvo?.ownerDocument.defaultView?.getSelection()?.removeAllRanges();
        this.estado.responder(mensagem);
    }

    /** Abre (ou fecha, se já estava aberta) a faixa de reações da mensagem. */
    protected abrirReacao(mensagemId: string): void {
        this.seletorDaReacaoId.set(null);
        this.reagindoId.set(this.reagindoId() === mensagemId ? null : mensagemId);
    }

    protected abrirSeletorDaReacao(mensagemId: string): void {
        this.reagindoId.set(null);
        this.seletorDaReacaoId.set(mensagemId);
    }

    /** Reage com o emoji escolhido (o mesmo da minha reação tira, outro troca) e fecha a faixa e o seletor. */
    protected reagir(mensagemId: string, emoji: string): void {
        this.reagindoId.set(null);
        this.seletorDaReacaoId.set(null);
        void this.estado.reagir(mensagemId, emoji);
    }

    /** Copia o texto da mensagem como foi escrito (o Markdown), inclusive blocos de código. */
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

    /** Quem escreveu: "Você", a outra pessoa da conversa ou, se nenhuma das duas, uma pessoa removida. */
    private nomeDoAutor(autorUsuarioId: number): string {
        if (autorUsuarioId === this.meuId()) return 'Você';
        const aberta = this.aberta();
        return aberta && autorUsuarioId === aberta.usuarioId ? aberta.usuarioNome : NOME_DE_USUARIO_REMOVIDO;
    }

    protected nomeDaCitacao(citacao: CitacaoMensagemDto): string {
        return this.nomeDoAutor(citacao.autorUsuarioId);
    }

    /**
   * Rola até a mensagem original de uma citação e a realça. Se ela ainda não está carregada, traz páginas mais antigas até achá-la (no máximo
   * `PAGINAS_PARA_ACHAR_A_ORIGINAL`); se não achar, avisa na própria conversa.
   */
    protected async irParaOriginal(mensagemId: string): Promise<void> {
        this.avisoDaOriginal.set(null);
        for (let paginas = 0; ; paginas++) {
            const aberta = this.aberta();
            if (!aberta) return;
            if (aberta.mensagens.some((mensagem) => mensagem.mensagemId === mensagemId)) {
                await this.esperarARenderizacao();
                const alvo = this.rolagem()?.nativeElement.querySelector<HTMLElement>(`[data-mensagem-id="${mensagemId}"]`);
                if (!alvo) break;
                this.colarNoFim = false;
                alvo.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
                this.realcar(mensagemId);
                return;
            }
            if (!aberta.proximoCursor || paginas >= PAGINAS_PARA_ACHAR_A_ORIGINAL) break;
            this.colarNoFim = false;
            await this.estado.carregarMais();
        }
        this.avisoDaOriginal.set(AVISO_ORIGINAL_NAO_ACHADA);
        if (this.temporizadorDoAviso) clearTimeout(this.temporizadorDoAviso);
        this.temporizadorDoAviso = setTimeout(() => this.avisoDaOriginal.set(null), TEMPO_DO_AVISO_MS);
    }

    private esperarARenderizacao(): Promise<void> {
        return new Promise((resolver) => setTimeout(resolver, 50));
    }

    private realcar(mensagemId: string): void {
        this.destacadaId.set(mensagemId);
        if (this.temporizadorDoRealce) clearTimeout(this.temporizadorDoRealce);
        this.temporizadorDoRealce = setTimeout(() => this.destacadaId.set(null), TEMPO_DO_REALCE_MS);
    }

    protected voltar(): void {
        this.estado.voltarParaALista();
    }

    protected hora(data: Date): string {
        return formatarHora(data);
    }

    protected aoRolar(): void {
        const elementoAtual = this.rolagem()?.nativeElement;
        if (!elementoAtual) return;
        const distanciaDoFim = elementoAtual.scrollHeight - elementoAtual.scrollTop - elementoAtual.clientHeight;
        this.colarNoFim = distanciaDoFim < MARGEM_DO_FIM_PX;
        this.longeDoFim.set(distanciaDoFim >= DISTANCIA_DO_BOTAO_PX);
        const aberta = this.aberta();
        if (elementoAtual.scrollTop < MARGEM_DO_TOPO_PX && aberta?.proximoCursor && !aberta.carregandoMais && !aberta.carregando) {
            this.alturaAntes = elementoAtual.scrollHeight;
            this.topoAntes = elementoAtual.scrollTop;
            this.totalAntes = aberta.mensagens.length;
            void this.estado.carregarMais();
        }
    }

    private ajustarRolagem(): void {
        const elemento = this.rolagem()?.nativeElement;
        if (!elemento) return;
        const total = this.aberta()?.mensagens.length ?? 0;
        const cresceu = total > this.totalVisto;
        this.totalVisto = total;
        if (this.alturaAntes !== null) {
            // Só vale como "chegou a página mais antiga" quando as mensagens aumentaram (o indicador de carregamento também muda a altura).
            if (total > this.totalAntes) {
                elemento.scrollTop = elemento.scrollHeight - this.alturaAntes + this.topoAntes;
                this.alturaAntes = null;
            } else if (!this.aberta()?.carregandoMais) {
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

    /** O rodapé (horário, "Lida", menu) só aparece na última mensagem da sequência, salvo quando carrega um estado que não pode sumir. */
    protected rodapeCompacto(mensagem: MensagemNaConversa): boolean {
        return !!this.emendas().get(mensagem.mensagemId)?.comProxima && mensagem.situacao === 'ENVIADA' && !mensagem.editadaDate && mensagem.mensagemId !== this.lidaId() && mensagem.mensagemId !== this.ultimaMinhaId();
    }

    protected aoDigitar(): void {
        const aberta = this.aberta();
        if (aberta) this.estado.avisarDigitacao(aberta.usuarioId);
    }

    protected aoEnviar(envio: EnvioDoCompositor): void {
        // Com uma mensagem em edição, enviar é salvar a edição (nada de mensagem nova).
        if (this.estado.editando()) {
            void this.estado.confirmarEdicao(envio);
            return;
        }
        this.colarNoFim = true;
        void this.estado.enviar(envio);
    }

    protected tentarDeNovo(mensagemId: string): void {
        void this.estado.tentarDeNovo(mensagemId);
    }

    protected excluir(mensagemId: string): void {
        this.estado.excluirLocal(mensagemId);
    }
}
