import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AutorMensagemDiretaEnum, CitacaoMensagemDto, COMANDO_DE_RESUMO, EstadoIaEnum, ReferenciaMensagemDiretaEnum, TipoUsuarioEnum, chamadaDaIa, grupoEhCanal, pedidoPendenteDaIa, podeEditarMensagemDireta, trechoDaMensagemDireta } from '@project20/shared';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ContextMenu } from 'primeng/contextmenu';
import { Menu } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AvatarGrupoComponent } from '../../../../shared/components/avatar-grupo/avatar-grupo.component';
import { TEMPO_DO_COPIADO_MS } from '../../../../shared/components/markdown-bloco-codigo/markdown-bloco-codigo.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaReferenciaService } from '../../services/mensagem-direta-referencia.service';
import { EnvioDoCompositor } from '../../services/mensagem-direta-estado.service';
import { EdicaoEmPreparo } from '../../utils/compositor.util';
import { coresDosMembros, nomeDoAutorNoGrupo, rotuloDosMembros } from '../../utils/grupo.util';
import { DESTAQUES_DA_IA, ICONES_DOS_DESTAQUES_DA_IA, agruparPorDia, formatarHora, marcarEmendas, MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaGrupoBuscaComponent } from '../mensagem-direta-grupo-busca/mensagem-direta-grupo-busca.component';
import { MensagemDiretaGrupoFixadasComponent } from '../mensagem-direta-grupo-fixadas/mensagem-direta-grupo-fixadas.component';
import { MensagemDiretaGrupoResumoComponent } from '../mensagem-direta-grupo-resumo/mensagem-direta-grupo-resumo.component';
import { MensagemDiretaCompositorComponent } from '../mensagem-direta-compositor/mensagem-direta-compositor.component';
import { MensagemDiretaEmojiSeletorComponent } from '../mensagem-direta-emoji-seletor/mensagem-direta-emoji-seletor.component';
import { MensagemDiretaIaRespostaComponent } from '../mensagem-direta-ia-resposta/mensagem-direta-ia-resposta.component';
import { MensagemDiretaReacoesComponent } from '../mensagem-direta-reacoes/mensagem-direta-reacoes.component';
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
/** De quanto em quanto tempo a dica do `@IA` sozinho confere se o prazo do pedido acabou. */
const INTERVALO_DO_RELOGIO_DA_IA_MS = 30_000;

/**
 * A conversa de um grupo no popup (task 247). Parte da conversa um a um (mesmos balões, compositor, citação e rolagem), com o que é de grupo: o nome de quem
 * escreveu em cada sequência, o avatar e o número de membros no cabeçalho, o menu do grupo (membros, silêncio, sair), `@todos` e nenhum indicador de leitura por
 * pessoa. Editar, reagir e o `@IA` (task 326) funcionam como na conversa um a um. Fica em componente próprio, e não como ramo do componente da conversa um a um, para esse não ganhar mais
 * responsabilidade; os estilos são os da conversa (`styleUrls`), para os dois parecerem o mesmo chat.
 */
@Component({
    selector: 'app-mensagem-direta-grupo-conversa',
    standalone: true,
    imports: [ButtonModule, ContextMenu, Menu, SkeletonModule, TooltipModule, MarkdownVisualizadorComponent, AvatarGrupoComponent, MensagemDiretaReacoesComponent, MensagemDiretaEmojiSeletorComponent, MensagemDiretaIaRespostaComponent, MensagemDiretaGrupoBuscaComponent, MensagemDiretaGrupoFixadasComponent, MensagemDiretaGrupoResumoComponent, MensagemDiretaCompositorComponent, MensagemDiretaReferenciaCartaoComponent],
    templateUrl: './mensagem-direta-grupo-conversa.component.html',
    styleUrls: ['../mensagem-direta-conversa/mensagem-direta-conversa.component.scss', './mensagem-direta-grupo-conversa.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoConversaComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);
    protected readonly grupoEstado = this.estado.grupoEstado;
    private readonly sessao = inject(UsuarioSessaoService);
    private readonly referencias = inject(MensagemDiretaReferenciaService);
    private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
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
    /** O grupo é o chat de uma demanda ou de um projeto (task 248): nome e membros acompanham o alvo, sem sair, renomear nem adicionar. */
    protected readonly ehCanal = computed(() => {
        const grupo = this.grupo();
        return !!grupo && grupoEhCanal(grupo.tipo);
    });
    /** Gestor ou administrador lendo o canal por tipo, sem ser membro: a leitura é auditada e os membros são avisados; ao escrever, ele entra. */
    protected readonly lendoPorTipo = computed(() => this.grupo()?.leituraPorSupervisao ?? false);
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
    /** O diálogo de resumo com a IA (task 249), aberto pelo comando `/resumir` ou pelo menu do grupo. */
    protected readonly resumoAberto = signal(false);
    /** A busca dentro do grupo (task 250), aberta pela lupa do cabeçalho; cobre a área das mensagens. */
    protected readonly buscaAberta = signal(false);
    protected readonly fixadas = this.grupoEstado.fixadas;
    private readonly idsDasFixadas = computed(() => new Set(this.fixadas().map((fixada) => fixada.mensagem.mensagemId)));
    protected readonly papelDoLeitor = computed(() => (this.sessao.usuarioAtual()?.tipo === TipoUsuarioEnum.ADMINISTRADOR ? 'administrador' : 'gestor'));

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

    /** O `@IA` só é oferecido no compositor com a IA no ar (task 326); o servidor confere de novo e avisa no grupo se ela não puder responder. */
    protected readonly iaDisponivel = computed(() => this.iaDisponibilidade.estadoReal() === EstadoIaEnum.NO_AR);
    /** A IA está respondendo a um `@IA` deste grupo: os membros veem "IA digitando…". */
    protected readonly iaRespondendo = computed(() => {
        const aberto = this.aberto();
        return aberto ? this.estado.iaDigitando().has(aberto.conversaId) : false;
    });
    /** O relógio da dica do `@IA` sozinho: o prazo do pedido acaba sem nenhuma mensagem nova chegar. */
    private readonly relogioDaIa = signal(Date.now());
    /** O usuário mandou só `@IA` há menos de 10 minutos: a próxima mensagem dele é o pedido (a mesma regra do servidor, no `shared`). */
    protected readonly aguardandoPedidoDaIa = computed(() => {
        const aberto = this.aberto();
        const meuId = this.sessao.id();
        if (!aberto || meuId === undefined || this.iaRespondendo()) return false;
        const enviadas = aberto.mensagens.filter((mensagem) => mensagem.situacao === 'ENVIADA');
        // A regra recusa idade negativa, e o relógio só bate a cada 30 s (e a data do servidor chega alguns milissegundos depois da local): o "agora" nunca fica
        // antes da mensagem mais recente, senão o `@IA` recém-enviado só teria a dica na próxima batida.
        const maisRecente = enviadas.reduce((maior, mensagem) => Math.max(maior, mensagem.createdDate.getTime()), 0);
        return pedidoPendenteDaIa(enviadas, meuId, new Date(Math.max(this.relogioDaIa(), maisRecente)));
    });
    /** O ícone da IA antes do `@IA` destacado: o `@IA` parece uma menção de pessoa, com o ícone na frente. */
    protected readonly iconesDosDestaques = ICONES_DOS_DESTAQUES_DA_IA;
    /** A mensagem cuja faixa de reações está aberta e a que está escolhendo o emoji no seletor completo; no máximo uma de cada. */
    protected readonly reagindoId = signal<string | null>(null);
    protected readonly seletorDaReacaoId = signal<string | null>(null);
    protected readonly nomeDeQuemReagiu = (usuarioId: number): string => this.nomeDoAutor(usuarioId);
    /** A mensagem própria em edição, no formato do compositor: o texto, as menções e as referências com o nome que o texto traz. */
    protected readonly edicaoEmPreparo = computed<EdicaoEmPreparo | null>(() => {
        const editando = this.grupoEstado.editando();
        if (!editando) return null;
        const referencias = editando.referencias.flatMap((referencia) => {
            const nome = this.nomesDasReferencias().get(`${referencia.tipo}:${referencia.id}`);
            return nome ? [{ ...referencia, nome }] : [];
        });
        return { mensagemId: editando.mensagemId, texto: editando.texto, mencoes: editando.mencoes, referencias };
    });

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

    /** O menu do cabeçalho do grupo: membros, silêncio e sair. O chat da demanda ou do projeto não tem saída (e quem só o lê por tipo não silencia). */
    protected readonly itensDoGrupo = computed<MenuItem[]>(() => [
        { label: this.ehCanal() ? 'Membros' : 'Membros e detalhes', icon: 'pi pi-users', command: () => this.estado.abrirDetalhesDoGrupo() },
        ...(this.lendoPorTipo() ? [] : [{ label: 'Resumir com IA', icon: 'pi pi-sparkles', command: () => this.resumoAberto.set(true) }]),
        ...(this.lendoPorTipo()
            ? []
            : [
                {
                    label: this.silenciado() ? 'Reativar avisos' : 'Silenciar avisos',
                    icon: this.silenciado() ? 'pi pi-bell' : 'pi pi-bell-slash',
                    command: () => this.alternarSilencio(),
                },
            ]),
        ...(this.ehCanal() ? [] : [{ separator: true }, { label: 'Sair do grupo', icon: 'pi pi-sign-out', command: () => this.estado.abrirDetalhesDoGrupo(true) }]),
    ]);

    constructor() {
        effect(() => {
            this.grupoAbertoId();
            this.buscaAberta.set(false);
            this.menuAcoes()?.hide();
            this.mensagemDoMenu.set(null);
            this.longeDoFim.set(false);
            this.reagindoId.set(null);
            this.seletorDaReacaoId.set(null);
        });
        effect(() => {
            this.totalDeMensagens();
            setTimeout(() => this.ajustarRolagem(), 0);
        });
        effect(() => {
            if (this.quemDigita().length > 0 || this.iaRespondendo() || this.aguardandoPedidoDaIa()) setTimeout(() => this.acompanharOFim(), 0);
        });
        effect(() => {
            for (const mensagem of this.aberto()?.mensagens ?? []) {
                for (const referencia of mensagem.referencias) void this.guardarNomeDaReferencia(referencia.tipo, referencia.id);
            }
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
        // O `@IA` ganha o mesmo destaque da menção quando a mensagem chama a IA (a regra do servidor, no `shared`: fora de código).
        if (chamadaDaIa(mensagem.texto)) destaques.push(...DESTAQUES_DA_IA);
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

    /** A opção "Editar" só aparece na mensagem própria enviada, dentro do prazo de 1 hora (a mesma regra pura da service, que é quem decide de verdade). */
    protected podeEditar(mensagem: MensagemNaConversa): boolean {
        const meuId = this.sessao.id();
        return !this.lendoPorTipo() && meuId !== undefined && mensagem.situacao === 'ENVIADA' && podeEditarMensagemDireta({ ...mensagem, usuarioId: meuId, agora: new Date() });
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
        void this.grupoEstado.reagir(mensagemId, emoji);
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
            // Reagir, editar e fixar são de membro: quem só lê o canal por tipo não age (task 326).
            ...(this.lendoPorTipo() ? [] : [{ label: 'Reagir', icon: 'pi pi-face-smile', command: () => this.abrirReacao(mensagem.mensagemId) }]),
            ...(this.podeEditar(mensagem) ? [{ label: 'Editar', icon: 'pi pi-pencil', command: () => this.grupoEstado.editar(mensagem) }] : []),
            { label: 'Copiar texto', icon: 'pi pi-copy', command: () => void this.copiar(mensagem.mensagemId, mensagem.texto) },
            // Fixar é de membro: quem só lê o canal por tipo não fixa (task 250).
            ...(this.lendoPorTipo()
                ? []
                : [
                    this.idsDasFixadas().has(mensagem.mensagemId)
                        ? { label: 'Desafixar mensagem', icon: 'pi pi-bookmark-fill', command: () => void this.alternarFixada(mensagem.mensagemId) }
                        : { label: 'Fixar mensagem', icon: 'pi pi-bookmark', command: () => void this.alternarFixada(mensagem.mensagemId) },
                ]),
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

    /** Fixa ou desafixa a mensagem; a recusa (o limite de fixadas, por exemplo) aparece como aviso. */
    protected async alternarFixada(mensagemId: string): Promise<void> {
        const aberto = this.aberto();
        if (!aberto) return;
        const motivo = await this.grupoEstado.alternarFixada(aberto.grupoId, mensagemId);
        if (motivo) this.messageService.add({ severity: 'warn', summary: 'Mensagem fixada', detail: motivo });
    }

    /** Clicou numa fixada ou num resultado da busca: fecha a busca e leva a conversa até a mensagem. */
    protected irParaMensagem(mensagemId: string): void {
        this.buscaAberta.set(false);
        void this.irParaOriginal(mensagemId);
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
        // Com uma mensagem em edição, enviar é salvar a edição (nada de mensagem nova).
        if (this.grupoEstado.editando()) {
            void this.grupoEstado.confirmarEdicao({ texto: envio.texto, mencoes: envio.mencoes, mencionaTodos: envio.mencionaTodos, referencias: envio.referencias });
            return;
        }
        // `/resumir` é um comando, não uma mensagem: abre o resumo e nada é enviado ao grupo (quem só lê por tipo não é membro e não resume).
        if (envio.texto.trim() === COMANDO_DE_RESUMO && !this.lendoPorTipo()) {
            this.resumoAberto.set(true);
            return;
        }
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
