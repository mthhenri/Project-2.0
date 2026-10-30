import { Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckinSituacaoConsultadaDto, ChatEventoDto, EstadoIaEnum } from '@project20/shared';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { EditorMensagemComponent } from '../../../../shared/components/editor-mensagem/editor-mensagem.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { ToastDesfazerComponent } from '../../../../shared/components/toast-desfazer/toast-desfazer.component';
import { PropostaCartaoComponent } from '../../../chat/components/proposta-cartao/proposta-cartao.component';
import { ChatService, ErroDoChat } from '../../../chat/services/chat.service';
import { COMECO_DO_AVISO_DE_LIMITE, formatarDuracao, LIMITE_MENSAGEM_CHAT } from '../../../chat/utils/chat.util';
import { CheckinService } from '../../services/checkin.service';
import { EstadoDoCheckin, decidirEstado } from '../../utils/checkin.util';

/** De quanto em quanto tempo a janela confere a situação (para saber que a descrição foi confirmada ou que os check-ins foram suspensos). */
const INTERVALO_DA_SITUACAO_MS = 3000;
/** Quanto a janela espera, sem execução em andamento, antes de se fechar sozinha. */
const ESPERA_PARA_FECHAR_MS = 5000;
/** Dentro do Project, depois de registrar, quanto a janelinha espera antes de sumir sozinha. */
const ESPERA_PARA_SUMIR_REGISTRADO_MS = 2500;
const CAMINHO_DA_CONVERSA = '/checkin/mensagem';
/** Até onde do fim da conversa (px) o usuário ainda conta como "no fim". */
const MARGEM_DO_FIM_PX = 80;
/** Quanto tempo (ms) depois de uma roda, toque, tecla ou clique um evento de rolagem ainda conta como do usuário. */
const JANELA_DA_INTERACAO_MS = 400;

/** A ponte que o Project Desktop expõe à página (`desktop/src/preload.ts`); no navegador comum não existe. */
interface PonteDoDesktop {
  encerrarCheckin(): void;
}
function ponteDoDesktop(): PonteDoDesktop | null {
  return (window as unknown as { projectDesktop?: PonteDoDesktop }).projectDesktop ?? null;
}
const SUGESTOES = ['Terminei o que estava fazendo', 'Vou trocar de atividade', 'Vou entrar numa reunião'];

interface MensagemDoCheckin {
  id: number;
  /** Identidade do item na lista: a resposta em andamento e a mensagem gravada que a substitui têm a mesma, então os cartões não são recriados. */
  chave: string;
  aoVivo?: boolean;
  ferramenta?: string | null;
  autor: 'USUARIO' | 'IA';
  texto: string;
  propostaIds: number[];
}

interface RespostaAoVivo {
  chave: string;
  texto: string;
  ferramenta: string | null;
  propostaIds: number[];
}

/**
 * Janela do check-in (task 151): a tela que o app Electron traz à frente, num layout próprio (sem menu). Mostra a execução em andamento
 * com a duração (e o selo de rigor acima do recomendado), conversa com a IA com streaming e mostra a proposta de descrição para o
 * desenvolvedor confirmar. Só fecha quando a descrição é registrada ou os check-ins são suspensos (reunião). Análogo visual: a tela do
 * Chat (task 139), de onde vêm os balões, o campo de entrada e o cartão de proposta.
 *
 * Também é a janelinha do check-in **dentro do Project** (task 161): com `embutido` ela preenche o espaço do diálogo central, não leva
 * os toasts (o layout já tem os dele) e avisa `encerrado` em vez de fechar a janela. No Project Desktop (task 160) é a janelinha sem
 * moldura: o cabeçalho arrasta a janela e, ao terminar, a página avisa o desktop para fechá-la.
 */
@Component({
  selector: 'app-checkin-page',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, EditorMensagemComponent, ToastModule, TooltipModule, MarkdownVisualizadorComponent, PropostaCartaoComponent, ToastDesfazerComponent],
  templateUrl: './checkin.page.html',
  styleUrl: './checkin.page.scss',
  host: { '[class.checkin-embutido]': 'embutido()', '[class.checkin-no-desktop]': 'noDesktop' },
})
export class CheckinPage implements OnInit {
  private readonly checkinService = inject(CheckinService);
  private readonly chatService = inject(ChatService);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
  private readonly messageService = inject(MessageService);
  private readonly roteador = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly areaDeRolagem = viewChild<ElementRef<HTMLElement>>('rolagem');
  private readonly fluxo = viewChild<ElementRef<HTMLElement>>('fluxo');
  private readonly campoDeTexto = viewChild(EditorMensagemComponent);

  readonly formatarDuracao = formatarDuracao;
  readonly sugestoes = SUGESTOES;

  /** Dentro do diálogo do Project (em vez de numa janela própria). */
  readonly embutido = input(false);
  /** Embutida: a descrição foi registrada, os check-ins foram suspensos ou não havia o que fazer. O diálogo pode sumir. */
  readonly encerrado = output<void>();
  /** Aberta pela janelinha do Project Desktop (sem moldura, que o desktop fecha quando a página avisa). */
  readonly noDesktop = ponteDoDesktop() !== null;

  readonly situacao = signal<CheckinSituacaoConsultadaDto | null>(null);
  readonly erroDeCarga = signal(false);
  readonly estadoDaSituacao = signal<EstadoDoCheckin>('CARREGANDO');
  readonly mensagens = signal<MensagemDoCheckin[]>([]);
  readonly aoVivo = signal<RespostaAoVivo | null>(null);
  /** O que a conversa mostra: as mensagens e, no fim, a resposta em andamento como mais um item (que vira a gravada sem sumir). */
  readonly itens = computed<MensagemDoCheckin[]>(() => {
    const resposta = this.aoVivo();
    if (!resposta) return this.mensagens();
    const emAndamento: MensagemDoCheckin = {
      id: 0, chave: resposta.chave, autor: 'IA', texto: resposta.texto, propostaIds: resposta.propostaIds, aoVivo: true, ferramenta: resposta.ferramenta,
    };
    return [...this.mensagens(), emAndamento];
  });
  readonly enviando = signal(false);
  readonly controleTexto = new FormControl<string>('', { nonNullable: true });
  private readonly textoDigitado = signal('');
  private execucaoDaAbertura: number | null = null;
  private contadorLocal = 0;
  /** O usuário subiu para ler: a conversa deixa de acompanhar até ele voltar ao fim. */
  private longeDoFim = false;
  private ultimaInteracaoDoUsuario = 0;
  private temporizadorSituacao: ReturnType<typeof setInterval> | null = null;

  /** O estado da janela: a IA indisponível tem precedência sobre o check-in (o fallback da task 157 assume dali). */
  readonly estado = computed<EstadoDoCheckin>(() => {
    const estadoDaIa = this.iaDisponibilidade.estado();
    const base = this.estadoDaSituacao();
    if (base === 'EM_ANDAMENTO' && estadoDaIa !== null && estadoDaIa !== EstadoIaEnum.NO_AR) return 'IA_INDISPONIVEL';
    return base;
  });
  readonly acimaDoRecomendado = computed(() => this.situacao()?.acimaDoRecomendado ?? false);
  readonly podeEnviar = computed(() => !this.enviando() && this.estado() === 'EM_ANDAMENTO' && this.textoDigitado().trim() !== '' && !this.excedeuOLimite());
  readonly excedeuOLimite = computed(() => this.textoDigitado().length > LIMITE_MENSAGEM_CHAT);
  readonly mostrarContador = computed(() => this.textoDigitado().length >= COMECO_DO_AVISO_DE_LIMITE);
  readonly contador = computed(() => `${this.textoDigitado().length.toLocaleString('pt-BR')} / ${LIMITE_MENSAGEM_CHAT.toLocaleString('pt-BR')}`);
  readonly podeSugerir = computed(() => !this.enviando() && this.estado() === 'EM_ANDAMENTO' && this.textoDigitado().trim() === '');
  readonly textoDeAbertura = computed(() => {
    const dados = this.situacao();
    if (!dados?.execucao) return '';
    const tempo = formatarDuracao(dados.execucao.minutos);
    const pedido = dados.acimaDoRecomendado
      ? `Já faz ${tempo}, mais do que o recomendado (${formatarDuracao(dados.duracaoRecomendadaMinutos)}): conte com um pouco mais de detalhe.`
      : `Já faz ${tempo}. Conte do seu jeito o que você fez.`;
    return `Hora do check-in em **${dados.execucao.atividade}**. ${pedido}`;
  });

  constructor() {
    this.controleTexto.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => this.textoDigitado.set(valor));
    effect(() => {
      this.controleTexto[this.estado() === 'EM_ANDAMENTO' && !this.enviando() ? 'enable' : 'disable']({ emitEvent: false });
    });
    effect(() => {
      this.mensagens();
      this.aoVivo();
      untracked(() => {
        if (!this.longeDoFim) this.rolarParaOFim();
      });
    });
    // Cartões e respostas crescem depois de renderizados: acompanha o tamanho do conteúdo, não só as mensagens.
    effect((aoLimpar) => {
      const alvo = this.fluxo()?.nativeElement;
      if (!alvo || typeof ResizeObserver === 'undefined') return;
      const observador = new ResizeObserver(() => {
        if (!this.longeDoFim) this.rolarParaOFim();
      });
      observador.observe(alvo);
      aoLimpar(() => observador.disconnect());
    });
    // Sem execução em andamento, a janela explica e se fecha sozinha.
    effect((aoLimpar) => {
      if (this.estado() !== 'SEM_EXECUCAO') return;
      const temporizador = setTimeout(() => this.fechar(), ESPERA_PARA_FECHAR_MS);
      aoLimpar(() => clearTimeout(temporizador));
    });
    // Dentro do Project, o check-in registrado some sozinho depois de uma pausa para o usuário ver a confirmação.
    effect((aoLimpar) => {
      if (!(this.embutido() || this.noDesktop) || this.estado() !== 'REGISTRADO') return;
      const temporizador = setTimeout(() => this.fechar(), ESPERA_PARA_SUMIR_REGISTRADO_MS);
      aoLimpar(() => clearTimeout(temporizador));
    });
    this.destroyRef.onDestroy(() => this.pararDeConferir());
  }

  ngOnInit(): void {
    this.iaDisponibilidade.carregar();
    this.carregar();
  }

  carregar(): void {
    this.erroDeCarga.set(false);
    this.estadoDaSituacao.set('CARREGANDO');
    this.checkinService.consultarSituacao().subscribe({
      next: (resposta) => {
        const dados = resposta.dados;
        if (!dados) {
          this.erroDeCarga.set(true);
          this.estadoDaSituacao.set('ERRO');
          return;
        }
        this.situacao.set(dados);
        this.execucaoDaAbertura = dados.execucao?.id ?? null;
        this.estadoDaSituacao.set(decidirEstado(dados, null));
        if (this.estadoDaSituacao() === 'EM_ANDAMENTO') this.comecarAConferir();
      },
      error: () => {
        this.erroDeCarga.set(true);
        this.estadoDaSituacao.set('ERRO');
      },
    });
  }

  /** O usuário mexeu na área de rolagem (roda, toque, tecla ou clique): o próximo evento de rolagem é dele. */
  aoInteragirComARolagem(): void {
    this.ultimaInteracaoDoUsuario = Date.now();
  }

  /** Só conta como "subiu" a rolagem que veio de uma interação do usuário; um cartão que cresce não larga ele no meio do caminho. */
  aoRolar(): void {
    const area = this.areaDeRolagem()?.nativeElement;
    if (!area) return;
    if (area.scrollHeight - area.scrollTop - area.clientHeight <= MARGEM_DO_FIM_PX) {
      this.longeDoFim = false;
      return;
    }
    if (Date.now() - this.ultimaInteracaoDoUsuario < JANELA_DA_INTERACAO_MS) this.longeDoFim = true;
    else if (!this.longeDoFim) this.rolarParaOFim();
  }

  aoMudarTexto(markdown: string): void {
    this.controleTexto.setValue(markdown);
  }

  /** Segue o chat: Enter envia fora de listas e código; Ctrl+Enter envia em qualquer bloco. */
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter' || evento.isComposing) return;
    const editor = this.campoDeTexto()?.editor();
    if (!editor) return;
    if (evento.ctrlKey || evento.metaKey) {
      evento.preventDefault();
      evento.stopPropagation();
      void this.enviar();
      return;
    }
    const contexto = editor.contextoDoCursor();
    if (evento.shiftKey) {
      if (!contexto.emCodigo) {
        evento.preventDefault();
        evento.stopPropagation();
        editor.dividirBloco();
      }
      return;
    }
    if (!contexto.emLista && !contexto.emCodigo) {
      evento.preventDefault();
      evento.stopPropagation();
      void this.enviar();
    }
  }

  async enviar(textoPronto?: string): Promise<void> {
    const texto = (textoPronto ?? this.controleTexto.value).trim();
    if (!texto || texto.length > LIMITE_MENSAGEM_CHAT || (textoPronto === undefined && this.excedeuOLimite()) || this.enviando() || this.estado() !== 'EM_ANDAMENTO') return;

    this.enviando.set(true);
    this.mensagens.update((lista) => [...lista, { id: ++this.contadorLocal, chave: `local-${this.contadorLocal}`, autor: 'USUARIO', texto, propostaIds: [] }]);
    if (textoPronto === undefined) this.campoDeTexto()?.limpar();
    this.longeDoFim = false;
    this.aoVivo.set({ chave: `ao-vivo-${++this.contadorLocal}`, texto: '', ferramenta: null, propostaIds: [] });
    let terminou = false;
    try {
      await this.chatService.enviarMensagem(
        texto,
        (evento) => {
          if (evento.tipo === 'fim' || evento.tipo === 'erro') terminou = true;
          this.tratarEvento(evento);
        },
        undefined,
        CAMINHO_DA_CONVERSA,
      );
      if (!terminou) this.mostrarFalha('A conexão foi interrompida antes do fim da resposta.');
    } catch (erro) {
      const falha = erro as ErroDoChat;
      // Recusada antes de começar (IA desligada, sem execução em andamento): o texto volta ao campo.
      this.mensagens.update((lista) => lista.slice(0, -1));
      if (textoPronto === undefined) this.campoDeTexto()?.definirTexto(texto);
      this.messageService.add({ severity: falha.status === 409 ? 'info' : 'warn', summary: 'Check-in', detail: falha.mensagem ?? 'Não foi possível enviar a mensagem' });
      if (falha.status === 409) this.conferirSituacao();
    } finally {
      this.aoVivo.set(null);
      this.enviando.set(false);
      setTimeout(() => this.campoDeTexto()?.focar(), 50);
      this.conferirSituacao();
    }
  }

  /** Fecha a janela (no Electron, a janela some; no navegador, volta ao sistema). */
  fechar(): void {
    this.pararDeConferir();
    if (this.embutido()) {
      this.encerrado.emit();
      return;
    }
    const desktop = ponteDoDesktop();
    if (desktop) {
      desktop.encerrarCheckin();
      return;
    }
    window.close();
    // `window.close()` só fecha o que o próprio script abriu: no navegador comum a tela volta ao sistema.
    setTimeout(() => void this.roteador.navigateByUrl('/chat'), 150);
  }

  irParaAtividades(): void {
    void this.roteador.navigateByUrl('/atividade');
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
        const propostas = [...new Set([...(resposta?.propostaIds ?? []), ...evento.mensagem.propostaIds])];
        // A mesma chave faz a lista trocar a resposta em andamento pela gravada sem recriar o elemento nem os cartões.
        const chave = resposta?.chave ?? `local-${++this.contadorLocal}`;
        this.mensagens.update((lista) => [...lista, { id: ++this.contadorLocal, chave, autor: 'IA', texto: evento.mensagem.texto, propostaIds: propostas }]);
        this.aoVivo.set(null);
        break;
      }
      case 'erro':
        this.aoVivo.set(null);
        this.mostrarFalha(evento.mensagem);
        break;
    }
  }

  private mostrarFalha(texto: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Check-in', detail: texto });
  }

  /** Confere a situação a cada poucos segundos: a descrição confirmada (a execução mudou) e a suspensão por reunião liberam a janela. */
  private comecarAConferir(): void {
    this.pararDeConferir();
    this.temporizadorSituacao = setInterval(() => this.conferirSituacao(), INTERVALO_DA_SITUACAO_MS);
  }

  private pararDeConferir(): void {
    if (this.temporizadorSituacao !== null) clearInterval(this.temporizadorSituacao);
    this.temporizadorSituacao = null;
  }

  private conferirSituacao(): void {
    if (this.estadoDaSituacao() === 'CARREGANDO' || this.estadoDaSituacao() === 'ERRO') return;
    this.checkinService.consultarSituacao().subscribe({
      next: (resposta) => {
        const dados = resposta.dados;
        if (!dados) return;
        this.situacao.set(dados);
        const novo = decidirEstado(dados, this.execucaoDaAbertura);
        this.estadoDaSituacao.set(novo);
        if (novo !== 'EM_ANDAMENTO') this.pararDeConferir();
      },
      error: () => undefined,
    });
  }

  private rolarParaOFim(): void {
    setTimeout(() => {
      const area = this.areaDeRolagem()?.nativeElement;
      if (area) area.scrollTop = area.scrollHeight;
    });
  }
}
