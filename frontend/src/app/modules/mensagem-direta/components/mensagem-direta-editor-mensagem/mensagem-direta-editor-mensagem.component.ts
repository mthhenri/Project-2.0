import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import type { AcaoFormatada, EditorFormatado } from '../../../../shared/components/markdown-editor/markdown-formatado';

interface BotaoDaBarra {
  acao: AcaoFormatada;
  rotulo: string;
  dica: string;
  /** Começa um novo grupo na barra (ganha um separador à esquerda). */
  novoGrupo?: boolean;
  glifo: string;
  classe: string;
}

/** Largura aproximada da barra, para ela não sair do campo quando a seleção está perto de uma borda (os botões têm tamanho fixo). */
const LARGURA_DA_BARRA_PX = 232;
const FOLGA_ACIMA_DA_SELECAO_PX = 6;

/**
 * O campo de escrever a mensagem do chat entre colaboradores (task 218): o editor que escreve já formatado (`EditorFormatado`, Milkdown, o mesmo
 * do Pad) dentro de uma caixa com a aparência do campo de texto, e uma **barra flutuante** sobre o texto selecionado (negrito, itálico, tachado,
 * código em linha, listas e citação). O valor é sempre Markdown. O componente só hospeda: o que `Enter`, `@` e colagem significam é de quem o
 * usa, que recebe `teclou` e `colou` ainda na **fase de captura** (antes do editor) e pode cancelar o evento. O editor carrega sob demanda.
 */
@Component({
  selector: 'app-mensagem-direta-editor-mensagem',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './mensagem-direta-editor-mensagem.component.html',
  styleUrl: './mensagem-direta-editor-mensagem.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaEditorMensagemComponent {
  readonly placeholder = input('');
  /** O nome que leitores de tela dão ao campo. */
  readonly rotulo = input('Mensagem');
  /** Sem borda, fundo nem raio próprios: o campo vive dentro da barra do compositor, que tem a aparência de campo de texto (task 220). */
  readonly embutido = input(false);
  /** O `id` da lista de sugestões aberta e a opção destacada nela (ARIA do campo de escrita com sugestões). */
  readonly listaControlada = input<string | null>(null);
  readonly opcaoAtiva = input<string | null>(null);

  /** O Markdown depois de cada mudança do texto. */
  readonly mudou = output<string>();
  /** O texto ou a seleção mudou (o cursor se mexeu). */
  readonly atualizou = output<void>();
  /** Tecla apertada no campo, antes de o editor tratá-la. */
  readonly teclou = output<KeyboardEvent>();
  /** Colagem no campo, antes de o editor tratá-la. */
  readonly colou = output<ClipboardEvent>();
  /** O foco saiu do campo. */
  readonly perdeuFoco = output<void>();

  /** O editor, assim que carregou; `null` antes disso. */
  readonly editor = signal<EditorFormatado | null>(null);
  /** O Markdown atual (`''` vazio). */
  readonly texto = signal('');
  protected readonly ativos = signal<ReadonlySet<string>>(new Set());
  protected readonly barra = signal<{ esquerda: number; topo: number } | null>(null);

  protected readonly botoes: readonly BotaoDaBarra[] = [
    { acao: 'negrito', rotulo: 'Negrito', dica: 'Negrito (CTRL+B)', glifo: 'B', classe: 'editor-mensagem__glifo--negrito' },
    { acao: 'italico', rotulo: 'Itálico', dica: 'Itálico (CTRL+I)', glifo: 'I', classe: 'editor-mensagem__glifo--italico' },
    { acao: 'tachado', rotulo: 'Tachado', dica: 'Tachado (CTRL+ALT+X)', glifo: 'S', classe: 'editor-mensagem__glifo--tachado' },
    { acao: 'codigo', rotulo: 'Código em linha', dica: 'Código em linha (CTRL+E)', glifo: '</>', classe: 'editor-mensagem__glifo--codigo' },
    { acao: 'lista', rotulo: 'Lista', dica: 'Lista (CTRL+ALT+8)', glifo: '•', classe: '', novoGrupo: true },
    { acao: 'numerada', rotulo: 'Lista numerada', dica: 'Lista numerada (CTRL+ALT+7)', glifo: '1.', classe: '' },
    { acao: 'citacao', rotulo: 'Citação', dica: 'Citação (CTRL+SHIFT+B)', glifo: '❝', classe: '' },
  ];

  private readonly raiz = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly hospede = viewChild<ElementRef<HTMLElement>>('hospede');
  private geracaoMontagem = 0;

  constructor() {
    effect(() => {
      const hospede = this.hospede();
      if (hospede) untracked(() => void this.montar(hospede.nativeElement));
    });

    // O ARIA do campo de escrita (o elemento editável é criado pela biblioteca, então os atributos vão nele depois de montado).
    effect(() => {
      const editavel = this.editor() ? this.hospede()?.nativeElement.querySelector('.ProseMirror') : null;
      if (!editavel) return;
      editavel.setAttribute('role', 'textbox');
      editavel.setAttribute('aria-multiline', 'true');
      editavel.setAttribute('aria-label', this.rotulo());
      editavel.setAttribute('aria-autocomplete', 'list');
      const lista = this.listaControlada();
      const opcao = this.opcaoAtiva();
      if (lista) editavel.setAttribute('aria-controls', lista);
      else editavel.removeAttribute('aria-controls');
      if (opcao) editavel.setAttribute('aria-activedescendant', opcao);
      else editavel.removeAttribute('aria-activedescendant');
    });

    inject(DestroyRef).onDestroy(() => {
      this.geracaoMontagem++;
      const editor = this.editor();
      this.editor.set(null);
      if (editor) void editor.destruir();
    });
  }

  // --- API para quem usa o campo --------------------------------------------------------------

  focar(): void {
    this.editor()?.focar();
  }

  /** Esvazia o campo (o que o usuário vê e o Markdown). */
  limpar(): void {
    this.editor()?.limpar();
    this.texto.set('');
    this.barra.set(null);
    this.mudou.emit('');
    this.atualizou.emit();
  }

  // --- Montagem --------------------------------------------------------------------------------

  private async montar(hospede: HTMLElement): Promise<void> {
    const geracao = ++this.geracaoMontagem;
    const modulo = await import('../../../../shared/components/markdown-editor/markdown-formatado');
    if (geracao !== this.geracaoMontagem || !hospede.isConnected) return;
    // Os ouvintes `aoMudar` (200 ms de atraso) e `aoAtualizar` (estado antigo) do Milkdown não servem a um campo em que o Enter envia na hora: o
    // texto e o cursor são lidos a cada transação, em `aoAplicar`, já com o estado novo.
    const editor = await modulo.EditorFormatado.criar(hospede, '', {
      aoMudar: () => undefined,
      aoAtualizar: () => undefined,
      aoSair: () => {
        this.sincronizar();
        this.perdeuFoco.emit();
      },
      aoAplicar: () => this.sincronizar(),
    });
    if (geracao !== this.geracaoMontagem) {
      void editor.destruir();
      return;
    }
    // Capturar na raiz é ver o evento antes do elemento editável (que fica dentro dela): é a vez de quem usa o campo decidir.
    hospede.addEventListener('keydown', (evento) => this.teclou.emit(evento), true);
    hospede.addEventListener('paste', (evento) => this.colou.emit(evento), true);
    this.editor.set(editor);
  }

  // --- Barra flutuante -------------------------------------------------------------------------

  /** Depois de cada transação: o Markdown, a formatação do cursor, a barra e quem está ouvindo (o cursor pode ter mudado). */
  private sincronizar(): void {
    const editor = this.editor();
    if (!editor) return;
    const markdown = editor.obterMarkdown();
    if (markdown !== this.texto()) {
      this.texto.set(markdown);
      this.mudou.emit(markdown);
    }
    this.ativos.set(editor.ativas());
    this.posicionarBarra(editor);
    this.atualizou.emit();
  }

  /** A barra só existe com texto selecionado e o foco no campo; fica sobre a seleção, sem passar das bordas do campo. */
  private posicionarBarra(editor: EditorFormatado): void {
    if (!editor.temSelecao() || !editor.temFoco()) {
      this.barra.set(null);
      return;
    }
    const retangulo = editor.retanguloDaSelecao();
    if (!retangulo) {
      this.barra.set(null);
      return;
    }
    const raiz = this.raiz.nativeElement.getBoundingClientRect();
    const centro = (retangulo.esquerda + retangulo.direita) / 2 - raiz.left;
    const metade = LARGURA_DA_BARRA_PX / 2;
    this.barra.set({
      esquerda: Math.min(Math.max(centro, metade), Math.max(metade, raiz.width - metade)),
      topo: retangulo.topo - raiz.top - FOLGA_ACIMA_DA_SELECAO_PX,
    });
  }

  protected executarBotao(acao: AcaoFormatada): void {
    const editor = this.editor();
    if (!editor) return;
    editor.executar(acao);
    editor.focar();
    this.sincronizar();
  }
}
