import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { AutorChatEnum, ChatConversaResumoDto, ChatMensagemResumoDto, LIMITE_TITULO_CONVERSA_EDITADO, PlanoResumoDto } from '@project20/shared';
import { ChatService } from '../../services/chat.service';
import { PlanoService } from '../../services/plano.service';
import { dataDaConversa, rotuloDoDia } from '../../utils/chat.util';
import { ModoDoChatEnum } from '../../utils/plano.util';

/** O começo do nome que o servidor dá à conversa sem nome próprio ("Chat do dia 26 de outubro de 2026"); no botão ela aparece como o dia. */
const PREFIXO_TITULO_PADRAO = 'Chat do dia';

/** Uma mensagem achada na busca, com o dia a que pertence (para abrir a conversa certa). */
export interface MensagemDoSeletor {
  data: string;
  mensagemId: string;
}

/**
 * Seletor do topo do chat (task 233), no lugar do painel de histórico: um botão que diz o que está aberto (a conversa do dia ou o plano) e
 * abre uma busca com duas listas, **Planos** e **Conversas do dia**, e a ação **Novo plano**. Vale para os dois modos. A busca (Enter) acha
 * mensagens das conversas e planos pelo título (inclusive os arquivados). Não conhece a conversa aberta: só avisa o que a pessoa escolheu.
 * Análogo visual: o histórico da aba de Prompts (task 133), de onde vieram a busca, a lista de dias e o renomear.
 */
@Component({
  selector: 'app-chat-seletor',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, InputTextModule, PopoverModule, SkeletonModule, TooltipModule],
  templateUrl: './seletor.component.html',
  styleUrl: './seletor.component.scss',
})
export class SeletorComponent {
  /** O dia que está na tela (`yyyy-mm-dd`), para marcá-lo na lista. */
  readonly diaAtual = input.required<string>();
  /** O dia de hoje no servidor, para rotular "Hoje" e "Ontem". */
  readonly hoje = input.required<string>();
  readonly modo = input<ModoDoChatEnum>(ModoDoChatEnum.PERGUNTAS);
  /** O plano aberto no modo Planejamento (marcado na lista). */
  readonly planoAbertoId = input<number | null>(null);
  readonly planoAbertoTitulo = input<string | null>(null);

  readonly diaEscolhido = output<string>();
  readonly mensagemEscolhida = output<MensagemDoSeletor>();
  readonly planoEscolhido = output<number>();
  readonly novoPlano = output<void>();

  readonly Autor = AutorChatEnum;
  readonly Modo = ModoDoChatEnum;
  readonly rotuloDoDia = rotuloDoDia;
  readonly limiteNome = LIMITE_TITULO_CONVERSA_EDITADO;
  readonly conversas = signal<ChatConversaResumoDto[]>([]);
  readonly planos = signal<PlanoResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly resultados = signal<ChatMensagemResumoDto[] | null>(null);
  readonly buscando = signal(false);
  /** O texto da última busca feita (Enter): com ele os planos arquivados também aparecem. */
  readonly buscaFeita = signal('');
  readonly controleBusca = new FormControl<string>('', { nonNullable: true });
  /** A conversa cujo nome está sendo editado (`conversaId`) e o campo da edição. */
  readonly editandoId = signal<string | null>(null);
  readonly salvandoNome = signal(false);
  readonly controleNome = new FormControl<string>('', { nonNullable: true });

  /** O que o botão mostra: o plano aberto (modo Planejamento), o nome da conversa (dado ou gerado) ou, sem ele, o dia ("Hoje, 26/10"). */
  readonly rotuloDoBotao = computed(() => {
    if (this.modo() === ModoDoChatEnum.PLANEJAMENTO) return this.planoAbertoTitulo() ?? 'Escolher um plano';
    const doDia = this.conversas().find((conversa) => conversa.data === this.diaAtual());
    if (doDia && !doDia.titulo.startsWith(PREFIXO_TITULO_PADRAO)) return doDia.titulo;
    const rotulo = rotuloDoDia(this.diaAtual(), this.hoje());
    const [, mes, dia] = this.diaAtual().split('-');
    return rotulo.includes('/') ? rotulo : `${rotulo}, ${dia}/${mes}`;
  });

  private readonly campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');
  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');
  private readonly gatilho = viewChild<ElementRef<HTMLElement>>('gatilho');
  private readonly popover = viewChild<Popover>('popover');
  private readonly chatService = inject(ChatService);
  private readonly planoService = inject(PlanoService);
  private readonly messageService = inject(MessageService);

  constructor() {
    this.recarregar();
  }

  /** Relê as conversas e os planos (o servidor pode ter nomeado a conversa do dia, e o plano pode ter mudado de título ou de lugar). */
  recarregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    let pendentes = 2;
    const terminar = () => {
      pendentes -= 1;
      if (pendentes === 0) this.carregando.set(false);
    };
    this.chatService.listarConversas().subscribe({
      next: (resposta) => {
        this.conversas.set(resposta.dados?.conversas ?? []);
        terminar();
      },
      error: () => {
        this.erro.set(true);
        terminar();
      },
    });
    this.planoService.listar({ busca: this.buscaFeita() || undefined }).subscribe({
      next: (resposta) => {
        this.planos.set(resposta.dados ?? []);
        terminar();
      },
      error: () => {
        this.erro.set(true);
        terminar();
      },
    });
  }

  /** Abre a lista a partir do botão (o chat chama quando a pessoa entra no Planejamento sem nenhum plano). */
  abrir(): void {
    const alvo = this.gatilho()?.nativeElement;
    if (alvo) this.popover()?.show(new MouseEvent('click'), alvo);
  }

  aoAbrir(): void {
    setTimeout(() => this.campoBusca()?.nativeElement.focus());
  }

  fechar(): void {
    this.popover()?.hide();
  }

  buscar(): void {
    const texto = this.controleBusca.value.trim();
    if (!texto) {
      this.limparBusca();
      return;
    }
    this.buscaFeita.set(texto);
    this.buscando.set(true);
    this.chatService.buscar(texto).subscribe({
      next: (resposta) => {
        this.resultados.set(resposta.dados?.mensagens ?? []);
        this.buscando.set(false);
      },
      error: () => this.buscando.set(false),
    });
    this.planoService.listar({ busca: texto }).subscribe({ next: (resposta) => this.planos.set(resposta.dados ?? []) });
  }

  limparBusca(): void {
    const tinhaBusca = this.buscaFeita() !== '';
    this.controleBusca.setValue('');
    this.buscaFeita.set('');
    this.resultados.set(null);
    if (tinhaBusca) this.recarregar();
  }

  escolherDia(data: string): void {
    this.fechar();
    this.diaEscolhido.emit(data);
  }

  escolherResultado(resultado: ChatMensagemResumoDto): void {
    this.fechar();
    this.limparBusca();
    this.mensagemEscolhida.emit({ data: dataDaConversa(resultado.conversaId), mensagemId: resultado.id });
  }

  escolherPlano(plano: PlanoResumoDto): void {
    this.fechar();
    this.planoEscolhido.emit(plano.id);
  }

  criarPlano(): void {
    this.fechar();
    this.novoPlano.emit();
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
}
