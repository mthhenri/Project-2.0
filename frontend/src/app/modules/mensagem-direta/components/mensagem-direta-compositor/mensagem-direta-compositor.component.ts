import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { LIMITE_TEXTO_MENSAGEM_DIRETA, MensagemDiretaReferenciaResumoDto, ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { EnvioDoCompositor } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaService } from '../../services/mensagem-direta.service';
import {
  Gatilho,
  PessoaEscolhida,
  ReferenciaEscolhida,
  ROTULO_DO_TIPO_DE_REFERENCIA,
  aplicarEscolha,
  detectarGatilho,
  mencoesPresentes,
  pareceCodigo,
  referenciasPresentes,
  rotuloDaSituacao,
} from '../../utils/compositor.util';
import { filtrarPessoasPorNome } from '../../utils/mensagem-direta.util';
import type { BlocoAtual } from '../../../../shared/components/markdown-editor/markdown-formatado';
import { MensagemDiretaAvatarComponent } from '../mensagem-direta-avatar/mensagem-direta-avatar.component';
import { CodigoEscolhido, MensagemDiretaCodigoPainelComponent } from '../mensagem-direta-codigo-painel/mensagem-direta-codigo-painel.component';
import { MensagemDiretaEditorMensagemComponent } from '../mensagem-direta-editor-mensagem/mensagem-direta-editor-mensagem.component';

const ATRASO_DA_BUSCA_MS = 250;
const MINIMO_DE_LETRAS_DA_REFERENCIA = 2;
/** A partir de quantos caracteres o contador aparece (antes disso ele só ocuparia espaço). */
const COMECO_DO_AVISO_DE_LIMITE = 8_000;
/** Folga para a cerca e a linguagem de um bloco de código, ao decidir se uma colagem ainda cabe. */
const FOLGA_DA_CERCA_DO_CODIGO = 16;

interface ItemDaSugestao {
  /** O texto que entra na mensagem depois do `@` ou `#`. */
  rotulo: string;
  titulo: string;
  detalhe: string;
  icone: string | null;
  /** Para a pessoa: o nome do avatar. */
  nomeDoAvatar: string | null;
  /** O que o item representa: a pessoa (do `@`) ou a demanda/atividade (do `#`). Quem escolhe usa isto, não o rótulo (dois itens podem ter o mesmo nome). */
  pessoa: PessoaEscolhida | null;
  referencia: MensagemDiretaReferenciaResumoDto | null;
}

/** O gatilho dentro do bloco de texto do cursor, mais a posição dele no documento (que continua valendo enquanto o usuário não muda de bloco). */
interface GatilhoNoDocumento extends Gatilho {
  inicioNoDocumento: number;
}

type SituacaoDaBusca = 'ocioso' | 'carregando' | 'pronto' | 'erro';

function consumir(evento: Event): void {
  evento.preventDefault();
  evento.stopPropagation();
}

/**
 * O campo de mensagem do popup (task 211, refeito sobre o editor formatado na task 218): o texto aparece já formatado (negrito, listas...) e o
 * valor enviado continua sendo Markdown. `Enter` envia (menos dentro de lista e de bloco de código, onde continua o bloco), `Shift+Enter` cria
 * um novo parágrafo ou item e `Ctrl+Enter` envia sempre. Botão e colagem de **código**, e sugestões ao digitar `@` (as pessoas da conversa) e `#`
 * (demandas e atividades que o usuário pode referenciar). No envio só vão as menções e referências cujo texto ainda está na mensagem.
 */
@Component({
  selector: 'app-mensagem-direta-compositor',
  standalone: true,
  imports: [ButtonModule, TooltipModule, MensagemDiretaAvatarComponent, MensagemDiretaCodigoPainelComponent, MensagemDiretaEditorMensagemComponent],
  templateUrl: './mensagem-direta-compositor.component.html',
  styleUrl: './mensagem-direta-compositor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaCompositorComponent {
  private readonly api = inject(MensagemDiretaService);
  private readonly detectorDeMudancas = inject(ChangeDetectorRef);
  private readonly campo = viewChild.required(MensagemDiretaEditorMensagemComponent);

  /** Quem pode ser mencionado: só os participantes da conversa (a regra do servidor). */
  readonly pessoas = input.required<PessoaEscolhida[]>();
  /** Muda ao abrir outra conversa: o campo recebe o foco (depois disso o foco é de quem usa a página, o popup não é modal). */
  readonly chave = input<number | null>(null);
  readonly enviar = output<EnvioDoCompositor>();
  /** O usuário está escrevendo (tecla que insere ou apaga texto, ou colagem): só ação dele, nunca o texto posto por programa (código do Desktop, limpar após enviar). Quem usa o compositor decide quando avisar a outra pessoa. */
  readonly digitando = output<void>();
  /** Código a pôr no campo como bloco (o que o usuário copiou antes do atalho do Desktop, task 213); `textoAplicado` avisa que já foi usado. */
  readonly codigoInicial = input<string | null>(null);
  readonly textoAplicado = output<void>();

  protected readonly limiteDoTexto = LIMITE_TEXTO_MENSAGEM_DIRETA;
  /** O Markdown da mensagem. */
  protected readonly texto = signal('');
  /** O painel do mini editor de código (task 216), aberto pelo botão `</>`: guarda o trecho que estava selecionado. `null` = fechado. */
  protected readonly painelDeCodigo = signal<{ selecionado: string } | null>(null);
  /** O bloco de texto do cursor, atualizado a cada mudança do texto ou do cursor. */
  private readonly bloco = signal<BlocoAtual | null>(null);
  /** O `inicioNoDocumento` do gatilho que o usuário dispensou com Esc ou clicando fora: ele não reabre até o texto passar a ter OUTRO gatilho (ou nenhum). */
  private readonly dispensadoEm = signal<number | null>(null);
  /**
   * O item que acabou de ser escolhido (`@Nome` ou `#Nome` já no texto): enquanto ele continua lá, continuar a frase depois dele não reabre a lista
   * ("#Corrigir filtro está pronto" não é uma busca por "Corrigir filtro está pronto").
   */
  private readonly escolhido = signal<{ inicio: number; marcador: string } | null>(null);

  protected readonly podeEnviar = computed(() => this.texto().trim().length > 0 && this.texto().length <= LIMITE_TEXTO_MENSAGEM_DIRETA);
  protected readonly excedeu = computed(() => this.texto().length > LIMITE_TEXTO_MENSAGEM_DIRETA);
  protected readonly mostrarContador = computed(() => this.texto().length >= COMECO_DO_AVISO_DE_LIMITE);
  protected readonly contador = computed(() => `${this.texto().length.toLocaleString('pt-BR')} / ${LIMITE_TEXTO_MENSAGEM_DIRETA.toLocaleString('pt-BR')}`);

  private readonly gatilhoBruto = computed<GatilhoNoDocumento | null>(() => {
    const bloco = this.bloco();
    if (!bloco) return null;
    const gatilho = detectarGatilho(bloco.texto, bloco.cursor);
    return gatilho ? { ...gatilho, inicioNoDocumento: bloco.base + gatilho.inicio } : null;
  });

  protected readonly gatilho = computed<GatilhoNoDocumento | null>(() => {
    const gatilho = this.gatilhoBruto();
    if (!gatilho || gatilho.inicioNoDocumento === this.dispensadoEm()) return null;
    const escolhido = this.escolhido();
    const bloco = this.bloco();
    if (escolhido && bloco && gatilho.inicioNoDocumento === escolhido.inicio && bloco.texto.startsWith(escolhido.marcador, gatilho.inicio)) return null;
    return gatilho;
  });

  protected readonly situacaoDaBusca = signal<SituacaoDaBusca>('ocioso');
  private readonly achadas = signal<MensagemDiretaReferenciaResumoDto[]>([]);

  protected readonly itens = computed<ItemDaSugestao[]>(() => {
    const gatilho = this.gatilho();
    if (!gatilho) return [];
    if (gatilho.tipo === 'MENCAO') {
      return filtrarPessoasPorNome(
        this.pessoas().map((pessoa) => ({ ...pessoa, usuarioNome: pessoa.nome })),
        gatilho.termo,
      ).map((pessoa) => ({
        rotulo: pessoa.nome, titulo: pessoa.nome, detalhe: '', icone: null, nomeDoAvatar: pessoa.nome,
        pessoa: { usuarioId: pessoa.usuarioId, nome: pessoa.nome }, referencia: null,
      }));
    }
    return this.achadas().map((referencia) => ({
      rotulo: referencia.nome,
      titulo: referencia.nome,
      detalhe:
        referencia.tipo === ReferenciaMensagemDiretaEnum.DEMANDA
          ? `${ROTULO_DO_TIPO_DE_REFERENCIA[referencia.tipo]} · ${rotuloDaSituacao(referencia.situacao)}`
          : `${ROTULO_DO_TIPO_DE_REFERENCIA[referencia.tipo]} · ${referencia.demandaNome ?? ''}`,
      icone: referencia.tipo === ReferenciaMensagemDiretaEnum.DEMANDA ? 'pi-sitemap' : 'pi-check-square',
      nomeDoAvatar: null,
      pessoa: null,
      referencia,
    }));
  });

  /** A lista fica aberta com `@` (sempre que há gatilho) e com `#` assim que há texto suficiente para buscar. */
  protected readonly listaAberta = computed(() => {
    const gatilho = this.gatilho();
    if (!gatilho) return false;
    if (gatilho.tipo === 'MENCAO') return this.itens().length > 0 || !gatilho.termo.includes(' ');
    return gatilho.termo.trim().length >= MINIMO_DE_LETRAS_DA_REFERENCIA;
  });
  protected readonly indice = signal(0);
  protected readonly cabecalhoDaLista = computed(() => (this.gatilho()?.tipo === 'MENCAO' ? 'Mencionar' : 'Referenciar'));

  private escolhidasPessoas: PessoaEscolhida[] = [];
  private escolhidasReferencias: ReferenciaEscolhida[] = [];
  private geracaoDaBusca = 0;
  /** Onde está o espaço que a escolha de uma sugestão acrescentou: uma pontuação digitada logo depois o consome ("@Nome, que acha?" e não "@Nome , que acha?"). */
  private espacoAutomaticoEm: { base: number; deslocamento: number } | null = null;
  private temporizadorDaBusca: ReturnType<typeof setTimeout> | null = null;
  /** O foco do campo é adiado um ciclo (o editor acabou de aparecer); destruir o compositor antes disso cancela o foco, que cairia num editor já desmontado. */
  private temporizadorDoFoco: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizadorDaBusca) clearTimeout(this.temporizadorDaBusca);
      if (this.temporizadorDoFoco) clearTimeout(this.temporizadorDoFoco);
    });

    effect(() => {
      const editor = this.campo().editor();
      if (this.temporizadorDoFoco) clearTimeout(this.temporizadorDoFoco);
      this.temporizadorDoFoco = this.chave() !== null && editor ? setTimeout(() => editor.focar(), 0) : null;
    });

    // O código do Desktop entra uma vez como bloco, no cursor; o usuário confere e envia (nada é enviado sozinho).
    effect(() => {
      const codigo = this.codigoInicial();
      const editor = this.campo().editor();
      if (codigo === null || !editor) return;
      untracked(() => {
        if (this.texto().length + codigo.length + FOLGA_DA_CERCA_DO_CODIGO <= LIMITE_TEXTO_MENSAGEM_DIRETA) {
          editor.inserirBlocoDeCodigo(codigo, null);
          editor.focar();
        }
        this.textoAplicado.emit();
      });
    });

    // O gatilho que o usuário dispensou (Esc, clique fora ou item já escolhido) volta a valer quando o texto passa a ter OUTRO gatilho (ou nenhum).
    effect(() => {
      const bruto = this.gatilhoBruto();
      const dispensado = untracked(() => this.dispensadoEm());
      if (dispensado !== null && (!bruto || bruto.inicioNoDocumento !== dispensado)) this.dispensadoEm.set(null);
      // O item escolhido deixa de valer quando o usuário o apaga ou o altera.
      const escolhido = untracked(() => this.escolhido());
      const bloco = this.bloco();
      if (escolhido && bloco && bruto && bruto.inicioNoDocumento === escolhido.inicio && !bloco.texto.startsWith(escolhido.marcador, bruto.inicio)) this.escolhido.set(null);
      else if (escolhido && !bruto) this.escolhido.set(null);
    });

    // A busca do `#`: espera uma pausa na digitação. Toda mudança do termo invalida a busca anterior e limpa as sugestões (nada de resposta atrasada
    // nem de item de uma busca antiga que o Enter possa escolher).
    effect(() => {
      const gatilho = this.gatilho();
      this.indice.set(0);
      this.geracaoDaBusca++;
      this.achadas.set([]);
      if (this.temporizadorDaBusca) clearTimeout(this.temporizadorDaBusca);
      this.temporizadorDaBusca = null;
      if (!gatilho || gatilho.tipo !== 'REFERENCIA' || gatilho.termo.trim().length < MINIMO_DE_LETRAS_DA_REFERENCIA) {
        this.situacaoDaBusca.set('ocioso');
        return;
      }
      const termo = gatilho.termo.trim();
      this.situacaoDaBusca.set('carregando');
      this.temporizadorDaBusca = setTimeout(() => void this.buscarReferencias(termo, gatilho.inicioNoDocumento), ATRASO_DA_BUSCA_MS);
    });

    // A opção destacada pelas setas precisa estar à vista (a lista rola).
    effect(() => {
      const posicao = this.indice();
      if (this.listaAberta()) setTimeout(() => document.getElementById(`sugestao-${posicao}`)?.scrollIntoView?.({ block: 'nearest' }), 0);
    });
  }

  private async buscarReferencias(termo: string, inicioDoGatilho: number): Promise<void> {
    const geracao = this.geracaoDaBusca;
    try {
      const resposta = await firstValueFrom(this.api.buscarReferencias(termo));
      if (geracao !== this.geracaoDaBusca) return;
      const referencias = resposta.dados?.referencias ?? [];
      this.achadas.set(referencias);
      this.situacaoDaBusca.set('pronto');
      // `#` com espaço no meio e nenhum resultado é texto comum ("o PR #12 quebrou a build"): a lista fecha e não reabre neste gatilho.
      if (referencias.length === 0 && termo.includes(' ')) this.dispensadoEm.set(inicioDoGatilho);
    } catch {
      if (geracao !== this.geracaoDaBusca) return;
      this.achadas.set([]);
      this.situacaoDaBusca.set('erro');
    }
  }

  // ---------------------------------------------------------------------------
  // Teclado, cursor e colagem
  // ---------------------------------------------------------------------------

  protected aoMudar(markdown: string): void {
    this.texto.set(markdown);
  }

  /** O texto ou o cursor mudou: o bloco do cursor é o que diz se há um `@` ou `#` aberto. */
  protected aoAtualizar(): void {
    this.bloco.set(this.campo().editor()?.blocoAtual() ?? null);
  }

  /** Clicar fora do campo (que não seja numa sugestão: o `mousedown` delas não tira o foco) fecha a lista. */
  protected aoPerderOFoco(): void {
    const gatilho = this.gatilho();
    if (gatilho) this.dispensadoEm.set(gatilho.inicioNoDocumento);
  }

  /** Tecla que insere texto (inclusive a de composição de acento/IME) ou apaga o que já está escrito. */
  private sinalizarDigitacao(evento: KeyboardEvent): void {
    const comControle = evento.ctrlKey || evento.metaKey || evento.altKey;
    const insere = (evento.key.length === 1 && !comControle) || evento.isComposing;
    const apaga = (evento.key === 'Backspace' || evento.key === 'Delete') && this.texto().length > 0;
    if (insere || apaga) this.digitando.emit();
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    this.sinalizarDigitacao(evento);
    if (evento.isComposing) return;
    const editor = this.campo().editor();
    if (!editor) return;
    const comControle = evento.ctrlKey || evento.metaKey;

    if (this.listaAberta() && this.itens().length > 0) {
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        consumir(evento);
        const total = this.itens().length;
        this.indice.update((atual) => (evento.key === 'ArrowDown' ? (atual + 1) % total : (atual - 1 + total) % total));
        return;
      }
      if ((evento.key === 'Enter' && !evento.shiftKey && !comControle) || evento.key === 'Tab') {
        consumir(evento);
        this.escolher(this.indice());
        return;
      }
    }
    if (evento.key === 'Escape' && this.listaAberta()) {
      // Fecha só a lista visível: o Esc do popup (que o oculta) não deve disparar junto. Sem lista, o Esc segue para o popup.
      consumir(evento);
      this.dispensadoEm.set(this.gatilho()!.inicioNoDocumento);
      return;
    }
    if (evento.key === 'Enter') {
      if (comControle) {
        consumir(evento);
        this.enviarMensagem();
        return;
      }
      const contexto = editor.contextoDoCursor();
      if (evento.shiftKey) {
        // Em bloco de código a quebra de linha é a do próprio editor.
        if (!contexto.emCodigo) {
          consumir(evento);
          editor.dividirBloco();
        }
        return;
      }
      // Em lista e em bloco de código o Enter continua o bloco (item novo, linha nova); o Ctrl+Enter e o botão enviam.
      if (!contexto.emLista && !contexto.emCodigo) {
        consumir(evento);
        this.enviarMensagem();
      }
      return;
    }
    this.consumirEspacoAutomatico(evento);
  }

  private consumirEspacoAutomatico(evento: KeyboardEvent): void {
    const editor = this.campo().editor();
    const espaco = this.espacoAutomaticoEm;
    // Qualquer tecla que não seja a pontuação logo depois da escolha encerra a janela do espaço automático.
    this.espacoAutomaticoEm = null;
    if (!editor || !espaco || !/^[,.;:!?)]$/.test(evento.key)) return;
    const bloco = editor.blocoAtual();
    if (bloco && bloco.base === espaco.base && bloco.cursor === espaco.deslocamento + 1 && bloco.texto[espaco.deslocamento] === ' ') {
      editor.substituirNoBlocoAtual(espaco.deslocamento, espaco.deslocamento + 1, '');
    }
  }

  protected aoColar(evento: ClipboardEvent): void {
    const editor = this.campo().editor();
    const colado = evento.clipboardData?.getData('text') ?? '';
    if (colado !== '') this.digitando.emit();
    if (!editor || !pareceCodigo(colado) || editor.contextoDoCursor().emCodigo) return;
    // Perto do limite de 10.000 caracteres a cerca não cabe: a colagem segue o caminho normal (e o contador avisa).
    if (this.texto().length + colado.length + FOLGA_DA_CERCA_DO_CODIGO > LIMITE_TEXTO_MENSAGEM_DIRETA) return;
    consumir(evento);
    editor.inserirBlocoDeCodigo(colado, null);
  }

  /** O botão `</>` abre o mini editor; o trecho selecionado no campo (se houver) já vem nele. */
  protected inserirCodigo(): void {
    const editor = this.campo().editor();
    if (!editor) return;
    this.painelDeCodigo.set({ selecionado: editor.textoSelecionado() });
  }

  /** Fecha o painel e já atualiza a tela: com o painel aberto o campo está `inert`, e só depois disso ele aceita o foco de volta. */
  private fecharPainel(): void {
    this.painelDeCodigo.set(null);
    this.detectorDeMudancas.detectChanges();
  }

  protected fecharPainelDeCodigo(): void {
    this.fecharPainel();
    this.campo().focar();
  }

  /** O código do mini editor entra no lugar do trecho que estava selecionado quando o painel abriu, já com a linguagem na cerca. */
  protected inserirDoPainel(escolhido: CodigoEscolhido): void {
    const editor = this.campo().editor();
    this.fecharPainel();
    if (!editor) return;
    editor.focar();
    editor.inserirBlocoDeCodigo(escolhido.codigo, escolhido.linguagem);
  }

  // ---------------------------------------------------------------------------
  // Sugestões e envio
  // ---------------------------------------------------------------------------

  protected escolher(posicao: number): void {
    const gatilho = this.gatilho();
    const item = this.itens()[posicao];
    const editor = this.campo().editor();
    const bloco = this.bloco();
    if (!gatilho || !item || !editor || !bloco) return;

    const resultado = aplicarEscolha(bloco.texto, gatilho, bloco.cursor, item.rotulo);
    const { pessoa, referencia } = item;
    if (pessoa) {
      this.escolhidasPessoas = [...this.escolhidasPessoas.filter((escolhida) => escolhida.usuarioId !== pessoa.usuarioId), pessoa];
    }
    if (referencia) {
      this.escolhidasReferencias = [
        ...this.escolhidasReferencias.filter((escolhida) => !(escolhida.tipo === referencia.tipo && escolhida.id === referencia.id)),
        { tipo: referencia.tipo, id: referencia.id, nome: referencia.nome },
      ];
    }
    editor.substituirNoBlocoAtual(gatilho.inicio, bloco.cursor, resultado.texto.slice(gatilho.inicio, resultado.cursor));
    this.dispensadoEm.set(null);
    this.escolhido.set({ inicio: gatilho.inicioNoDocumento, marcador: `${gatilho.tipo === 'MENCAO' ? '@' : '#'}${item.rotulo}` });
    this.espacoAutomaticoEm = resultado.espacoAcrescentado ? { base: bloco.base, deslocamento: resultado.cursor - 1 } : null;
    editor.focar();
  }

  /** Escolher com o mouse não pode tirar o foco do campo (o `mousedown` do item é cancelado). */
  protected manterFoco(evento: MouseEvent): void {
    evento.preventDefault();
  }

  protected enviarMensagem(): void {
    // O texto vem do editor na hora do envio, não do último valor sincronizado.
    const texto = (this.campo().editor()?.obterMarkdown() ?? this.texto()).trim();
    if (texto === '' || texto.length > LIMITE_TEXTO_MENSAGEM_DIRETA) return;
    this.enviar.emit({
      texto,
      mencoes: mencoesPresentes(texto, this.escolhidasPessoas),
      referencias: referenciasPresentes(texto, this.escolhidasReferencias),
    });
    this.campo().limpar();
    this.bloco.set(null);
    this.dispensadoEm.set(null);
    this.escolhido.set(null);
    this.espacoAutomaticoEm = null;
    this.escolhidasPessoas = [];
    this.escolhidasReferencias = [];
  }
}
