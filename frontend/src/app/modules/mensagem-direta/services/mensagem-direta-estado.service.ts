import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AutorMensagemDiretaEnum,
  MensagemDiretaEventoDto,
  MensagemDiretaPessoaResumoDto,
  montarConversaDiretaId,
} from '@project20/shared';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import {
  ConversaNaLista,
  MensagemNaConversa,
  aplicarMensagemNaLista,
  dataDaUltimaDoOutro,
  gerarMensagemId,
  mesclarMensagens,
  normalizarConversa,
  normalizarMensagem,
  totalNaoLidas,
  zerarNaoLidas,
} from '../utils/mensagem-direta.util';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';
import { MensagemDiretaService } from './mensagem-direta.service';

const ESPERA_ATE_AVISAR_SEM_CONEXAO_MS = 2_500;

export type VisaoDoPopup = 'LISTA' | 'CONVERSA' | 'NOVA';

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

  readonly aberto = signal(false);
  readonly visao = signal<VisaoDoPopup>('LISTA');

  readonly conversas = signal<ConversaNaLista[]>([]);
  readonly carregandoConversas = signal(false);
  readonly jaCarregouConversas = signal(false);
  readonly erroNasConversas = signal(false);

  readonly online = signal<ReadonlySet<number>>(new Set());
  readonly conexao = this.stream.conectado;

  readonly conversaAberta = signal<ConversaAberta | null>(null);

  readonly pessoas = signal<MensagemDiretaPessoaResumoDto[] | null>(null);
  readonly carregandoPessoas = signal(false);
  readonly erroNasPessoas = signal(false);

  readonly resultadoDaBusca = signal<ResultadoDaBusca | null>(null);
  readonly buscando = signal(false);
  readonly erroNaBusca = signal(false);

  readonly naoLidas = computed(() => totalNaoLidas(this.conversas()));

  private readonly _semConexao = signal(false);
  /** O stream está fora do ar há um tempo (não o piscar do primeiro connect): é quando as telas mostram a faixa de conexão. */
  readonly semConexao = this._semConexao.asReadonly();

  private readonly iniciado = signal(false);
  private temporizadorSemConexao: ReturnType<typeof setTimeout> | null = null;
  /** A data da última mensagem do outro já marcada como lida, por pessoa: evita marcar duas vezes a mesma. */
  private ultimaLeituraMarcada = new Map<number, number>();
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
  }

  parar(): void {
    this.stream.parar();
    document.removeEventListener('visibilitychange', this.aoVoltarVisivel);
    this.geracaoDaSessao++;
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
    this.pessoas.set(null);
    this.jaCarregouConversas.set(false);
    this.aberto.set(false);
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
    this.aberto.set(false);
  }

  voltarParaALista(): void {
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
    return this.aberto() && this.visao() === 'CONVERSA' && document.visibilityState === 'visible';
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

  /** Envia o texto na conversa aberta: a mensagem aparece na hora (`ENVIANDO`) e vira `ENVIADA` ou `FALHOU`. */
  async enviar(texto: string): Promise<void> {
    const aberta = this.conversaAberta();
    const meuId = this.sessao.id();
    if (!aberta || meuId === undefined || !texto.trim()) return;

    const local: MensagemNaConversa = {
      mensagemId: gerarMensagemId(),
      conversaId: aberta.conversaId,
      autor: AutorMensagemDiretaEnum.USUARIO,
      autorUsuarioId: meuId,
      texto,
      contemCodigo: false,
      mencoes: [],
      referencias: [],
      createdDate: new Date(),
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
      const resposta = await firstValueFrom(this.api.enviarMensagem({ destinatarioId: usuarioId, mensagemId: local.mensagemId, texto: local.texto }));
      if (sessao !== this.geracaoDaSessao) return;
      this.receberMensagem(normalizarMensagem(resposta.dados!.mensagem));
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
      case 'MENSAGEM':
        this.receberMensagem(normalizarMensagem(evento.mensagem));
        break;
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
    void this.carregarConversas();
    if (this.conversaAberta()) void this.carregarConversaAberta();
  }

  private receberMensagem(mensagem: MensagemNaConversa): void {
    const meuId = this.sessao.id();
    if (meuId === undefined) return;
    const aberta = this.conversaAberta();
    const naConversaAberta = aberta?.conversaId === mensagem.conversaId;
    // A mensagem que o servidor devolveu (resposta ou evento) deixa de ser pendente.
    this.removerPendente(mensagem.mensagemId);

    if (naConversaAberta && aberta) {
      this.atualizarConversaAberta(aberta.usuarioId, (atual) => ({ mensagens: mesclarMensagens(atual.mensagens, [mensagem]) }));
    }
    const resultado = aplicarMensagemNaLista(this.conversas(), mensagem, meuId, naConversaAberta && this.aVista() ? mensagem.conversaId : null);
    if (resultado.conversaDesconhecida) {
      void this.carregarConversas();
    } else {
      this.conversas.set(resultado.conversas);
    }
    if (naConversaAberta && mensagem.autorUsuarioId !== meuId) void this.marcarComoLida();
  }

  private atualizarConversaAberta(usuarioId: number, alteracao: Partial<ConversaAberta> | ((atual: ConversaAberta) => Partial<ConversaAberta>)): void {
    this.conversaAberta.update((atual) => {
      if (!atual || atual.usuarioId !== usuarioId) return atual;
      return { ...atual, ...(typeof alteracao === 'function' ? alteracao(atual) : alteracao) };
    });
  }
}
