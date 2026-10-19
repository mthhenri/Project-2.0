import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { AutorChatEnum, ChatConversaResumoDto, ChatMensagemResumoDto, LIMITE_TITULO_CONVERSA_EDITADO } from '@project20/shared';
import { ChatService } from '../../services/chat.service';
import { dataDaConversa, rotuloDoDia } from '../../utils/chat.util';

const CHAVE_ABERTO = 'chat.historico.aberto';

/** Uma mensagem achada na busca, com o dia a que pertence (para abrir a conversa certa). */
export interface MensagemDoHistorico {
  data: string;
  mensagemId: string;
}

/**
 * Painel de histórico do chat (task 141): a busca nas conversas e a lista dos dias com conversa, que recolhe para uma faixa estreita
 * (o estado fica em `localStorage`). Não conhece a conversa aberta: só avisa qual dia ou mensagem o usuário escolheu.
 * Análogo visual: o histórico da aba de Prompts (task 133).
 */
@Component({
  selector: 'app-chat-historico',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, TooltipModule],
  templateUrl: './historico.component.html',
  styleUrl: './historico.component.scss',
  host: { '[class.chat-historico--recolhido]': '!aberto()' },
})
export class HistoricoComponent {
  /** O dia que está na tela (`yyyy-mm-dd`), para marcá-lo na lista. */
  readonly diaAtual = input.required<string>();
  /** O dia de hoje no servidor, para rotular "Hoje" e "Ontem". */
  readonly hoje = input.required<string>();

  readonly diaEscolhido = output<string>();
  readonly mensagemEscolhida = output<MensagemDoHistorico>();

  readonly Autor = AutorChatEnum;
  readonly rotuloDoDia = rotuloDoDia;
  readonly limiteNome = LIMITE_TITULO_CONVERSA_EDITADO;
  readonly aberto = signal(this.lerAberto());
  readonly conversas = signal<ChatConversaResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly resultados = signal<ChatMensagemResumoDto[] | null>(null);
  readonly buscando = signal(false);
  readonly controleBusca = new FormControl<string>('', { nonNullable: true });
  /** A conversa cujo nome está sendo editado (`conversaId`) e o campo da edição. */
  readonly editandoId = signal<string | null>(null);
  readonly salvandoNome = signal(false);
  readonly controleNome = new FormControl<string>('', { nonNullable: true });

  private readonly campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');
  private readonly chatService = inject(ChatService);
  private readonly messageService = inject(MessageService);

  constructor() {
    this.recarregar();
  }

  recarregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.chatService.listarConversas().subscribe({
      next: (resposta) => {
        this.conversas.set(resposta.dados?.conversas ?? []);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  alternar(): void {
    const proximo = !this.aberto();
    this.aberto.set(proximo);
    try {
      localStorage.setItem(CHAVE_ABERTO, String(proximo));
    } catch {
      // Sem armazenamento (janela privada, dados bloqueados): o painel funciona, só não lembra.
    }
  }

  buscar(): void {
    const texto = this.controleBusca.value.trim();
    if (!texto) {
      this.resultados.set(null);
      return;
    }
    this.buscando.set(true);
    this.chatService.buscar(texto).subscribe({
      next: (resposta) => {
        this.resultados.set(resposta.dados?.mensagens ?? []);
        this.buscando.set(false);
      },
      error: () => this.buscando.set(false),
    });
  }

  /** Troca o nome da linha por um campo, já com o nome de hoje selecionado. */
  iniciarEdicao(conversa: ChatConversaResumoDto): void {
    this.controleNome.setValue(conversa.titulo);
    this.editandoId.set(conversa.conversaId);
    setTimeout(() => {
      const campo = this.campoNome()?.nativeElement;
      campo?.focus();
      campo?.select();
    });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
  }

  /**
   * Enter ou perder o foco salva; em branco volta ao nome padrão. Sem mudança, só fecha o campo. Falha mantém o campo aberto com o aviso.
   * `salvandoNome` impede o salvamento duplo (Enter e depois o blur do campo que some).
   */
  salvarNome(conversa: ChatConversaResumoDto): void {
    if (this.editandoId() !== conversa.conversaId || this.salvandoNome()) return;
    const digitado = this.controleNome.value.trim();
    if (digitado === conversa.titulo) {
      this.cancelarEdicao();
      return;
    }
    this.salvandoNome.set(true);
    this.chatService.alterarTituloConversa(conversa.data, digitado).subscribe({
      next: (resposta) => {
        const alterado = resposta.dados;
        if (alterado) {
          this.conversas.update((lista) =>
            lista.map((item) => (item.conversaId === alterado.conversaId ? { ...item, titulo: alterado.titulo, tituloEditado: alterado.tituloEditado } : item)),
          );
        }
        this.salvandoNome.set(false);
        this.cancelarEdicao();
      },
      error: (falha) => {
        this.salvandoNome.set(false);
        this.messageService.add({ severity: 'warn', summary: 'Chat', detail: falha?.mensagem ?? 'Não foi possível renomear a conversa' });
      },
    });
  }

  limparBusca(): void {
    this.controleBusca.setValue('');
    this.resultados.set(null);
  }

  escolherResultado(resultado: ChatMensagemResumoDto): void {
    this.limparBusca();
    this.mensagemEscolhida.emit({ data: dataDaConversa(resultado.conversaId), mensagemId: resultado.id });
  }

  private lerAberto(): boolean {
    try {
      return localStorage.getItem(CHAVE_ABERTO) !== 'false';
    } catch {
      return true;
    }
  }
}
