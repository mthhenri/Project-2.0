import { Component, ElementRef, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AutorChatEnum, ChatEventoDto, ChatMensagemResumoDto, EstadoIaEnum, NivelIaEnum } from '@project20/shared';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { PropostaCartaoComponent } from '../../components/proposta-cartao/proposta-cartao.component';
import { ChatService, ErroDoChat } from '../../services/chat.service';
import { ROTULO_NIVEL } from '../../utils/chat.util';

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
    InputTextModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    MarkdownVisualizadorComponent,
    PropostaCartaoComponent,
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
  readonly disponibilidade = this.iaDisponibilidade.estado;
  /** Há texto abaixo da área visível (o usuário subiu para ler): mostra "ir para o fim". */
  readonly longeDoFim = signal(false);

  readonly controleTexto = new FormControl<string>('', { nonNullable: true });
  private readonly textoDigitado = signal('');
  readonly controleBusca = new FormControl<string>('', { nonNullable: true });
  readonly resultadosBusca = signal<ChatMensagemResumoDto[] | null>(null);
  readonly buscando = signal(false);

  readonly iaDesligada = computed(() => this.disponibilidade() === EstadoIaEnum.DESLIGADA);
  readonly iaForaDoAr = computed(() => this.disponibilidade() === EstadoIaEnum.FORA_DO_AR);
  readonly podeEnviar = computed(() => !this.enviando() && !this.iaDesligada() && this.textoDigitado().trim() !== '');
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

  carregar(): void {
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
        this.mensagens.set(hoje.dados.mensagens.map((mensagem) => this.paraTela(mensagem)));
        this.carregando.set(false);
        this.jaCarregou.set(true);
        this.longeDoFim.set(false);
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

  buscar(): void {
    const texto = this.controleBusca.value.trim();
    if (!texto) {
      this.resultadosBusca.set(null);
      return;
    }
    this.buscando.set(true);
    this.chatService.buscar(texto).subscribe({
      next: (resposta) => {
        this.resultadosBusca.set(resposta.dados?.mensagens ?? []);
        this.buscando.set(false);
      },
      error: () => this.buscando.set(false),
    });
  }

  limparBusca(): void {
    this.controleBusca.setValue('');
    this.resultadosBusca.set(null);
  }

  /** O resultado é de hoje (a única conversa que a tela abre): leva até a mensagem. */
  ehDeHoje(resultado: ChatMensagemResumoDto): boolean {
    return resultado.conversaId === this.conversaId();
  }

  verNoDia(resultado: ChatMensagemResumoDto): void {
    this.limparBusca();
    setTimeout(() => {
      const alvo = this.areaDeRolagem()?.nativeElement.querySelector<HTMLElement>(`[data-mensagem-id="${resultado.id}"]`);
      alvo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      this.longeDoFim.set(true);
    });
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
