import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
    AutorMensagemDiretaEnum,
    VALIDADE_DO_IA_DIGITANDO_MS,
    MensagemDiretaEventoDto,
    MensagemDiretaPessoaResumoDto,
    ReacaoMensagemDiretaDto,
    ReferenciaMensagemDto,
    montarConversaDiretaId,
    podeEditarMensagemDireta,
    trechoDaMensagemDireta,
} from '@project20/shared';
import { ProjectDesktopService } from '../../../core/services/project-desktop.service';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import {
    ConversaNaLista,
    MensagemNaConversa,
    VALIDADE_DO_DIGITANDO_MS,
    aplicarEdicaoNaLista,
    aplicarMensagemNaLista,
    devePublicarDigitacao,
    dataDaUltimaDoOutro,
    gerarMensagemId,
    mesclarMensagens,
    normalizarConversa,
    normalizarMensagem,
    outraPessoaDaConversa,
    previaDaMensagem,
    totalNaoLidas,
    zerarNaoLidas,
} from '../utils/mensagem-direta.util';
import { pareceCodigo } from '../utils/compositor.util';
import { aplicarReacoesNaMensagem, textoDoAvisoDeReacao } from '../utils/reacoes.util';
import { MensagemDiretaAvisosService } from './mensagem-direta-avisos.service';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';
import { MensagemDiretaReferenciaService } from './mensagem-direta-referencia.service';
import { MensagemDiretaService } from './mensagem-direta.service';

const ESPERA_ATE_AVISAR_SEM_CONEXAO_MS = 2_500;

export type VisaoDoPopup = 'LISTA' | 'CONVERSA' | 'NOVA' | 'CONFIGURACOES';

/** A conversa aberta na tela com uma pessoa. */
export interface ConversaAberta {
    usuarioId: number;
    usuarioNome: string;
    conversaId: string;
    mensagens: MensagemNaConversa[];
    /** Até onde a OUTRA pessoa leu: é de onde sai o "Lida". */
    lidaPeloOutroAte: Date | null;
    proximoCursor: string | null;
    carregando: boolean;
    carregandoMais: boolean;
    erro: boolean;
}

/** O que o compositor entrega ao enviar: o texto e só as menções e referências que ainda estão nele. */
export interface EnvioDoCompositor {
    texto: string;
    mencoes: number[];
    referencias: ReferenciaMensagemDto[];
}

export interface ResultadoDaBusca {
    texto: string;
    mensagens: MensagemNaConversa[];
}

/**
 * O estado do chat entre colaboradores (task 210), compartilhado entre o botão do topbar e o popup: conversas, quem está online, a conversa aberta,
 * o envio (com mensagem otimista e reenvio pelo mesmo `mensagemId`) e a recuperação depois de uma queda do stream. Os componentes só leem os
 * Signals e chamam as ações; a regra que não depende de Angular está em `utils/mensagem-direta.util.ts`.
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaEstadoService {
    private readonly api = inject(MensagemDiretaService);
    private readonly stream = inject(MensagemDiretaEventosService);
    private readonly sessao = inject(UsuarioSessaoService);
    private readonly referencias = inject(MensagemDiretaReferenciaService);
    private readonly avisos = inject(MensagemDiretaAvisosService);
    private readonly desktop = inject(ProjectDesktopService);

    readonly aberto = signal(false);
    readonly visao = signal<VisaoDoPopup>('LISTA');
    private visaoAntesDasConfiguracoes: 'LISTA' | 'CONVERSA' = 'LISTA';

    readonly conversas = signal<ConversaNaLista[]>([]);
    readonly carregandoConversas = signal(false);
    readonly jaCarregouConversas = signal(false);
    readonly erroNasConversas = signal(false);

    readonly online = signal<ReadonlySet<number>>(new Set());
    readonly conexao = this.stream.conectado;
    /** Quem está digitando para o usuário agora (o "digitando…"). Cada aviso vale `VALIDADE_DO_DIGITANDO_MS`; mensagem da pessoa e queda do stream o apagam antes. */
    readonly digitando = signal<ReadonlySet<number>>(new Set());
    /** As conversas em que a IA está respondendo a um `@IA` (task 315): cada aviso vale `VALIDADE_DO_IA_DIGITANDO_MS`; a resposta (ou a mensagem do sistema da falha) e a queda do stream o apagam antes. */
    readonly iaDigitando = signal<ReadonlySet<string>>(new Set());

    readonly conversaAberta = signal<ConversaAberta | null>(null);
    /** A mensagem a que o próximo envio responde (task 220): vale para a conversa aberta, sai ao enviar, cancelar ou abrir outra conversa. */
    readonly respondendoA = signal<MensagemNaConversa | null>(null);
    /** A mensagem própria que o compositor está editando (task 313): vale para a conversa aberta, sai ao salvar, cancelar ou abrir outra conversa. */
    readonly editando = signal<MensagemNaConversa | null>(null);
    readonly salvandoEdicao = signal(false);
    /** O motivo de a edição não ter sido salva (o servidor recusa depois do prazo, por exemplo); a edição continua aberta para o usuário decidir. */
    readonly erroNaEdicao = signal<string | null>(null);
    /** O motivo da última reação recusada (task 314); some na próxima tentativa. */
    readonly erroNaReacao = signal<string | null>(null);
    /** O código que o usuário copiou antes de apertar o atalho do Desktop (task 213): vira bloco no campo da próxima conversa aberta e some. */
    readonly rascunhoDoDesktop = signal<string | null>(null);

    readonly pessoas = signal<MensagemDiretaPessoaResumoDto[] | null>(null);
    readonly carregandoPessoas = signal(false);
    readonly erroNasPessoas = signal(false);

    readonly resultadoDaBusca = signal<ResultadoDaBusca | null>(null);
    readonly buscando = signal(false);
    readonly erroNaBusca = signal(false);

    /** A cor da bolinha de cada pessoa que o chat já conhece (conversas e lista de pessoas); quem não escolheu cor fica de fora. */
    private readonly coresPorUsuario = computed(() => {
        const cores = new Map<number, string>();
        for (const pessoa of this.pessoas() ?? []) if (pessoa.corAvatar) cores.set(pessoa.usuarioId, pessoa.corAvatar);
        for (const conversa of this.conversas()) {
            if (conversa.corAvatar) cores.set(conversa.usuarioId, conversa.corAvatar);
            else cores.delete(conversa.usuarioId);
        }
        return cores;
    });

    /** A cor escolhida pela pessoa para a bolinha, ou `null` (cor padrão do tema). */
    corDe(usuarioId: number): string | null {
        return this.coresPorUsuario().get(usuarioId) ?? null;
    }

    /** O contador do topbar: as não lidas das conversas que **não** estão silenciadas (a linha de cada conversa na lista mostra a sua mesmo assim). */
    readonly naoLidas = computed(() => totalNaoLidas(this.conversas().filter((conversa) => !conversa.silenciada)));

    /** Conversas silenciadas que ainda não estão na lista (sem mensagem): o sino do cabeçalho precisa lembrar a escolha. */
    private readonly silenciadasSemLinha = signal<ReadonlySet<number>>(new Set());

    private readonly _semConexao = signal(false);
    /** O stream está fora do ar há um tempo (não o piscar do primeiro connect): é quando as telas mostram a faixa de conexão. */
    readonly semConexao = this._semConexao.asReadonly();

    private readonly iniciado = signal(false);
    private temporizadorSemConexao: ReturnType<typeof setTimeout> | null = null;
    /** A data da última mensagem do outro já marcada como lida, por pessoa: evita marcar duas vezes a mesma. */
    private ultimaLeituraMarcada = new Map<number, number>();
    /** Quando o usuário avisou, por pessoa, que está digitando (para não avisar a cada tecla). */
    private ultimoAvisoDeDigitacao = new Map<number, number>();
    private temporizadoresDoDigitando = new Map<number, ReturnType<typeof setTimeout>>();
    private temporizadoresDaIa = new Map<string, ReturnType<typeof setTimeout>>();
    /**
   * As mensagens que ainda não chegaram (`ENVIANDO`) ou falharam (`FALHOU`), por pessoa. Moram aqui, e não na conversa aberta, para não se perderem
   * quando o usuário volta para a lista ou abre outra pessoa: ao reabrir a conversa elas voltam, com "Tentar de novo".
   */
    private pendentes = new Map<number, MensagemNaConversa[]>();
    /**
   * Controle de respostas atrasadas: só a resposta da chamada mais recente de cada tipo vale, e nenhuma vale depois do `parar()` (a sessão trocou).
   * Sem isso, uma lista lenta de um usuário que saiu repõe as não lidas dele na tela do próximo.
   */
    private geracaoDaSessao = 0;
    private geracaoDasConversas = 0;
    private geracaoDaConversaAberta = 0;
    private geracaoDaBusca = 0;
    private aoVoltarVisivel = (): void => {
        if (document.visibilityState === 'visible') void this.marcarComoLida();
    };

    constructor() {
    // A faixa de "sem conexão" só aparece depois de uns segundos fora do ar, para não piscar na primeira conexão nem em quedas curtas.
        effect(() => {
            const conectado = this.stream.conectado();
            if (this.temporizadorSemConexao) clearTimeout(this.temporizadorSemConexao);
            this.temporizadorSemConexao = null;
            if (conectado || !this.iniciado()) {
                this._semConexao.set(false);
                return;
            }
            this.temporizadorSemConexao = setTimeout(() => this._semConexao.set(true), ESPERA_ATE_AVISAR_SEM_CONEXAO_MS);
        });
    }

    // ---------------------------------------------------------------------------
    // Ciclo de vida e janela
    // ---------------------------------------------------------------------------

    /** Abre o stream e carrega a lista. Idempotente; quem chama é o popup, no layout (usuário autenticado). */
    iniciar(): void {
        if (this.iniciado()) return;
        this.iniciado.set(true);
        document.addEventListener('visibilitychange', this.aoVoltarVisivel);
        this.stream.iniciar({
            aoEvento: (evento) => this.aplicarEvento(evento),
            aoReconectar: () => this.recuperar(),
        });
        void this.carregarConversas();
        void this.avisos.carregarPreferencia();
    }

    parar(): void {
        this.stream.parar();
        document.removeEventListener('visibilitychange', this.aoVoltarVisivel);
        this.geracaoDaSessao++;
        this.cancelarEdicao();
        this.referencias.limpar();
        this.avisos.limpar();
        this.silenciadasSemLinha.set(new Set());
        this.iniciado.set(false);
        this.carregandoConversas.set(false);
        this.erroNasConversas.set(false);
        this.resultadoDaBusca.set(null);
        this.buscando.set(false);
        this.erroNaBusca.set(false);
        this.carregandoPessoas.set(false);
        this.erroNasPessoas.set(false);
        this.pendentes.clear();
        this.conversas.set([]);
        this.conversaAberta.set(null);
        this.online.set(new Set());
        this.limparDigitando();
        this.ultimoAvisoDeDigitacao.clear();
        this.pessoas.set(null);
        this.jaCarregouConversas.set(false);
        this.aberto.set(false);
        this.rascunhoDoDesktop.set(null);
        this.visao.set('LISTA');
        this.ultimaLeituraMarcada.clear();
    }

    alternar(): void {
        if (this.aberto()) this.fechar();
        else this.abrir();
    }

    abrir(): void {
        this.aberto.set(true);
        if (this.visao() === 'CONVERSA') void this.marcarComoLida();
    }

    fechar(): void {
        this.rascunhoDoDesktop.set(null);
        this.aberto.set(false);
    }

    /**
   * O atalho do Desktop (task 213): abre o popup com o que estava na área de transferência. Se parece código, vai direto a escolher a pessoa e o código
   * fica esperando o campo da conversa; senão (texto comum, vazio) abre a lista como o botão do topbar e o que foi copiado é descartado.
   */
    abrirPeloDesktop(areaDeTransferencia: string | null): void {
        const codigo = areaDeTransferencia !== null && pareceCodigo(areaDeTransferencia) ? areaDeTransferencia : null;
        this.rascunhoDoDesktop.set(codigo);
        this.abrir();
        if (codigo === null) return;
        this.conversaAberta.set(null);
        this.visao.set('NOVA');
        void this.carregarPessoas();
    }

    /** A tela de configurações (engrenagem do cabeçalho e da barra): ocupa o popup e, ao fechar, devolve a pessoa de onde ela veio. */
    abrirConfiguracoes(): void {
        if (this.visao() === 'CONFIGURACOES') return;
        this.visaoAntesDasConfiguracoes = this.visao() === 'CONVERSA' && this.conversaAberta() ? 'CONVERSA' : 'LISTA';
        this.visao.set('CONFIGURACOES');
    }

    fecharConfiguracoes(): void {
        if (this.visao() !== 'CONFIGURACOES') return;
        const voltaParaAConversa = this.visaoAntesDasConfiguracoes === 'CONVERSA' && this.conversaAberta() !== null;
        this.visao.set(voltaParaAConversa ? 'CONVERSA' : 'LISTA');
        if (voltaParaAConversa) void this.marcarComoLida();
    }

    voltarParaALista(): void {
        this.rascunhoDoDesktop.set(null);
        this.respondendoA.set(null);
        this.cancelarEdicao();
        this.conversaAberta.set(null);
        this.resultadoDaBusca.set(null);
        this.visao.set('LISTA');
    }

    // ---------------------------------------------------------------------------
    // Lista
    // ---------------------------------------------------------------------------

    async carregarConversas(): Promise<void> {
        const geracao = ++this.geracaoDasConversas;
        const sessao = this.geracaoDaSessao;
        const vale = () => geracao === this.geracaoDasConversas && sessao === this.geracaoDaSessao;
        this.carregandoConversas.set(true);
        this.erroNasConversas.set(false);
        try {
            const resposta = await firstValueFrom(this.api.listarConversas());
            if (!vale()) return;
            this.conversas.set(resposta.dados!.conversas.map(normalizarConversa));
            this.jaCarregouConversas.set(true);
        } catch {
            if (vale()) this.erroNasConversas.set(true);
        } finally {
            if (vale()) this.carregandoConversas.set(false);
        }
    }

    // ---------------------------------------------------------------------------
    // Conversa
    // ---------------------------------------------------------------------------

    /** Abre a conversa com uma pessoa (existindo ou não na lista) e carrega a página mais nova. */
    async abrirConversa(usuarioId: number, usuarioNome: string): Promise<void> {
        const meuId = this.sessao.id();
        if (meuId === undefined || meuId === usuarioId) return;
        // O código copiado só vai à conversa escolhida na tela de nova conversa; qualquer outro caminho até uma conversa o descarta.
        if (this.visao() !== 'NOVA') this.rascunhoDoDesktop.set(null);
        if (this.conversaAberta()?.usuarioId !== usuarioId) {
            this.respondendoA.set(null);
            this.cancelarEdicao();
        }
        this.aberto.set(true);
        this.visao.set('CONVERSA');
        this.conversaAberta.set({
            usuarioId, usuarioNome, conversaId: montarConversaDiretaId(meuId, usuarioId),
            mensagens: mesclarMensagens([], this.pendentes.get(usuarioId) ?? []),
            lidaPeloOutroAte: null, proximoCursor: null, carregando: true, carregandoMais: false, erro: false,
        });
        await this.carregarConversaAberta();
    }

    /**
   * Relê a página mais nova da conversa aberta (abertura, "Tentar de novo", recuperação e `SINCRONIZAR`). As mensagens do servidor são
   * **substituídas** pela página nova (se chegaram mais mensagens que uma página enquanto o stream estava fora, ficar com as antigas deixaria
   * um buraco no meio); as locais ainda não enviadas ficam.
   */
    async carregarConversaAberta(): Promise<void> {
        const aberta = this.conversaAberta();
        if (!aberta) return;
        const geracao = ++this.geracaoDaConversaAberta;
        const sessao = this.geracaoDaSessao;
        const vale = () => geracao === this.geracaoDaConversaAberta && sessao === this.geracaoDaSessao;
        this.atualizarConversaAberta(aberta.usuarioId, { carregando: true, erro: false });
        try {
            const resposta = await firstValueFrom(this.api.listarConversa(aberta.usuarioId));
            if (!vale()) return;
            const pagina = resposta.dados!;
            this.atualizarConversaAberta(aberta.usuarioId, (atual) => ({
                mensagens: mesclarMensagens(
                    atual.mensagens.filter((mensagem) => mensagem.situacao !== 'ENVIADA'),
                    pagina.mensagens.map((mensagem) => normalizarMensagem(mensagem)),
                ),
                proximoCursor: pagina.proximoCursor,
                lidaPeloOutroAte: pagina.lidaAteDate ? new Date(pagina.lidaAteDate) : null,
                carregando: false,
            }));
            void this.marcarComoLida();
        } catch {
            if (vale()) this.atualizarConversaAberta(aberta.usuarioId, { carregando: false, erro: true });
        }
    }

    /** Carrega a página mais antiga (ao rolar para cima). */
    async carregarMais(): Promise<void> {
        const aberta = this.conversaAberta();
        if (!aberta || !aberta.proximoCursor || aberta.carregandoMais || aberta.carregando) return;
        this.atualizarConversaAberta(aberta.usuarioId, { carregandoMais: true });
        try {
            const resposta = await firstValueFrom(this.api.listarConversa(aberta.usuarioId, aberta.proximoCursor));
            const pagina = resposta.dados!;
            this.atualizarConversaAberta(aberta.usuarioId, (atual) => ({
                mensagens: mesclarMensagens(atual.mensagens, pagina.mensagens.map((mensagem) => normalizarMensagem(mensagem))),
                proximoCursor: pagina.proximoCursor,
                carregandoMais: false,
            }));
        } catch {
            this.atualizarConversaAberta(aberta.usuarioId, { carregandoMais: false });
        }
    }

    /** A conversa está mesmo à vista de quem usa: o popup aberto nela e a página visível (aba em primeiro plano, janela não minimizada). */
    private aVista(): boolean {
        return this.aberto() && this.visao() === 'CONVERSA' && document.visibilityState === 'visible' && !this.desktop.oculto();
    }

    /** Marca a conversa aberta como lida até a mensagem mais nova do outro, se o popup está à vista e ainda há o que marcar. */
    async marcarComoLida(): Promise<void> {
        const aberta = this.conversaAberta();
        const meuId = this.sessao.id();
        if (!aberta || meuId === undefined || !this.aVista()) return;
        const ate = dataDaUltimaDoOutro(aberta.mensagens, meuId);
        if (!ate) {
            this.conversas.update((lista) => zerarNaoLidas(lista, aberta.conversaId));
            return;
        }
        if ((this.ultimaLeituraMarcada.get(aberta.usuarioId) ?? 0) >= ate.getTime()) {
            this.conversas.update((lista) => zerarNaoLidas(lista, aberta.conversaId));
            return;
        }
        this.ultimaLeituraMarcada.set(aberta.usuarioId, ate.getTime());
        try {
            await firstValueFrom(this.api.alterarLeitura(aberta.usuarioId, ate));
            this.conversas.update((lista) => zerarNaoLidas(lista, aberta.conversaId));
        } catch {
            // Não marcou: a próxima abertura ou mensagem tenta de novo.
            this.ultimaLeituraMarcada.delete(aberta.usuarioId);
        }
    }

    // ---------------------------------------------------------------------------
    // Envio
    // ---------------------------------------------------------------------------

    /** Passa a responder a uma mensagem já enviada da conversa aberta (a de uma pessoa, não a do sistema nem a que ainda não chegou). */
    responder(mensagem: MensagemNaConversa): void {
        if (mensagem.situacao !== 'ENVIADA' || mensagem.autor !== AutorMensagemDiretaEnum.USUARIO || mensagem.autorUsuarioId === null) return;
        if (mensagem.conversaId !== this.conversaAberta()?.conversaId) return;
        this.respondendoA.set(mensagem);
    }

    cancelarResposta(): void {
        this.respondendoA.set(null);
    }

    /** Passa a editar uma mensagem própria já enviada da conversa aberta, se o prazo de 1 hora (contado do envio) ainda vale. Editar e responder não se misturam. */
    editar(mensagem: MensagemNaConversa): void {
        const meuId = this.sessao.id();
        if (meuId === undefined || mensagem.situacao !== 'ENVIADA' || mensagem.conversaId !== this.conversaAberta()?.conversaId) return;
        if (!podeEditarMensagemDireta({ ...mensagem, usuarioId: meuId, agora: new Date() })) return;
        this.respondendoA.set(null);
        this.erroNaEdicao.set(null);
        this.editando.set(mensagem);
    }

    cancelarEdicao(): void {
        this.editando.set(null);
        this.erroNaEdicao.set(null);
        this.salvandoEdicao.set(false);
    }

    /**
   * Salva o texto editado. Sem mudança, só fecha a edição. Se o servidor recusar (prazo vencido, mensagem sumiu, sem rede), a edição continua aberta com o
   * motivo, e o texto digitado não se perde.
   */
    async confirmarEdicao(envio: EnvioDoCompositor): Promise<void> {
        const aberta = this.conversaAberta();
        const alvo = this.editando();
        const texto = envio.texto.trim();
        if (!aberta || !alvo || !texto || this.salvandoEdicao()) return;
        if (texto === alvo.texto.trim()) {
            this.cancelarEdicao();
            return;
        }
        const sessao = this.geracaoDaSessao;
        this.salvandoEdicao.set(true);
        this.erroNaEdicao.set(null);
        try {
            const resposta = await firstValueFrom(
                this.api.editarMensagem({ destinatarioId: aberta.usuarioId, mensagemId: alvo.mensagemId, texto, mencoes: envio.mencoes, referencias: envio.referencias }),
            );
            if (sessao !== this.geracaoDaSessao) return;
            this.aplicarEdicao(normalizarMensagem(resposta.dados!.mensagem));
            this.editando.set(null);
        } catch (erro) {
            if (sessao !== this.geracaoDaSessao) return;
            const motivo = (erro as { error?: { mensagem?: unknown } })?.error?.mensagem;
            this.erroNaEdicao.set(typeof motivo === 'string' && motivo ? motivo : 'Não foi possível salvar a edição. Tente de novo.');
        } finally {
            if (sessao === this.geracaoDaSessao) this.salvandoEdicao.set(false);
        }
    }

    // ---------------------------------------------------------------------------
    // Reações (task 314)
    // ---------------------------------------------------------------------------

    /** Reage à mensagem da conversa aberta com um emoji (o mesmo de antes tira a reação; outro troca). A tela segue a resposta do servidor, não adivinha. */
    async reagir(mensagemId: string, reacao: string | null): Promise<void> {
        const aberta = this.conversaAberta();
        if (!aberta) return;
        const sessao = this.geracaoDaSessao;
        this.erroNaReacao.set(null);
        try {
            const resposta = await firstValueFrom(this.api.reagirMensagem({ destinatarioId: aberta.usuarioId, mensagemId, reacao }));
            if (sessao !== this.geracaoDaSessao) return;
            this.aplicarReacoes(aberta.conversaId, mensagemId, resposta.dados!.reacoes);
        } catch (erro) {
            if (sessao !== this.geracaoDaSessao) return;
            const motivo = (erro as { error?: { mensagem?: unknown } })?.error?.mensagem;
            this.erroNaReacao.set(typeof motivo === 'string' && motivo ? motivo : 'Não foi possível reagir. Tente de novo.');
        }
    }

    /** A lista completa de reações da mensagem (resposta do meu PUT ou evento `REACAO`); não avisa, não conta como não lida e não mexe na ordem. */
    private aplicarReacoes(conversaId: string, mensagemId: string, reacoes: ReacaoMensagemDiretaDto[]): void {
        const aberta = this.conversaAberta();
        if (!aberta || aberta.conversaId !== conversaId) return;
        this.atualizarConversaAberta(aberta.usuarioId, (atual) => ({ mensagens: aplicarReacoesNaMensagem(atual.mensagens, mensagemId, reacoes) }));
    }

    /** Avisa o autor da mensagem de que alguém reagiu a ela: o mesmo cartão e as mesmas regras dos avisos de mensagem, sem contar como mensagem nova. */
    private avisarDaReacao(evento: Extract<MensagemDiretaEventoDto, { tipo: 'REACAO' }>, reacao: string): void {
        const aberta = this.conversaAberta();
        const naConversaAberta = aberta?.conversaId === evento.conversaId;
        const nome = this.conversas().find((conversa) => conversa.conversaId === evento.conversaId)?.usuarioNome ?? (naConversaAberta ? aberta?.usuarioNome : undefined) ?? 'Alguém';
        this.avisos.avisar({
            conversaId: evento.conversaId,
            usuarioId: evento.reatorUsuarioId,
            usuarioNome: nome,
            texto: textoDoAvisoDeReacao(reacao),
            mensagemMinha: false,
            mencionaVoce: false,
            conversaSilenciada: this.estaSilenciada(evento.reatorUsuarioId),
            conversaAVista: naConversaAberta && this.aVista(),
            semContar: true,
        });
    }

    /** A mensagem editada (resposta do meu PATCH ou evento `EDICAO`) substitui a que a tela tinha; não avisa, não conta como não lida e não muda a ordem. */
    private aplicarEdicao(mensagem: MensagemNaConversa): void {
        const aberta = this.conversaAberta();
        if (aberta && aberta.conversaId === mensagem.conversaId) {
            this.atualizarConversaAberta(aberta.usuarioId, (atual) => ({ mensagens: mesclarMensagens(atual.mensagens, [mensagem]) }));
        }
        this.conversas.update((lista) => aplicarEdicaoNaLista(lista, mensagem));
        // A mesma mensagem editada em outra aba minha: a edição daqui perde o sentido (o texto de partida mudou).
        if (this.editando()?.mensagemId === mensagem.mensagemId && !this.salvandoEdicao()) this.editando.set(null);
    }

    /**
   * Envia o texto (com as menções e referências que ainda valem nele) na conversa aberta: a mensagem aparece na hora (`ENVIANDO`) e vira `ENVIADA`
   * ou `FALHOU`. O reenvio leva os mesmos `mencoes` e `referencias`, porque eles ficam guardados na mensagem local.
   */
    async enviar(envio: EnvioDoCompositor): Promise<void> {
        const aberta = this.conversaAberta();
        const meuId = this.sessao.id();
        const texto = envio.texto;
        if (!aberta || meuId === undefined || !texto.trim()) return;
        // Enviou: a próxima digitação avisa de novo na hora, sem esperar o intervalo.
        this.ultimoAvisoDeDigitacao.delete(aberta.usuarioId);

        // A citação local é o que o servidor vai montar (o mesmo trecho), para o balão já nascer com ela; o servidor devolve a definitiva.
        const respondida = this.respondendoA();
        const respondeA =
            respondida && respondida.conversaId === aberta.conversaId && respondida.autorUsuarioId !== null
                ? { mensagemId: respondida.mensagemId, autorUsuarioId: respondida.autorUsuarioId, trecho: trechoDaMensagemDireta(respondida.texto) }
                : null;
        this.respondendoA.set(null);

        const local: MensagemNaConversa = {
            mensagemId: gerarMensagemId(),
            conversaId: aberta.conversaId,
            autor: AutorMensagemDiretaEnum.USUARIO,
            autorUsuarioId: meuId,
            texto,
            contemCodigo: false,
            mencoes: envio.mencoes,
            referencias: envio.referencias,
            respondeA,
            createdDate: new Date(),
            editadaDate: null,
            reacoes: [],
            chamadaPorUsuarioId: null,
            propostaIds: [],
            situacao: 'ENVIANDO',
        };
        this.guardarPendente(aberta.usuarioId, local);
        await this.transmitir(aberta.usuarioId, local);
    }

    /** Reenvia uma mensagem que falhou **com o mesmo `mensagemId`**: se a primeira tentativa chegou, o servidor devolve a mesma e nada duplica. */
    async tentarDeNovo(mensagemId: string): Promise<void> {
        const aberta = this.conversaAberta();
        const falha = aberta ? this.pendentes.get(aberta.usuarioId)?.find((mensagem) => mensagem.mensagemId === mensagemId && mensagem.situacao === 'FALHOU') : undefined;
        if (!aberta || !falha) return;
        const reenvio: MensagemNaConversa = { ...falha, situacao: 'ENVIANDO' };
        this.guardarPendente(aberta.usuarioId, reenvio);
        await this.transmitir(aberta.usuarioId, reenvio);
    }

    /** Descarta uma mensagem que falhou e nunca chegou. */
    excluirLocal(mensagemId: string): void {
        const aberta = this.conversaAberta();
        if (!aberta) return;
        const falha = this.pendentes.get(aberta.usuarioId)?.find((mensagem) => mensagem.mensagemId === mensagemId && mensagem.situacao === 'FALHOU');
        if (!falha) return;
        this.removerPendente(mensagemId);
        this.atualizarConversaAberta(aberta.usuarioId, (atual) => ({ mensagens: atual.mensagens.filter((mensagem) => mensagem.mensagemId !== mensagemId) }));
    }

    /** Registra (ou atualiza) uma mensagem local da pessoa e a mostra na conversa aberta dela, se for essa. */
    private guardarPendente(usuarioId: number, mensagem: MensagemNaConversa): void {
        const outras = (this.pendentes.get(usuarioId) ?? []).filter((pendente) => pendente.mensagemId !== mensagem.mensagemId);
        this.pendentes.set(usuarioId, [...outras, mensagem]);
        this.atualizarConversaAberta(usuarioId, (atual) => ({ mensagens: mesclarMensagens(atual.mensagens, [mensagem]) }));
    }

    private removerPendente(mensagemId: string): void {
        for (const [usuarioId, lista] of [...this.pendentes]) {
            const restantes = lista.filter((pendente) => pendente.mensagemId !== mensagemId);
            if (restantes.length === lista.length) continue;
            if (restantes.length === 0) this.pendentes.delete(usuarioId);
            else this.pendentes.set(usuarioId, restantes);
        }
    }

    private async transmitir(usuarioId: number, local: MensagemNaConversa): Promise<void> {
        const sessao = this.geracaoDaSessao;
        try {
            const resposta = await firstValueFrom(this.api.enviarMensagem({ destinatarioId: usuarioId, mensagemId: local.mensagemId, texto: local.texto, mencoes: local.mencoes, referencias: local.referencias, respondeAMensagemId: local.respondeA?.mensagemId }));
            if (sessao !== this.geracaoDaSessao) return;
            this.receberMensagem(normalizarMensagem(resposta.dados!.mensagem), false);
        } catch {
            // Se o evento do servidor já trouxe a mensagem (o POST falhou depois de gravar), ela deixou de ser pendente e não volta a "Não enviada".
            if (sessao !== this.geracaoDaSessao) return;
            const aindaPendente = this.pendentes.get(usuarioId)?.some((pendente) => pendente.mensagemId === local.mensagemId);
            if (aindaPendente) this.guardarPendente(usuarioId, { ...local, situacao: 'FALHOU' });
        }
    }

    // ---------------------------------------------------------------------------
    // Busca e pessoas
    // ---------------------------------------------------------------------------

    async buscar(texto: string): Promise<void> {
        const termo = texto.trim();
        if (!termo) {
            this.geracaoDaBusca++;
            this.resultadoDaBusca.set(null);
            this.erroNaBusca.set(false);
            this.buscando.set(false);
            return;
        }
        const geracao = ++this.geracaoDaBusca;
        const sessao = this.geracaoDaSessao;
        const vale = () => geracao === this.geracaoDaBusca && sessao === this.geracaoDaSessao;
        this.buscando.set(true);
        this.erroNaBusca.set(false);
        try {
            const resposta = await firstValueFrom(this.api.buscar(termo));
            if (vale()) this.resultadoDaBusca.set({ texto: termo, mensagens: resposta.dados!.mensagens.map((mensagem) => normalizarMensagem(mensagem)) });
        } catch {
            if (vale()) this.erroNaBusca.set(true);
        } finally {
            if (vale()) this.buscando.set(false);
        }
    }

    async carregarPessoas(): Promise<void> {
        if (this.carregandoPessoas()) return;
        const sessao = this.geracaoDaSessao;
        this.carregandoPessoas.set(true);
        this.erroNasPessoas.set(false);
        try {
            const resposta = await firstValueFrom(this.api.listarPessoas());
            if (sessao !== this.geracaoDaSessao) return;
            this.pessoas.set(resposta.dados!.pessoas);
            // A presença também vem da lista: vale até o stream (que é a fonte) confirmar.
            if (!this.stream.conectado()) {
                this.online.set(new Set(resposta.dados!.pessoas.filter((pessoa) => pessoa.online).map((pessoa) => pessoa.usuarioId)));
            }
        } catch {
            if (sessao === this.geracaoDaSessao) this.erroNasPessoas.set(true);
        } finally {
            if (sessao === this.geracaoDaSessao) this.carregandoPessoas.set(false);
        }
    }

    // ---------------------------------------------------------------------------
    // Eventos do stream
    // ---------------------------------------------------------------------------

    aplicarEvento(evento: MensagemDiretaEventoDto): void {
        switch (evento.tipo) {
            case 'ABERTURA':
                this.online.set(new Set(evento.onlineUsuarioIds));
                break;
            case 'PRESENCA': {
                const proximo = new Set(this.online());
                if (evento.online) proximo.add(evento.usuarioId);
                else proximo.delete(evento.usuarioId);
                this.online.set(proximo);
                break;
            }
            case 'DIGITANDO':
                this.marcarDigitando(evento.usuarioId);
                break;
            case 'IA_DIGITANDO':
                this.marcarIaDigitando(evento.conversaId);
                break;
            case 'MENSAGEM':
                this.receberMensagem(normalizarMensagem(evento.mensagem), true);
                break;
            case 'EDICAO':
                this.aplicarEdicao(normalizarMensagem(evento.mensagem));
                break;
            case 'REACAO': {
                this.aplicarReacoes(evento.conversaId, evento.mensagemId, evento.reacoes);
                // Só quem escreveu a mensagem é avisado, e só de reação nova (trocar avisa de novo; tirar e reagir à própria mensagem, não).
                const meuId = this.sessao.id();
                if (evento.reacao !== null && meuId !== undefined && evento.autorUsuarioId === meuId && evento.reatorUsuarioId !== meuId) this.avisarDaReacao(evento, evento.reacao);
                break;
            }
            case 'LEITURA': {
                const aberta = this.conversaAberta();
                if (aberta && aberta.conversaId === evento.conversaId && evento.usuarioId === aberta.usuarioId) {
                    const ate = new Date(evento.lidaAteDate);
                    this.atualizarConversaAberta(aberta.usuarioId, (atual) => ({
                        lidaPeloOutroAte: !atual.lidaPeloOutroAte || atual.lidaPeloOutroAte.getTime() < ate.getTime() ? ate : atual.lidaPeloOutroAte,
                    }));
                }
                break;
            }
            case 'SINCRONIZAR':
                void this.carregarConversas();
                if (evento.conversaId === null || this.conversaAberta()?.conversaId === evento.conversaId) void this.carregarConversaAberta();
                break;
            case 'BATIMENTO':
            case 'ENCERRANDO':
                // O batimento só mantém a conexão; o `ENCERRANDO` é seguido do fim do stream, e o serviço do stream reconecta.
                break;
        }
    }

    /** O stream voltou depois de uma queda: relê o que a tela mostra. */
    private recuperar(): void {
        this.limparDigitando();
        void this.carregarConversas();
        if (this.conversaAberta()) void this.carregarConversaAberta();
    }

    /** `pelaStream`: veio do stream (de outra pessoa ou de outra aba minha). Só ela pode virar aviso; a resposta do meu envio nunca. */
    private receberMensagem(mensagem: MensagemNaConversa, pelaStream: boolean): void {
        const meuId = this.sessao.id();
        if (meuId === undefined) return;
        const aberta = this.conversaAberta();
        const naConversaAberta = aberta?.conversaId === mensagem.conversaId;
        // A mensagem que o servidor devolveu (resposta ou evento) deixa de ser pendente.
        this.removerPendente(mensagem.mensagemId);
        // Quem mandou a mensagem terminou de digitar.
        if (mensagem.autorUsuarioId !== null && mensagem.autorUsuarioId !== meuId) this.removerDigitando(mensagem.autorUsuarioId);
        // A IA terminou: chegou a resposta dela ou o aviso do sistema de que ela não pôde responder.
        if (mensagem.autor !== AutorMensagemDiretaEnum.USUARIO) this.removerIaDigitando(mensagem.conversaId);

        if (naConversaAberta && aberta) {
            this.atualizarConversaAberta(aberta.usuarioId, (atual) => ({ mensagens: mesclarMensagens(atual.mensagens, [mensagem]) }));
        }
        const resultado = aplicarMensagemNaLista(this.conversas(), mensagem, meuId, naConversaAberta && this.aVista() ? mensagem.conversaId : null);
        let recarga: Promise<void> | null = null;
        if (resultado.conversaDesconhecida) {
            recarga = this.carregarConversas();
        } else {
            this.conversas.set(resultado.conversas);
        }
        if (naConversaAberta && mensagem.autorUsuarioId !== meuId) void this.marcarComoLida();
        if (pelaStream) void this.avisarDaMensagem(mensagem, meuId, naConversaAberta && this.aVista(), recarga);
    }

    /** Entrega ao serviço de avisos os fatos da mensagem (quem é, se a conversa está silenciada ou à vista, se cita o usuário); ele decide e mostra. */
    private async avisarDaMensagem(mensagem: MensagemNaConversa, meuId: number, conversaAVista: boolean, recarga: Promise<void> | null): Promise<void> {
        const usuarioId = outraPessoaDaConversa(mensagem.conversaId, meuId);
        if (usuarioId === null) return;
        const nomeNaLista = () => this.conversas().find((conversa) => conversa.conversaId === mensagem.conversaId)?.usuarioNome;
        // Conversa nova: o nome só chega com a lista recarregada (a que `receberMensagem` já pediu; não se pede outra).
        const sessao = this.geracaoDaSessao;
        if (recarga) await recarga;
        if (sessao !== this.geracaoDaSessao) return;
        this.avisos.avisar({
            conversaId: mensagem.conversaId,
            usuarioId,
            usuarioNome: nomeNaLista() ?? 'Nova mensagem',
            texto: previaDaMensagem(mensagem.texto, mensagem.contemCodigo, false, mensagem.autor === AutorMensagemDiretaEnum.IA),
            markdown: mensagem.texto,
            mensagemMinha: mensagem.autorUsuarioId === meuId,
            mencionaVoce: mensagem.mencoes.includes(meuId),
            conversaSilenciada: this.estaSilenciada(usuarioId),
            conversaAVista,
        });
    }

    // ---------------------------------------------------------------------------
    // "Digitando…"
    // ---------------------------------------------------------------------------

    /** O usuário digitou na conversa com `usuarioId`: avisa a pessoa, no máximo a cada `ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS`. Falha de rede é ignorada (o próximo aviso refaz). */
    avisarDigitacao(usuarioId: number): void {
        const agora = Date.now();
        if (!devePublicarDigitacao(this.ultimoAvisoDeDigitacao.get(usuarioId) ?? null, agora)) return;
        this.ultimoAvisoDeDigitacao.set(usuarioId, agora);
        const sessao = this.geracaoDaSessao;
        firstValueFrom(this.api.avisarDigitacao(usuarioId)).catch(() => {
            // Sem o aviso a pessoa só deixa de ver o "digitando…"; tentar de novo já na próxima tecla.
            if (sessao === this.geracaoDaSessao) this.ultimoAvisoDeDigitacao.delete(usuarioId);
        });
    }

    private marcarDigitando(usuarioId: number): void {
        if (usuarioId === this.sessao.id()) return;
        clearTimeout(this.temporizadoresDoDigitando.get(usuarioId));
        this.temporizadoresDoDigitando.set(usuarioId, setTimeout(() => this.removerDigitando(usuarioId), VALIDADE_DO_DIGITANDO_MS));
        if (!this.digitando().has(usuarioId)) this.digitando.set(new Set(this.digitando()).add(usuarioId));
    }

    private removerDigitando(usuarioId: number): void {
        clearTimeout(this.temporizadoresDoDigitando.get(usuarioId));
        this.temporizadoresDoDigitando.delete(usuarioId);
        if (!this.digitando().has(usuarioId)) return;
        const proximo = new Set(this.digitando());
        proximo.delete(usuarioId);
        this.digitando.set(proximo);
    }

    private marcarIaDigitando(conversaId: string): void {
        clearTimeout(this.temporizadoresDaIa.get(conversaId));
        this.temporizadoresDaIa.set(conversaId, setTimeout(() => this.removerIaDigitando(conversaId), VALIDADE_DO_IA_DIGITANDO_MS));
        if (!this.iaDigitando().has(conversaId)) this.iaDigitando.set(new Set(this.iaDigitando()).add(conversaId));
    }

    private removerIaDigitando(conversaId: string): void {
        clearTimeout(this.temporizadoresDaIa.get(conversaId));
        this.temporizadoresDaIa.delete(conversaId);
        if (!this.iaDigitando().has(conversaId)) return;
        const proximo = new Set(this.iaDigitando());
        proximo.delete(conversaId);
        this.iaDigitando.set(proximo);
    }

    private limparDigitando(): void {
        for (const temporizador of this.temporizadoresDoDigitando.values()) clearTimeout(temporizador);
        this.temporizadoresDoDigitando.clear();
        this.digitando.set(new Set());
        for (const temporizador of this.temporizadoresDaIa.values()) clearTimeout(temporizador);
        this.temporizadoresDaIa.clear();
        this.iaDigitando.set(new Set());
    }

    // ---------------------------------------------------------------------------
    // Silêncio por conversa e avisos
    // ---------------------------------------------------------------------------

    /** A conversa com a pessoa está silenciada? (A linha da lista, ou a escolha feita antes de ela ter mensagens.) */
    estaSilenciada(usuarioId: number): boolean {
        const naLista = this.conversas().find((conversa) => conversa.usuarioId === usuarioId);
        return naLista ? naLista.silenciada : this.silenciadasSemLinha().has(usuarioId);
    }

    /** Silencia ou reativa os avisos da conversa: muda na hora e volta se o servidor recusar. */
    async alternarSilencioDaConversa(usuarioId: number): Promise<void> {
        const silenciada = !this.estaSilenciada(usuarioId);
        const sessao = this.geracaoDaSessao;
        this.aplicarSilencio(usuarioId, silenciada);
        try {
            await firstValueFrom(this.api.alterarSilencio(usuarioId, silenciada));
        } catch {
            if (sessao === this.geracaoDaSessao) this.aplicarSilencio(usuarioId, !silenciada);
        }
    }

    private aplicarSilencio(usuarioId: number, silenciada: boolean): void {
        const naLista = this.conversas().some((conversa) => conversa.usuarioId === usuarioId);
        if (naLista) {
            this.conversas.update((lista) => lista.map((conversa) => (conversa.usuarioId === usuarioId ? { ...conversa, silenciada } : conversa)));
            return;
        }
        const proximo = new Set(this.silenciadasSemLinha());
        if (silenciada) proximo.add(usuarioId);
        else proximo.delete(usuarioId);
        this.silenciadasSemLinha.set(proximo);
    }

    /** O clique no aviso: abre a conversa com quem escreveu e tira o cartão. */
    async abrirConversaDoAviso(usuarioId: number, usuarioNome: string, avisoId: string): Promise<void> {
        this.avisos.fechar(avisoId);
        this.rascunhoDoDesktop.set(null);
        await this.abrirConversa(usuarioId, usuarioNome);
    }

    private atualizarConversaAberta(usuarioId: number, alteracao: Partial<ConversaAberta> | ((atual: ConversaAberta) => Partial<ConversaAberta>)): void {
        this.conversaAberta.update((atual) => {
            if (!atual || atual.usuarioId !== usuarioId) return atual;
            return { ...atual, ...(typeof alteracao === 'function' ? alteracao(atual) : alteracao) };
        });
    }
}
