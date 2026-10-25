import { Component, ElementRef, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { AutorChatEnum, ChatEventoDto, ChatMensagemResumoDto, EstadoIaEnum, NivelIaEnum, PropostaIaResumoDto } from '@project20/shared';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { HistoricoComponent, MensagemDoHistorico } from '../../components/historico/historico.component';
import { PropostaCartaoComponent } from '../../components/proposta-cartao/proposta-cartao.component';
import { ChatService, ErroDoChat } from '../../services/chat.service';
import { dataDaConversa, ROTULO_NIVEL, sugestoesAposProposta, sugestoesIniciais } from '../../utils/chat.util';

/** Uma mensagem como a tela a mostra: as da conversa do dia mais as locais (otimistas), com os cartões de proposta ligados a ela. */
interface MensagemNaTela {
  id: string;
  /**
   * Identidade do item na lista: a resposta em andamento e a mensagem gravada que a substitui têm a **mesma** chave, então o `@for` mantém o
   * mesmo elemento (e os cartões de proposta já carregados) em vez de apagar a bolha e criar tudo de novo.
   */
  chave: string;
  autor: AutorChatEnum;
  texto: string;
  nivel: NivelIaEnum | null;
  propostaIds: number[];
  criadaEm: Date | null;
  /** Só na resposta em andamento: ainda chegando (sem rodapé, com o "consultando…"). */
  aoVivo?: boolean;
  /** Só na resposta em andamento: a ferramenta que a IA está usando agora. */
  ferramenta?: string | null;
}

/** A resposta que está chegando: cresce a cada `trecho` e vira uma mensagem da conversa no `fim`. */
interface RespostaAoVivo {
  /** A chave do item na lista; a mensagem gravada no `fim` a herda. */
  chave: string;
  texto: string;
  ferramenta: string | null;
  propostaIds: number[];
}

/** Distância do fim (px) até a qual a conversa continua acompanhando a resposta que chega. */
const MARGEM_DO_FIM_PX = 80;
/** Quanto tempo (ms) depois de uma roda, toque, tecla ou clique na barra um evento de rolagem ainda conta como do usuário. */
const JANELA_DA_INTERACAO_MS = 400;

/**
 * Chat do dia com a IA (task 139). Mostra a conversa de hoje, envia mensagens (`Enter` envia, `Shift+Enter` quebra linha), mostra a
 * resposta chegando aos poucos e os cartões de proposta. Com a IA desligada a entrada fica desabilitada; **fora do ar** só avisa
 * (o estado só se recupera com uma chamada bem-sucedida, então bloquear a entrada travaria a recuperação). Análogo visual: a tela de
 * Configurações da IA (título e cartões com borda) e o Pad (leitura em Markdown).
 */
@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ButtonModule,
    SkeletonModule,
    TextareaModule,
    TooltipModule,
    MarkdownVisualizadorComponent,
    PropostaCartaoComponent,
    HistoricoComponent,
  ],
  templateUrl: './chat.page.html',
  styleUrl: './chat.page.scss',
})
export class ChatPage implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly messageService = inject(MessageService);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
  private readonly roteador = inject(Router);
  private readonly areaDeRolagem = viewChild<ElementRef<HTMLElement>>('rolagem');
  private readonly fluxo = viewChild<ElementRef<HTMLElement>>('fluxo');
  private readonly campoDeTexto = viewChild<ElementRef<HTMLTextAreaElement>>('campoTexto');
  private readonly historico = viewChild(HistoricoComponent);

  readonly Autor = AutorChatEnum;
  readonly Estado = EstadoIaEnum;
  readonly rotuloNivel = ROTULO_NIVEL;

  readonly carregando = signal(true);
  readonly jaCarregou = signal(false);
  readonly erro = signal(false);
  readonly enviando = signal(false);
  readonly mensagens = signal<MensagemNaTela[]>([]);
  readonly aoVivo = signal<RespostaAoVivo | null>(null);
  /** O que a conversa mostra: as mensagens e, no fim, a resposta em andamento como mais um item (que vira a mensagem gravada sem sumir). */
  readonly itens = computed<MensagemNaTela[]>(() => {
    const resposta = this.aoVivo();
    if (!resposta) return this.mensagens();
    const emAndamento: MensagemNaTela = {
      id: resposta.chave,
      chave: resposta.chave,
      autor: AutorChatEnum.IA,
      texto: resposta.texto,
      nivel: null,
      propostaIds: resposta.propostaIds,
      criadaEm: null,
      aoVivo: true,
      ferramenta: resposta.ferramenta,
    };
    return [...this.mensagens(), emAndamento];
  });
  readonly conversaId = signal<string>('');
  /** O dia de hoje no servidor (`yyyy-mm-dd`, do id da conversa de hoje); vazio até a primeira carga. */
  readonly hoje = signal('');
  /** O dia aberto no lugar de hoje (`yyyy-mm-dd`), só para leitura; `null` é a conversa de hoje. */
  readonly diaAberto = signal<string | null>(null);
  readonly somenteLeitura = computed(() => this.diaAberto() !== null);
  readonly diaExibido = computed(() => this.diaAberto() ?? this.hoje());
  readonly diaFormatado = computed(() => this.diaAberto()?.split('-').reverse().join('/') ?? '');
  /** O estado de fato da IA (o chat não segue o modo convencional: se a IA está no ar, dá para conversar). */
  readonly disponibilidade = this.iaDisponibilidade.estadoReal;
  /** Há texto abaixo da área visível (o usuário subiu para ler): mostra "ir para o fim". */
  readonly longeDoFim = signal(false);

  readonly controleTexto = new FormControl<string>('', { nonNullable: true });
  private readonly textoDigitado = signal('');

  readonly iaDesligada = computed(() => this.disponibilidade() === EstadoIaEnum.DESLIGADA);
  readonly iaForaDoAr = computed(() => this.disponibilidade() === EstadoIaEnum.FORA_DO_AR);
  readonly podeEnviar = computed(() => !this.enviando() && !this.somenteLeitura() && !this.iaDesligada() && this.textoDigitado().trim() !== '');
  /** Atalhos acima do campo: só com o campo vazio e a IA livre para receber. */
  private readonly sessao = inject(UsuarioSessaoService);
  /** As sugestões de quando a conversa ainda não tem nenhuma da IA: o que mais se faz por aqui (o gestor também cria demandas e projetos). */
  readonly sugestoesIniciais = computed(() => sugestoesIniciais(this.sessao.eGestor()));
  /** As sugestões que a IA trouxe junto da última resposta; somem quando o usuário manda outra mensagem. */
  readonly sugestoesDaIa = signal<string[]>([]);
  readonly sugestoes = computed(() => (this.sugestoesDaIa().length > 0 ? this.sugestoesDaIa() : this.sugestoesIniciais()));
  readonly podeSugerir = computed(() => !this.enviando() && !this.iaDesligada() && !this.somenteLeitura() && this.textoDigitado().trim() === '');
  /** O usuário resolveu um cartão (confirmou, ajustou, recusou ou desfez): a IA não responde a esse clique, então os botões seguem o que acabou de acontecer. */
  aoResolverProposta(proposta: PropostaIaResumoDto): void {
    const proximos = sugestoesAposProposta(proposta.tipo, proposta.status, this.sessao.eGestor());
    // Recusar, desfazer ou expirar não abrem um próximo passo: ficam os botões que já estavam.
    if (proximos.length > 0) this.sugestoesDaIa.set(proximos);
  }

  /** A última mensagem é a do sistema (falha): oferece "Tentar de novo". */
  readonly ultimaFoiFalha = computed(() => this.mensagens().at(-1)?.autor === AutorChatEnum.SISTEMA && !this.enviando());
  private contadorLocal = 0;
  /** O bom dia é tentado uma vez por abertura da tela (o servidor garante uma vez por dia). */
  private bomDiaTentado = false;
  /** O instante da última roda, toque, tecla ou clique na área de rolagem: é o que distingue "o usuário subiu" de "a conversa cresceu". */
  private ultimaInteracaoDoUsuario = 0;

  constructor() {
    this.controleTexto.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => this.textoDigitado.set(valor));
    effect(() => {
      // Acompanha a resposta que chega e as mensagens novas, a menos que o usuário tenha subido para ler.
      this.mensagens();
      this.aoVivo();
      untracked(() => {
        if (!this.longeDoFim()) this.rolarParaOFim();
      });
    });
    // Cartões e respostas crescem depois de renderizados: acompanha o tamanho do conteúdo, não só as mensagens.
    // Com a conversa de hoje carregada e a IA no ar, mas ainda sem resposta da IA, a IA dá o bom dia sozinha.
    effect(() => {
      const pronto = this.jaCarregou();
      const estado = this.disponibilidade();
      untracked(() => {
        if (pronto && estado === EstadoIaEnum.NO_AR) void this.darBomDia();
      });
    });
    // O usuário escolheu "Voltar para a IA": a IA lê o que mudou durante a queda e continua a conversa do dia.
    effect(() => {
      const pedida = this.iaDisponibilidade.retomadaPendente();
      const pronto = this.jaCarregou();
      const estado = this.disponibilidade();
      untracked(() => {
        if (pedida && pronto && estado === EstadoIaEnum.NO_AR && this.iaDisponibilidade.consumirRetomada()) void this.retomar();
      });
    });
    effect((aoLimpar) => {
      const alvo = this.fluxo()?.nativeElement;
      if (!alvo) return;
      const observador = new ResizeObserver(() => {
        if (!this.longeDoFim()) this.rolarParaOFim();
      });
      observador.observe(alvo);
      aoLimpar(() => observador.disconnect());
    });
    effect(() => {
      this.controleTexto[this.iaDesligada() || this.enviando() ? 'disable' : 'enable']({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    // Quem abre o chat à mão depois do "Agora não" está voltando para a IA.
    if (this.iaDisponibilidade.modoConvencional()) this.iaDisponibilidade.voltarParaAIa();
    this.carregar();
  }

  carregar(mensagemId?: string): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.iaDisponibilidade.carregar();
    this.chatService.recuperarHoje().subscribe({
      next: (hoje) => {
        if (!hoje.dados) {
          this.erro.set(true);
          this.carregando.set(false);
          return;
        }
        this.conversaId.set(hoje.dados.conversaId);
        this.hoje.set(dataDaConversa(hoje.dados.conversaId));
        this.mensagens.set(hoje.dados.mensagens.map((mensagem) => this.paraTela(mensagem)));
        this.carregando.set(false);
        this.jaCarregou.set(true);
        this.irParaMensagemOuFim(mensagemId);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  /** Envia o texto do campo (ou o que for passado, no "Tentar de novo"). */
  async enviar(textoReenvio?: string): Promise<void> {
    const texto = (textoReenvio ?? this.controleTexto.value).trim();
    if (!texto || this.enviando() || this.iaDesligada()) return;

    this.enviando.set(true);
    this.longeDoFim.set(false);
    this.sugestoesDaIa.set([]);
    const idLocal = `local-${++this.contadorLocal}`;
    this.mensagens.update((lista) => [
      ...lista,
      { id: idLocal, chave: idLocal, autor: AutorChatEnum.USUARIO, texto, nivel: null, propostaIds: [], criadaEm: new Date() },
    ]);
    if (textoReenvio === undefined) this.controleTexto.setValue('', { emitEvent: true });
    this.aoVivo.set(this.novaRespostaAoVivo());

    let terminou = false;
    try {
      await this.chatService.enviarMensagem(texto, (evento) => {
        if (evento.tipo === 'fim' || evento.tipo === 'erro') terminou = true;
        this.tratarEvento(evento);
      });
      if (!terminou) this.mostrarFalhaLocal('A conexão foi interrompida antes do fim da resposta.');
    } catch (erro) {
      const falha = erro as ErroDoChat;
      // Recusada antes de começar (IA desligada, mensagem em andamento): nada foi gravado, o texto volta ao campo.
      this.mensagens.update((lista) => lista.filter((mensagem) => mensagem.id !== idLocal));
      if (textoReenvio === undefined) this.controleTexto.setValue(texto);
      if (falha.status === 409) this.atualizarDisponibilidade();
      this.messageService.add({ severity: falha.status === 409 ? 'info' : 'warn', summary: 'Chat', detail: falha.mensagem ?? 'Não foi possível enviar a mensagem' });
    } finally {
      this.aoVivo.set(null);
      this.enviando.set(false);
      // A conversa pode ter ganhado nome (dado pela IA ao fim da primeira resposta do dia) e ela entra na lista se era a primeira.
      this.historico()?.recarregar();
      // O campo volta a ser habilitado na próxima detecção de mudanças; só então recebe o foco.
      setTimeout(() => this.campoDeTexto()?.nativeElement.focus(), 50);
    }
  }

  tentarDeNovo(): void {
    const ultimaDoUsuario = [...this.mensagens()].reverse().find((mensagem) => mensagem.autor === AutorChatEnum.USUARIO);
    if (ultimaDoUsuario) {
      void this.enviar(ultimaDoUsuario.texto);
      return;
    }
    // Sem mensagem do usuário, a falha foi a do bom dia: tira o aviso e tenta de novo.
    this.mensagens.update((lista) => lista.filter((mensagem) => mensagem.autor !== AutorChatEnum.SISTEMA));
    this.bomDiaTentado = false;
    void this.darBomDia();
  }

  /** Pede o bom dia: só em hoje, sem resposta da IA ainda e sem nada em andamento. O servidor decide se ainda vale (409 não é erro). */
  private async darBomDia(): Promise<void> {
    if (this.bomDiaTentado || this.enviando() || this.diaAberto() !== null) return;
    if (this.mensagens().some((mensagem) => mensagem.autor === AutorChatEnum.IA)) return;
    this.bomDiaTentado = true;
    await this.executarFluxoDoServidor((aoEvento) => this.chatService.iniciarBomDia(aoEvento));
  }

  /** Retoma a conversa de hoje depois de uma queda: só com conversa de hoje em andamento (sem resposta da IA ainda, o bom dia cobre). */
  private async retomar(): Promise<void> {
    if (this.enviando() || this.diaAberto() !== null) return;
    if (!this.mensagens().some((mensagem) => mensagem.autor === AutorChatEnum.IA)) return;
    await this.executarFluxoDoServidor((aoEvento) => this.chatService.iniciarRetomada(aoEvento));
  }

  /** A resposta que o servidor começa sozinho (bom dia ou retomada), mostrada ao vivo como as demais. */
  private async executarFluxoDoServidor(iniciar: (aoEvento: (evento: ChatEventoDto) => void) => Promise<void>): Promise<void> {
    this.enviando.set(true);
    this.longeDoFim.set(false);
    this.aoVivo.set(this.novaRespostaAoVivo());
    let terminou = false;
    try {
      await iniciar((evento) => {
        if (evento.tipo === 'fim' || evento.tipo === 'erro') terminou = true;
        this.tratarEvento(evento);
      });
      if (!terminou) this.aoVivo.set(null);
    } catch (erro) {
      const falha = erro as ErroDoChat;
      // 409: alguém (outra aba) já deu o bom dia, ou a IA foi desligada. Só relê a conversa; os outros erros ficam no aviso do estado.
      if (falha.status === 409) {
        this.carregar();
        this.atualizarDisponibilidade();
      }
    } finally {
      this.aoVivo.set(null);
      this.enviando.set(false);
      this.historico()?.recarregar();
    }
  }

  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter' || evento.shiftKey || evento.isComposing) return;
    evento.preventDefault();
    void this.enviar();
  }

  /** O usuário mexeu na área de rolagem (roda, toque, tecla ou clique na barra): o próximo evento de rolagem é dele. */
  aoInteragirComARolagem(): void {
    this.ultimaInteracaoDoUsuario = Date.now();
  }

  /**
   * Decide se o usuário está lendo mais acima (aparece "Ir para o fim" e a conversa deixa de acompanhar). Só conta como "subiu" a rolagem
   * que veio de uma interação dele: um cartão que carrega e cresce a conversa também faz o fim ficar longe, e aí a conversa continua
   * acompanhando em vez de largar o usuário no meio do caminho.
   */
  aoRolar(): void {
    const area = this.areaDeRolagem()?.nativeElement;
    if (!area) return;
    const distanciaDoFim = area.scrollHeight - area.scrollTop - area.clientHeight;
    if (distanciaDoFim <= MARGEM_DO_FIM_PX) {
      this.longeDoFim.set(false);
      return;
    }
    if (Date.now() - this.ultimaInteracaoDoUsuario < JANELA_DA_INTERACAO_MS) this.longeDoFim.set(true);
    else if (!this.longeDoFim()) this.rolarParaOFim();
  }

  irParaOFim(): void {
    this.longeDoFim.set(false);
    this.rolarParaOFim();
  }

  /** Abre um dia da lista do histórico: hoje volta à conversa viva; os outros abrem só para leitura. */
  abrirDia(data: string, mensagemId?: string): void {
    if (data === this.hoje()) {
      this.voltarParaHoje(mensagemId);
      return;
    }
    this.chatService.recuperarConversa(data).subscribe({
      next: (resposta) => {
        if (!resposta.dados) return;
        this.diaAberto.set(data);
        this.conversaId.set(resposta.dados.conversaId);
        this.mensagens.set(resposta.dados.mensagens.map((mensagem) => this.paraTela(mensagem)));
        this.irParaMensagemOuFim(mensagemId);
      },
      error: () => this.messageService.add({ severity: 'warn', summary: 'Chat', detail: 'Não foi possível abrir essa conversa' }),
    });
  }

  /** Com a IA fora do ar ou desligada, a tela convencional de Atividades (o fallback). */
  irParaAtividades(): void {
    void this.roteador.navigateByUrl('/atividade');
  }

  voltarParaHoje(mensagemId?: string): void {
    this.diaAberto.set(null);
    this.carregar(mensagemId);
  }

  abrirMensagem(escolhida: MensagemDoHistorico): void {
    this.abrirDia(escolhida.data, escolhida.mensagemId);
  }

  async copiar(texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      this.messageService.add({ severity: 'success', summary: 'Copiado', detail: 'Resposta copiada', life: 2000 });
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Chat', detail: 'Não foi possível copiar' });
    }
  }

  /** Rola até a mensagem (centralizada) ou, sem ela, até o fim do dia aberto. */
  private irParaMensagemOuFim(mensagemId?: string): void {
    if (!mensagemId) {
      this.longeDoFim.set(false);
      this.rolarParaOFim();
      return;
    }
    this.longeDoFim.set(true);
    setTimeout(() => {
      const alvo = this.areaDeRolagem()?.nativeElement.querySelector<HTMLElement>(`[data-mensagem-id="${mensagemId}"]`);
      alvo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 50);
  }

  private tratarEvento(evento: ChatEventoDto): void {
    switch (evento.tipo) {
      case 'trecho':
        this.aoVivo.update((atual) => atual && { ...atual, texto: atual.texto + evento.texto });
        break;
      case 'ferramenta':
        this.aoVivo.update((atual) => atual && { ...atual, ferramenta: evento.situacao === 'EXECUTANDO' ? evento.nome : null });
        break;
      case 'proposta':
        this.aoVivo.update((atual) => atual && { ...atual, propostaIds: [...atual.propostaIds, evento.propostaId] });
        break;
      case 'fim': {
        const resposta = this.aoVivo();
        const mensagem = this.paraTela(evento.mensagem);
        mensagem.propostaIds = [...new Set([...(resposta?.propostaIds ?? []), ...mensagem.propostaIds])];
        // A mesma chave faz a lista trocar a resposta em andamento pela gravada sem recriar o elemento nem os cartões.
        if (resposta) mensagem.chave = resposta.chave;
        this.mensagens.update((lista) => [...lista, mensagem]);
        this.aoVivo.set(null);
        this.atualizarDisponibilidade();
        break;
      }
      case 'sugestoes':
        this.sugestoesDaIa.set(evento.itens);
        break;
      case 'erro':
        this.aoVivo.set(null);
        this.mostrarFalhaLocal(evento.mensagem);
        this.atualizarDisponibilidade();
        break;
    }
  }

  private mostrarFalhaLocal(texto: string): void {
    const idLocal = `local-${++this.contadorLocal}`;
    this.mensagens.update((lista) => [
      ...lista,
      { id: idLocal, chave: idLocal, autor: AutorChatEnum.SISTEMA, texto, nivel: null, propostaIds: [], criadaEm: new Date() },
    ]);
  }

  private novaRespostaAoVivo(): RespostaAoVivo {
    return { chave: `ao-vivo-${++this.contadorLocal}`, texto: '', ferramenta: null, propostaIds: [] };
  }

  private atualizarDisponibilidade(): void {
    this.iaDisponibilidade.carregar();
  }

  private paraTela(mensagem: ChatMensagemResumoDto): MensagemNaTela {
    return {
      id: mensagem.id,
      chave: mensagem.id,
      autor: mensagem.autor,
      texto: mensagem.texto,
      nivel: mensagem.nivel,
      propostaIds: mensagem.propostaIds,
      criadaEm: new Date(mensagem.createdDate),
    };
  }

  private rolarParaOFim(): void {
    setTimeout(() => {
      const area = this.areaDeRolagem()?.nativeElement;
      if (area) area.scrollTop = area.scrollHeight;
    });
  }
}
