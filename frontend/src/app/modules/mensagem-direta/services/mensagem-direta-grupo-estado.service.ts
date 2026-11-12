import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AutorMensagemDiretaEnum, GrupoResumoDto, MensagemDiretaResumoDto, ReacaoMensagemDiretaDto, ReferenciaMensagemDto, podeEditarMensagemDireta, trechoDaMensagemDireta } from '@project20/shared';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import {
    GrupoNaLista,
    MembroNoGrupo,
    aplicarMensagemNosGrupos,
    normalizarGrupo,
    totalNaoLidasDosGrupos,
    zerarNaoLidasDoGrupo,
} from '../utils/grupo.util';
import { mencionaTodosNoTexto } from '../utils/compositor.util';
import { aplicarReacoesNaMensagem } from '../utils/reacoes.util';
import {
    MensagemNaConversa,
    VALIDADE_DO_DIGITANDO_MS,
    devePublicarDigitacao,
    gerarMensagemId,
    mesclarMensagens,
    normalizarMensagem,
} from '../utils/mensagem-direta.util';
import { AlteracaoDoGrupo, MensagemDiretaGrupoService, NovoGrupo } from './mensagem-direta-grupo.service';

/** O grupo aberto na tela (o popup mostra um de cada vez): as mensagens, o cursor e os estados de carga. */
export interface GrupoAberto {
    grupoId: number;
    conversaId: string;
    mensagens: MensagemNaConversa[];
    proximoCursor: string | null;
    carregando: boolean;
    carregandoMais: boolean;
    erro: boolean;
}

/** Uma mensagem fixada do grupo aberto, já com a mensagem como a conversa a mostra. */
export interface FixadaNoGrupo {
    mensagem: MensagemNaConversa;
    fixadaPorUsuarioId: number;
    fixadaDate: Date;
}

/** O que o compositor entrega ao enviar ao grupo. */
export interface EnvioAoGrupoDoCompositor {
    texto: string;
    mencoes: number[];
    mencionaTodos?: boolean;
    referencias: ReferenciaMensagemDto[];
}

/** O motivo que o servidor deu para recusar (a mensagem de negócio), ou o texto de reserva. */
function motivoDaRecusa(erro: unknown, reserva: string): string {
    const motivo = (erro as { error?: { mensagem?: unknown } })?.error?.mensagem;
    return typeof motivo === 'string' && motivo ? motivo : reserva;
}

/**
 * O estado dos grupos do chat entre colaboradores (task 247): a lista de grupos, o grupo aberto, o envio (com mensagem otimista e reenvio pelo mesmo
 * `mensagemId`), criar, renomear, adicionar e sair. É a parte de grupo do `MensagemDiretaEstadoService`, que o orquestra (visão do popup, eventos, avisos,
 * se o grupo está à vista); aqui não há nada de popup. A lógica que não depende de Angular está em `utils/grupo.util.ts`.
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaGrupoEstadoService {
    private readonly api = inject(MensagemDiretaGrupoService);
    private readonly sessao = inject(UsuarioSessaoService);

    readonly grupos = signal<GrupoNaLista[]>([]);
    readonly grupoAberto = signal<GrupoAberto | null>(null);
    /** A mensagem a que o próximo envio responde; vale para o grupo aberto e sai ao enviar, cancelar ou abrir outro grupo. */
    readonly respondendoA = signal<MensagemNaConversa | null>(null);
    /** A mensagem própria que o compositor está editando (task 326): vale para o grupo aberto e sai ao salvar, cancelar ou abrir outro grupo. */
    readonly editando = signal<MensagemNaConversa | null>(null);
    readonly salvandoEdicao = signal(false);
    /** O motivo de a edição não ter sido salva (o servidor recusa depois do prazo, por exemplo); a edição continua aberta para o usuário decidir. */
    readonly erroNaEdicao = signal<string | null>(null);
    /** O motivo da última reação recusada; some na próxima tentativa. */
    readonly erroNaReacao = signal<string | null>(null);
    /** Quem está digitando em cada grupo (chave: `conversaId`); cada aviso vale `VALIDADE_DO_DIGITANDO_MS`. */
    readonly digitando = signal<ReadonlyMap<string, ReadonlySet<number>>>(new Map());

    /** As mensagens fixadas do grupo aberto (task 250), da fixada há menos tempo para a mais antiga; relidas a cada `carregarGrupoAberto` (inclusive no `SINCRONIZAR`). */
    readonly fixadas = signal<FixadaNoGrupo[]>([]);

    /** Uma operação do formulário (criar, alterar, adicionar, sair) está em andamento. */
    readonly salvando = signal(false);
    /** O motivo de a última operação do formulário ter sido recusada; some na próxima tentativa. */
    readonly erroNaOperacao = signal<string | null>(null);

    /**
     * O canal que o gestor ou administrador abriu pelo botão da demanda ou do projeto **sem ser membro** (lê por tipo, pela supervisão): ele não está na
     * lista, então fica guardado aqui enquanto estiver aberto. Quando escreve, passa a ser membro e a lista o traz.
     */
    readonly canalPorTipo = signal<GrupoNaLista | null>(null);

    /** O grupo aberto como a lista o conhece (nome, cor, emoji, membros, silêncio). */
    readonly grupoAbertoNaLista = computed(() => {
        const aberto = this.grupoAberto();
        if (!aberto) return null;
        return this.grupos().find((grupo) => grupo.grupoId === aberto.grupoId) ?? (this.canalPorTipo()?.grupoId === aberto.grupoId ? this.canalPorTipo() : null);
    });
    /** As não lidas dos grupos não silenciados: soma com as das conversas no contador do topbar. */
    readonly naoLidas = computed(() => totalNaoLidasDosGrupos(this.grupos()));

    private ultimaLeituraMarcada = new Map<number, number>();
    private ultimoAvisoDeDigitacao = new Map<number, number>();
    private temporizadoresDoDigitando = new Map<string, ReturnType<typeof setTimeout>>();
    /** As mensagens que ainda não chegaram (`ENVIANDO`) ou falharam (`FALHOU`), por grupo: voltam, com "Tentar de novo", ao reabrir o grupo. */
    private pendentes = new Map<number, MensagemNaConversa[]>();
    /** Só a resposta da chamada mais recente de cada tipo vale, e nenhuma vale depois do `limpar()` (a sessão trocou). */
    private geracaoDaSessao = 0;
    private geracaoDoGrupoAberto = 0;

    // ---------------------------------------------------------------------------
    // Lista
    // ---------------------------------------------------------------------------

    /** Substitui a lista pelos grupos que o servidor mandou com `GET conversas`. O grupo aberto que sumiu da lista (saiu, foi encerrado) fecha. */
    definirGrupos(grupos: GrupoResumoDto[]): void {
        const novos = grupos.map(normalizarGrupo);
        this.grupos.set(novos);
        const lidoPorTipo = this.canalPorTipo();
        if (lidoPorTipo && novos.some((grupo) => grupo.grupoId === lidoPorTipo.grupoId)) this.canalPorTipo.set(null);
        const aberto = this.grupoAberto();
        if (aberto && !novos.some((grupo) => grupo.grupoId === aberto.grupoId) && this.canalPorTipo()?.grupoId !== aberto.grupoId) this.fecharGrupo();
    }

    grupoDaLista(grupoId: number): GrupoNaLista | null {
        return this.grupos().find((grupo) => grupo.grupoId === grupoId) ?? null;
    }

    /** A sessão acabou: nada do usuário anterior fica. */
    limpar(): void {
        this.geracaoDaSessao++;
        this.geracaoDoGrupoAberto++;
        this.grupos.set([]);
        this.fixadas.set([]);
        this.canalPorTipo.set(null);
        this.grupoAberto.set(null);
        this.respondendoA.set(null);
        this.cancelarEdicao();
        this.erroNaReacao.set(null);
        this.pendentes.clear();
        this.ultimaLeituraMarcada.clear();
        this.ultimoAvisoDeDigitacao.clear();
        this.limparDigitando();
        this.salvando.set(false);
        this.erroNaOperacao.set(null);
    }

    // ---------------------------------------------------------------------------
    // Grupo aberto
    // ---------------------------------------------------------------------------

    /** Abre o grupo e carrega a página mais nova. As mensagens locais que não chegaram voltam. */
    async abrirGrupo(grupoId: number): Promise<void> {
        const atual = this.grupoAberto();
        if (atual?.grupoId !== grupoId) {
            this.respondendoA.set(null);
            this.cancelarEdicao();
            this.erroNaReacao.set(null);
            this.fixadas.set([]);
        }
        this.erroNaOperacao.set(null);
        this.grupoAberto.set({
            grupoId,
            conversaId: `G${grupoId}`,
            mensagens: mesclarMensagens([], this.pendentes.get(grupoId) ?? []),
            proximoCursor: null,
            carregando: true,
            carregandoMais: false,
            erro: false,
        });
        await this.carregarGrupoAberto();
    }

    fecharGrupo(): void {
        this.geracaoDoGrupoAberto++;
        this.respondendoA.set(null);
        this.cancelarEdicao();
        this.erroNaReacao.set(null);
        this.grupoAberto.set(null);
    }

    /** Relê a página mais nova do grupo aberto (abertura, "Tentar de novo", recuperação e `SINCRONIZAR`); as locais que não chegaram ficam. */
    async carregarGrupoAberto(): Promise<void> {
        const aberto = this.grupoAberto();
        if (!aberto) return;
        const geracao = ++this.geracaoDoGrupoAberto;
        const sessao = this.geracaoDaSessao;
        const vale = () => geracao === this.geracaoDoGrupoAberto && sessao === this.geracaoDaSessao;
        this.atualizarGrupoAberto(aberto.grupoId, { carregando: true, erro: false });
        try {
            const resposta = await firstValueFrom(this.api.listarMensagens(aberto.grupoId));
            if (!vale()) return;
            const pagina = resposta.dados!;
            this.atualizarGrupoAberto(aberto.grupoId, (atual) => ({
                mensagens: mesclarMensagens(
                    atual.mensagens.filter((mensagem) => mensagem.situacao !== 'ENVIADA'),
                    pagina.mensagens.map((mensagem) => normalizarMensagem(mensagem)),
                ),
                proximoCursor: pagina.proximoCursor,
                carregando: false,
            }));
            void this.carregarFixadas(aberto.grupoId);
        } catch {
            if (vale()) this.atualizarGrupoAberto(aberto.grupoId, { carregando: false, erro: true });
        }
    }

    // ---------------------------------------------------------------------------
    // Fixadas e busca no grupo (task 250)
    // ---------------------------------------------------------------------------

    /** Relê as fixadas do grupo aberto. Falhar aqui não atrapalha a conversa: a lista fica como estava. */
    async carregarFixadas(grupoId: number): Promise<void> {
        const sessao = this.geracaoDaSessao;
        try {
            const resposta = await firstValueFrom(this.api.listarFixadas(grupoId));
            if (sessao !== this.geracaoDaSessao || this.grupoAberto()?.grupoId !== grupoId) return;
            this.fixadas.set(
                (resposta.dados?.fixadas ?? []).map((fixada) => ({ mensagem: normalizarMensagem(fixada.mensagem), fixadaPorUsuarioId: fixada.fixadaPorUsuarioId, fixadaDate: new Date(fixada.fixadaDate) })),
            );
        } catch {
            // Sem as fixadas a conversa segue normal.
        }
    }

    /** Fixa ou desafixa a mensagem e relê as fixadas. Devolve o motivo da recusa (por exemplo, o limite), ou `null` se deu certo. */
    async alternarFixada(grupoId: number, mensagemId: string): Promise<string | null> {
        const fixada = this.fixadas().some((item) => item.mensagem.mensagemId === mensagemId);
        try {
            if (fixada) await firstValueFrom(this.api.desafixarMensagem(grupoId, mensagemId));
            else await firstValueFrom(this.api.fixarMensagem(grupoId, mensagemId));
        } catch (erro) {
            return motivoDaRecusa(erro, fixada ? 'Não foi possível desafixar a mensagem' : 'Não foi possível fixar a mensagem');
        }
        await this.carregarFixadas(grupoId);
        return null;
    }

    /** A busca dentro do grupo (sem acento, com "Com código"). Quem chama trata a falha. */
    async buscarNoGrupo(grupoId: number, texto: string, somenteCodigo: boolean): Promise<MensagemNaConversa[]> {
        const resposta = await firstValueFrom(this.api.buscarNoGrupo(grupoId, texto, somenteCodigo));
        return (resposta.dados?.mensagens ?? []).map((mensagem) => normalizarMensagem(mensagem));
    }

    /** Carrega a página mais antiga (ao rolar para cima). */
    async carregarMais(): Promise<void> {
        const aberto = this.grupoAberto();
        if (!aberto || !aberto.proximoCursor || aberto.carregandoMais || aberto.carregando) return;
        this.atualizarGrupoAberto(aberto.grupoId, { carregandoMais: true });
        try {
            const resposta = await firstValueFrom(this.api.listarMensagens(aberto.grupoId, aberto.proximoCursor));
            const pagina = resposta.dados!;
            this.atualizarGrupoAberto(aberto.grupoId, (atual) => ({
                mensagens: mesclarMensagens(atual.mensagens, pagina.mensagens.map((mensagem) => normalizarMensagem(mensagem))),
                proximoCursor: pagina.proximoCursor,
                carregandoMais: false,
            }));
        } catch {
            this.atualizarGrupoAberto(aberto.grupoId, { carregandoMais: false });
        }
    }

    /**
   * Marca o grupo aberto como lido até a mensagem mais nova de outra pessoa, se está à vista e ainda há o que marcar. Não há "Lida" por pessoa no grupo
   * (decisão do autor): a marcação só zera as não lidas de quem lê.
   */
    async marcarComoLida(aVista: boolean): Promise<void> {
        const aberto = this.grupoAberto();
        const meuId = this.sessao.id();
        if (!aberto || meuId === undefined || !aVista) return;
        const ate = [...aberto.mensagens].reverse().find((mensagem) => mensagem.autorUsuarioId !== meuId && mensagem.situacao === 'ENVIADA')?.createdDate ?? null;
        if (!ate || (this.ultimaLeituraMarcada.get(aberto.grupoId) ?? 0) >= ate.getTime()) {
            this.grupos.update((lista) => zerarNaoLidasDoGrupo(lista, aberto.conversaId));
            return;
        }
        this.ultimaLeituraMarcada.set(aberto.grupoId, ate.getTime());
        try {
            await firstValueFrom(this.api.alterarLeitura(aberto.grupoId, ate));
            this.grupos.update((lista) => zerarNaoLidasDoGrupo(lista, aberto.conversaId));
        } catch {
            this.ultimaLeituraMarcada.delete(aberto.grupoId);
        }
    }

    // ---------------------------------------------------------------------------
    // Envio
    // ---------------------------------------------------------------------------

    responder(mensagem: MensagemNaConversa): void {
        if (mensagem.situacao !== 'ENVIADA' || mensagem.autor !== AutorMensagemDiretaEnum.USUARIO || mensagem.autorUsuarioId === null) return;
        if (mensagem.conversaId !== this.grupoAberto()?.conversaId) return;
        this.respondendoA.set(mensagem);
    }

    cancelarResposta(): void {
        this.respondendoA.set(null);
    }

    // ---------------------------------------------------------------------------
    // Editar e reagir (task 326)
    // ---------------------------------------------------------------------------

    /** Passa a editar uma mensagem própria já enviada do grupo aberto, se o prazo de 1 hora (contado do envio) ainda vale. Editar e responder não se misturam. */
    editar(mensagem: MensagemNaConversa): void {
        const meuId = this.sessao.id();
        if (meuId === undefined || mensagem.situacao !== 'ENVIADA' || mensagem.conversaId !== this.grupoAberto()?.conversaId) return;
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
     * Salva o texto editado. Sem mudança, só fecha a edição. Se o servidor recusar (prazo vencido, mensagem sumiu, saí do grupo, sem rede), a edição continua
     * aberta com o motivo, e o texto digitado não se perde.
     */
    async confirmarEdicao(envio: EnvioAoGrupoDoCompositor): Promise<void> {
        const aberto = this.grupoAberto();
        const alvo = this.editando();
        const texto = envio.texto.trim();
        if (!aberto || !alvo || !texto || this.salvandoEdicao()) return;
        if (texto === alvo.texto.trim()) {
            this.cancelarEdicao();
            return;
        }
        const sessao = this.geracaoDaSessao;
        this.salvandoEdicao.set(true);
        this.erroNaEdicao.set(null);
        try {
            const resposta = await firstValueFrom(
                this.api.editarMensagem(aberto.grupoId, {
                    mensagemId: alvo.mensagemId,
                    texto,
                    mencoes: envio.mencoes,
                    mencionaTodos: envio.mencionaTodos || undefined,
                    referencias: envio.referencias,
                }),
            );
            if (sessao !== this.geracaoDaSessao) return;
            this.aplicarEdicao(resposta.dados!.mensagem);
            this.editando.set(null);
        } catch (erro) {
            if (sessao !== this.geracaoDaSessao) return;
            this.erroNaEdicao.set(motivoDaRecusa(erro, 'Não foi possível salvar a edição. Tente de novo.'));
        } finally {
            if (sessao === this.geracaoDaSessao) this.salvandoEdicao.set(false);
        }
    }

    /** A mensagem editada (resposta do meu PATCH ou evento `EDICAO`) substitui a que a tela tinha; não avisa, não conta como não lida e não muda a ordem. */
    aplicarEdicao(mensagem: MensagemDiretaResumoDto): void {
        const normalizada = normalizarMensagem(mensagem);
        const grupoId = Number(normalizada.conversaId.slice(1));
        this.atualizarGrupoAberto(grupoId, (atual) => ({ mensagens: mesclarMensagens(atual.mensagens, [normalizada]) }));
        // A última mensagem do grupo na lista (a prévia) acompanha a edição.
        this.grupos.update((lista) =>
            lista.map((grupo) => (grupo.grupoId === grupoId && grupo.ultimaMensagem?.mensagemId === normalizada.mensagemId ? { ...grupo, ultimaMensagem: normalizada } : grupo)),
        );
        // A mesma mensagem editada em outra aba minha: a edição daqui perde o sentido (o texto de partida mudou).
        if (this.editando()?.mensagemId === normalizada.mensagemId && !this.salvandoEdicao()) this.editando.set(null);
    }

    /** Reage à mensagem do grupo aberto com um emoji (o mesmo de antes tira a reação; outro troca). A tela segue a resposta do servidor, não adivinha. */
    async reagir(mensagemId: string, reacao: string | null): Promise<void> {
        const aberto = this.grupoAberto();
        if (!aberto) return;
        const sessao = this.geracaoDaSessao;
        this.erroNaReacao.set(null);
        try {
            const resposta = await firstValueFrom(this.api.reagirMensagem(aberto.grupoId, mensagemId, reacao));
            if (sessao !== this.geracaoDaSessao) return;
            this.aplicarReacoes(aberto.conversaId, mensagemId, resposta.dados!.reacoes);
        } catch (erro) {
            if (sessao !== this.geracaoDaSessao) return;
            this.erroNaReacao.set(motivoDaRecusa(erro, 'Não foi possível reagir. Tente de novo.'));
        }
    }

    /** A lista completa de reações da mensagem (resposta do meu PUT ou evento `REACAO`); não avisa, não conta como não lida e não mexe na ordem. */
    aplicarReacoes(conversaId: string, mensagemId: string, reacoes: ReacaoMensagemDiretaDto[]): void {
        const aberto = this.grupoAberto();
        if (!aberto || aberto.conversaId !== conversaId) return;
        this.atualizarGrupoAberto(aberto.grupoId, (atual) => ({ mensagens: aplicarReacoesNaMensagem(atual.mensagens, mensagemId, reacoes) }));
    }

    /** Envia ao grupo aberto: a mensagem aparece na hora (`ENVIANDO`) e vira `ENVIADA` ou `FALHOU`. */
    async enviar(envio: EnvioAoGrupoDoCompositor): Promise<void> {
        const aberto = this.grupoAberto();
        const meuId = this.sessao.id();
        if (!aberto || meuId === undefined || !envio.texto.trim()) return;
        this.ultimoAvisoDeDigitacao.delete(aberto.grupoId);

        const respondida = this.respondendoA();
        const respondeA =
            respondida && respondida.conversaId === aberto.conversaId && respondida.autorUsuarioId !== null
                ? { mensagemId: respondida.mensagemId, autorUsuarioId: respondida.autorUsuarioId, trecho: trechoDaMensagemDireta(respondida.texto) }
                : null;
        this.respondendoA.set(null);

        const local: MensagemNaConversa = {
            mensagemId: gerarMensagemId(),
            conversaId: aberto.conversaId,
            autor: AutorMensagemDiretaEnum.USUARIO,
            autorUsuarioId: meuId,
            texto: envio.texto,
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
        this.guardarPendente(aberto.grupoId, local);
        await this.transmitir(aberto.grupoId, local, envio.mencionaTodos === true);
    }

    /** Reenvia uma mensagem que falhou **com o mesmo `mensagemId`**: se a primeira tentativa chegou, o servidor devolve a mesma e nada duplica. */
    async tentarDeNovo(mensagemId: string): Promise<void> {
        const aberto = this.grupoAberto();
        const falha = aberto ? this.pendentes.get(aberto.grupoId)?.find((mensagem) => mensagem.mensagemId === mensagemId && mensagem.situacao === 'FALHOU') : undefined;
        if (!aberto || !falha) return;
        const reenvio: MensagemNaConversa = { ...falha, situacao: 'ENVIANDO' };
        this.guardarPendente(aberto.grupoId, reenvio);
        await this.transmitir(aberto.grupoId, reenvio, mencionaTodosNoTexto(falha.texto));
    }

    excluirLocal(mensagemId: string): void {
        const aberto = this.grupoAberto();
        if (!aberto) return;
        const falha = this.pendentes.get(aberto.grupoId)?.find((mensagem) => mensagem.mensagemId === mensagemId && mensagem.situacao === 'FALHOU');
        if (!falha) return;
        this.removerPendente(mensagemId);
        this.atualizarGrupoAberto(aberto.grupoId, (atual) => ({ mensagens: atual.mensagens.filter((mensagem) => mensagem.mensagemId !== mensagemId) }));
    }

    private guardarPendente(grupoId: number, mensagem: MensagemNaConversa): void {
        const outras = (this.pendentes.get(grupoId) ?? []).filter((pendente) => pendente.mensagemId !== mensagem.mensagemId);
        this.pendentes.set(grupoId, [...outras, mensagem]);
        this.atualizarGrupoAberto(grupoId, (atual) => ({ mensagens: mesclarMensagens(atual.mensagens, [mensagem]) }));
    }

    private removerPendente(mensagemId: string): void {
        for (const [grupoId, lista] of [...this.pendentes]) {
            const restantes = lista.filter((pendente) => pendente.mensagemId !== mensagemId);
            if (restantes.length === lista.length) continue;
            if (restantes.length === 0) this.pendentes.delete(grupoId);
            else this.pendentes.set(grupoId, restantes);
        }
    }

    private async transmitir(grupoId: number, local: MensagemNaConversa, mencionaTodos: boolean): Promise<void> {
        const sessao = this.geracaoDaSessao;
        try {
            const resposta = await firstValueFrom(
                this.api.enviarMensagem(grupoId, {
                    mensagemId: local.mensagemId,
                    texto: local.texto,
                    mencoes: local.mencoes,
                    mencionaTodos: mencionaTodos || undefined,
                    referencias: local.referencias,
                    respondeAMensagemId: local.respondeA?.mensagemId,
                }),
            );
            if (sessao !== this.geracaoDaSessao) return;
            // A resposta do meu envio entra na conversa e vira a última mensagem do grupo na lista (a minha nunca conta como não lida).
            this.receberMensagem(resposta.dados!.mensagem, false);
        } catch {
            // Se o evento do servidor já trouxe a mensagem (o POST falhou depois de gravar), ela deixou de ser pendente e não volta a "Não enviada".
            if (sessao !== this.geracaoDaSessao) return;
            const aindaPendente = this.pendentes.get(grupoId)?.some((pendente) => pendente.mensagemId === local.mensagemId);
            if (aindaPendente) this.guardarPendente(grupoId, { ...local, situacao: 'FALHOU' });
        }
    }

    // ---------------------------------------------------------------------------
    // Mensagens que chegam (o orquestrador decide aviso e leitura)
    // ---------------------------------------------------------------------------

    /** Põe a mensagem do servidor no grupo aberto (se for dele) e tira o "digitando" de quem a escreveu. Não mexe na lista nem avisa. */
    private incorporarMensagem(mensagem: MensagemNaConversa): void {
        const grupoId = Number(mensagem.conversaId.slice(1));
        this.removerPendente(mensagem.mensagemId);
        if (mensagem.autorUsuarioId !== null) this.removerDigitando(mensagem.conversaId, mensagem.autorUsuarioId);
        this.atualizarGrupoAberto(grupoId, (atual) => ({ mensagens: mesclarMensagens(atual.mensagens, [mensagem]) }));
    }

    /**
   * Recebe a mensagem de um grupo (resposta do meu envio ou evento): entra no grupo aberto, atualiza a última mensagem e as não lidas na lista.
   * `grupoDesconhecido` pede ao orquestrador para reler a lista (acabei de ser adicionado).
   */
    receberMensagem(mensagem: MensagemDiretaResumoDto, aVista: boolean): { grupoDesconhecido: boolean; mensagem: MensagemNaConversa } {
        const meuId = this.sessao.id() ?? -1;
        const normalizada = normalizarMensagem(mensagem);
        this.incorporarMensagem(normalizada);
        const resultado = aplicarMensagemNosGrupos(this.grupos(), normalizada, meuId, aVista ? normalizada.conversaId : null);
        if (!resultado.grupoDesconhecido) this.grupos.set(resultado.grupos);
        return { grupoDesconhecido: resultado.grupoDesconhecido, mensagem: normalizada };
    }

    // ---------------------------------------------------------------------------
    // Criar, alterar, adicionar, sair
    // ---------------------------------------------------------------------------

    /** Cria o grupo e o põe na lista; devolve o grupo criado ou `null` se o servidor recusou (o motivo fica em `erroNaOperacao`). */
    async criarGrupo(novo: NovoGrupo): Promise<GrupoNaLista | null> {
        return this.operar('Não foi possível criar o grupo. Tente de novo.', async () => {
            const resposta = await firstValueFrom(this.api.criar(novo));
            const criado = normalizarGrupo(resposta.dados!.grupo);
            this.grupos.update((lista) => [criado, ...lista.filter((grupo) => grupo.grupoId !== criado.grupoId)]);
            return criado;
        });
    }

    async alterarGrupo(grupoId: number, alteracao: AlteracaoDoGrupo): Promise<boolean> {
        const alterado = await this.operar('Não foi possível alterar o grupo. Tente de novo.', async () => {
            const resposta = await firstValueFrom(this.api.alterar(grupoId, alteracao));
            this.substituirNaLista(normalizarGrupo(resposta.dados!.grupo));
            return true;
        });
        return alterado === true;
    }

    async adicionarMembros(grupoId: number, usuarioIds: number[]): Promise<boolean> {
        const adicionado = await this.operar('Não foi possível adicionar as pessoas. Tente de novo.', async () => {
            const resposta = await firstValueFrom(this.api.adicionarMembros(grupoId, usuarioIds));
            this.substituirNaLista(normalizarGrupo(resposta.dados!.grupo));
            return true;
        });
        return adicionado === true;
    }

    /** Sai do grupo (o último a sair o encerra) e o tira da lista; `true` quando saiu. */
    async sairDoGrupo(grupoId: number): Promise<boolean> {
        const saiu = await this.operar('Não foi possível sair do grupo. Tente de novo.', async () => {
            await firstValueFrom(this.api.sair(grupoId));
            this.pendentes.delete(grupoId);
            this.grupos.update((lista) => lista.filter((grupo) => grupo.grupoId !== grupoId));
            if (this.grupoAberto()?.grupoId === grupoId) this.fecharGrupo();
            return true;
        });
        return saiu === true;
    }

    /** Silencia ou reativa os avisos do grupo: muda na hora e volta se o servidor recusar. */
    async alternarSilencio(grupoId: number): Promise<void> {
        const grupo = this.grupoDaLista(grupoId);
        if (!grupo) return;
        const silenciada = !grupo.silenciada;
        const sessao = this.geracaoDaSessao;
        this.aplicarSilencio(grupoId, silenciada);
        try {
            await firstValueFrom(this.api.alterarSilencio(grupoId, silenciada));
        } catch {
            if (sessao === this.geracaoDaSessao) this.aplicarSilencio(grupoId, !silenciada);
        }
    }

    private aplicarSilencio(grupoId: number, silenciada: boolean): void {
        this.grupos.update((lista) => lista.map((grupo) => (grupo.grupoId === grupoId ? { ...grupo, silenciada } : grupo)));
    }

    /** A lista tem o grupo; o grupo novo do servidor (nome, cor, emoji, membros) substitui o que estava, mantendo as não lidas e o silêncio de agora. */
    private substituirNaLista(grupo: GrupoNaLista): void {
        this.grupos.update((lista) => lista.map((atual) => (atual.grupoId === grupo.grupoId ? { ...grupo, naoLidas: atual.naoLidas, silenciada: atual.silenciada } : atual)));
    }

    private async operar<T>(reserva: string, operacao: () => Promise<T>): Promise<T | null> {
        if (this.salvando()) return null;
        const sessao = this.geracaoDaSessao;
        this.salvando.set(true);
        this.erroNaOperacao.set(null);
        try {
            return await operacao();
        } catch (erro) {
            if (sessao === this.geracaoDaSessao) this.erroNaOperacao.set(motivoDaRecusa(erro, reserva));
            return null;
        } finally {
            if (sessao === this.geracaoDaSessao) this.salvando.set(false);
        }
    }

    // ---------------------------------------------------------------------------
    // "Digitando…"
    // ---------------------------------------------------------------------------

    /** O usuário digitou no grupo: avisa os outros membros, no máximo a cada `ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS`. Falha de rede é ignorada. */
    avisarDigitacao(grupoId: number): void {
        const agora = Date.now();
        if (!devePublicarDigitacao(this.ultimoAvisoDeDigitacao.get(grupoId) ?? null, agora)) return;
        this.ultimoAvisoDeDigitacao.set(grupoId, agora);
        const sessao = this.geracaoDaSessao;
        firstValueFrom(this.api.avisarDigitacao(grupoId)).catch(() => {
            if (sessao === this.geracaoDaSessao) this.ultimoAvisoDeDigitacao.delete(grupoId);
        });
    }

    marcarDigitando(conversaId: string, usuarioId: number): void {
        if (usuarioId === this.sessao.id()) return;
        const chave = `${conversaId}:${usuarioId}`;
        clearTimeout(this.temporizadoresDoDigitando.get(chave));
        this.temporizadoresDoDigitando.set(chave, setTimeout(() => this.removerDigitando(conversaId, usuarioId), VALIDADE_DO_DIGITANDO_MS));
        const atual = this.digitando().get(conversaId);
        if (atual?.has(usuarioId)) return;
        this.digitando.set(new Map(this.digitando()).set(conversaId, new Set(atual).add(usuarioId)));
    }

    removerDigitando(conversaId: string, usuarioId: number): void {
        const chave = `${conversaId}:${usuarioId}`;
        clearTimeout(this.temporizadoresDoDigitando.get(chave));
        this.temporizadoresDoDigitando.delete(chave);
        const atual = this.digitando().get(conversaId);
        if (!atual?.has(usuarioId)) return;
        const restantes = new Set(atual);
        restantes.delete(usuarioId);
        const proximo = new Map(this.digitando());
        if (restantes.size === 0) proximo.delete(conversaId);
        else proximo.set(conversaId, restantes);
        this.digitando.set(proximo);
    }

    limparDigitando(): void {
        for (const temporizador of this.temporizadoresDoDigitando.values()) clearTimeout(temporizador);
        this.temporizadoresDoDigitando.clear();
        this.digitando.set(new Map());
    }

    private atualizarGrupoAberto(grupoId: number, alteracao: Partial<GrupoAberto> | ((atual: GrupoAberto) => Partial<GrupoAberto>)): void {
        this.grupoAberto.update((atual) => {
            if (!atual || atual.grupoId !== grupoId) return atual;
            return { ...atual, ...(typeof alteracao === 'function' ? alteracao(atual) : alteracao) };
        });
    }

    /** Os membros do grupo aberto (para os nomes dos autores e as menções). */
    membrosDoGrupoAberto(): MembroNoGrupo[] {
        return this.grupoAbertoNaLista()?.membros ?? [];
    }
}
