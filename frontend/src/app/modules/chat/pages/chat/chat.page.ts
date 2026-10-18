import { Component, ElementRef, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { AutorChatEnum, ChatEventoDto, ChatMensagemResumoDto, EstadoIaEnum, NivelIaEnum } from '@project20/shared';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { HistoricoComponent, MensagemDoHistorico } from '../../components/historico/historico.component';
import { PropostaCartaoComponent } from '../../components/proposta-cartao/proposta-cartao.component';
import { ChatService, ErroDoChat } from '../../services/chat.service';
import { dataDaConversa, ROTULO_NIVEL } from '../../utils/chat.util';

/** Uma mensagem como a tela a mostra: as da conversa do dia mais as locais (otimistas), com os cartões de proposta ligados a ela. */
interface MensagemNaTela {
  id: string;
  autor: AutorChatEnum;
  texto: string;
  nivel: NivelIaEnum | null;
  propostaIds: number[];
  criadaEm: Date | null;
}

/** A resposta que está chegando: cresce a cada `trecho` e vira uma mensagem da conversa no `fim`. */
interface RespostaAoVivo {
  texto: string;
  ferramenta: string | null;
  propostaIds: number[];
}

/** Distância do fim (px) até a qual a conversa continua acompanhando a resposta que chega. */
const MARGEM_DO_FIM_PX = 80;

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
  readonly conversaId = signal<string>('');
  /** O dia de hoje no servidor (`yyyy-mm-dd`, do id da conversa de hoje); vazio até a primeira carga. */
  readonly hoje = signal('');
  /** O dia aberto no lugar de hoje (`yyyy-mm-dd`), só para leitura; `null` é a conversa de hoje. */
  readonly diaAberto = signal<string | null>(null);
  readonly somenteLeitura = computed(() => this.diaAberto() !== null);
  readonly diaExibido = computed(() => this.diaAberto() ?? this.hoje());
  readonly diaFormatado = computed(() => this.diaAberto()?.split('-').reverse().join('/') ?? '');
  readonly disponibilidade = this.iaDisponibilidade.estado;
  /** Há texto abaixo da área visível (o usuário subiu para ler): mostra "ir para o fim". */
  readonly longeDoFim = signal(false);

  readonly controleTexto = new FormControl<string>('', { nonNullable: true });
  private readonly textoDigitado = signal('');

  readonly iaDesligada = computed(() => this.disponibilidade() === EstadoIaEnum.DESLIGADA);
  readonly iaForaDoAr = computed(() => this.disponibilidade() === EstadoIaEnum.FORA_DO_AR);
  readonly podeEnviar = computed(() => !this.enviando() && !this.somenteLeitura() && !this.iaDesligada() && this.textoDigitado().trim() !== '');
  /** Atalhos acima do campo: só com o campo vazio e a IA livre para receber. */
  readonly sugestoes = ['Que dia e hora são agora?', 'O que eu posso fazer por aqui?'];
  readonly podeSugerir = computed(() => !this.enviando() && !this.iaDesligada() && !this.somenteLeitura() && this.textoDigitado().trim() === '');
  /** A última mensagem é a do sistema (falha): oferece "Tentar de novo". */
  readonly ultimaFoiFalha = computed(() => this.mensagens().at(-1)?.autor === AutorChatEnum.SISTEMA && !this.enviando());
  private contadorLocal = 0;

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
    const idLocal = `local-${++this.contadorLocal}`;
    this.mensagens.update((lista) => [
      ...lista,
      { id: idLocal, autor: AutorChatEnum.USUARIO, texto, nivel: null, propostaIds: [], criadaEm: new Date() },
    ]);
    if (textoReenvio === undefined) this.controleTexto.setValue('', { emitEvent: true });
    this.aoVivo.set({ texto: '', ferramenta: null, propostaIds: [] });

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
      // O campo volta a ser habilitado na próxima detecção de mudanças; só então recebe o foco.
      setTimeout(() => this.campoDeTexto()?.nativeElement.focus(), 50);
    }
  }

  tentarDeNovo(): void {
    const ultimaDoUsuario = [...this.mensagens()].reverse().find((mensagem) => mensagem.autor === AutorChatEnum.USUARIO);
    if (ultimaDoUsuario) void this.enviar(ultimaDoUsuario.texto);
  }

  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter' || evento.shiftKey || evento.isComposing) return;
    evento.preventDefault();
    void this.enviar();
  }

  aoRolar(): void {
    const area = this.areaDeRolagem()?.nativeElement;
    if (!area) return;
    this.longeDoFim.set(area.scrollHeight - area.scrollTop - area.clientHeight > MARGEM_DO_FIM_PX);
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
        const propostasDoFluxo = this.aoVivo()?.propostaIds ?? [];
        const mensagem = this.paraTela(evento.mensagem);
        mensagem.propostaIds = [...new Set([...propostasDoFluxo, ...mensagem.propostaIds])];
        this.aoVivo.set(null);
        this.mensagens.update((lista) => [...lista, mensagem]);
        this.historico()?.recarregar();
        this.atualizarDisponibilidade();
        break;
      }
      case 'erro':
        this.aoVivo.set(null);
        this.mostrarFalhaLocal(evento.mensagem);
        this.atualizarDisponibilidade();
        break;
    }
  }

  private mostrarFalhaLocal(texto: string): void {
    this.mensagens.update((lista) => [
      ...lista,
      { id: `local-${++this.contadorLocal}`, autor: AutorChatEnum.SISTEMA, texto, nivel: null, propostaIds: [], criadaEm: new Date() },
    ]);
  }

  private atualizarDisponibilidade(): void {
    this.iaDisponibilidade.carregar();
  }

  private paraTela(mensagem: ChatMensagemResumoDto): MensagemNaTela {
    return {
      id: mensagem.id,
      autor: mensagem.autor,
      texto: mensagem.texto,
      nivel: mensagem.nivel,
      propostaIds: mensagem.propostaId !== null ? [mensagem.propostaId] : [],
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
