import { Component, DestroyRef, ElementRef, effect, forwardRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import {
  ajustarRecuoDeItens,
  alternarEnvolvimento,
  alternarPrefixo,
  continuarLista,
  EdicaoMarkdown,
  inserirLink,
  PrefixoDeLinha,
} from '@project20/shared';
import { MarkdownVisualizadorComponent } from '../markdown-visualizador/markdown-visualizador.component';
import type { AcaoFormatada, EditorFormatado } from './markdown-formatado';

export type AcaoMarkdown =
  | 'negrito'
  | 'italico'
  | 'tachado'
  | 'codigo'
  | 'link'
  | PrefixoDeLinha;

interface BotaoDaBarra {
  acao: AcaoMarkdown | AcaoFormatada;
  rotulo: string;
  dica: string;
  /** Texto do botão (glifo curto): a barra não depende de um conjunto de ícones. */
  glifo: string;
  classe: string;
}

export interface MenuContextoEditorEvento {
  inicio: number;
  fim: number;
  /** Trecho selecionado, exatamente como está no campo. */
  texto: string;
  evento: MouseEvent;
}

/**
 * Editor de Markdown. O valor do controle é sempre a **string Markdown** (vazio é `''`).
 *
 * - **Modo formatado (padrão, task 134):** o usuário escreve já vendo negrito, listas, títulos... (Milkdown, carregado
 *   sob demanda); o texto guardado continua sendo Markdown. Abrir um texto e não editar nunca emite mudança: só uma
 *   edição real troca o valor (e voltar ao estado original devolve o texto original, byte a byte).
 * - **Modo Markdown (alternância "Markdown"):** o `<textarea>` com o Markdown cru, barra e `Ctrl+B`/`Ctrl+I`/`Ctrl+K`,
 *   `Enter` continuando listas e `Tab`/`Shift+Tab` aninhando itens.
 * - **`Enter` insere linha**; quem confirma o dialog é o `Ctrl+Enter` (contrato do `dialogFormulario`).
 * - `somenteLeitura` mostra só o visualizador, sem barra.
 */
@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [MarkdownVisualizadorComponent, TooltipModule],
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true,
    },
  ],
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  readonly placeholder = input<string>('');
  /** Altura mínima da área de edição, em rem. */
  readonly alturaMinima = input<number>(12);
  readonly somenteLeitura = input<boolean>(false);
  readonly maxlength = input<number | null>(null);
  /** Rótulo acessível do campo (quando não há `<label for>` por perto). */
  readonly rotulo = input<string>('Texto em Markdown');
  /** Liga o evento `aoMenuContexto`: com seleção, o botão direito vira esse evento em vez do menu do navegador. */
  readonly emitirMenuContexto = input<boolean>(false);

  /** Botão direito sobre um trecho selecionado (só com `emitirMenuContexto`); o consumidor abre o seu menu. */
  readonly aoMenuContexto = output<MenuContextoEditorEvento>();

  readonly valor = signal<string>('');
  readonly desabilitado = signal<boolean>(false);
  readonly modo = signal<'formatado' | 'texto'>('formatado');
  /** Botões da barra acesos no modo formatado (formatação do cursor). */
  readonly ativos = signal<ReadonlySet<string>>(new Set());
  /** Seleção atual do campo (só leitura): o bloco 8 a usa para o "Enviar para". */
  readonly selecao = signal<{ inicio: number; fim: number }>({ inicio: 0, fim: 0 });

  readonly botoes: readonly BotaoDaBarra[] = [
    { acao: 'negrito', rotulo: 'Negrito', dica: 'Negrito (Ctrl+B)', glifo: 'B', classe: 'markdown-editor__glifo--negrito' },
    { acao: 'italico', rotulo: 'Itálico', dica: 'Itálico (Ctrl+I)', glifo: 'I', classe: 'markdown-editor__glifo--italico' },
    { acao: 'tachado', rotulo: 'Tachado', dica: 'Tachado', glifo: 'S', classe: 'markdown-editor__glifo--tachado' },
    { acao: 'titulo', rotulo: 'Título', dica: 'Título', glifo: 'H', classe: '' },
    { acao: 'lista', rotulo: 'Lista', dica: 'Lista', glifo: '•', classe: '' },
    { acao: 'numerada', rotulo: 'Lista numerada', dica: 'Lista numerada', glifo: '1.', classe: '' },
    { acao: 'tarefa', rotulo: 'Lista de tarefas', dica: 'Lista de tarefas', glifo: '☐', classe: '' },
    { acao: 'citacao', rotulo: 'Citação', dica: 'Citação', glifo: '❝', classe: '' },
    { acao: 'codigo', rotulo: 'Código', dica: 'Código', glifo: '</>', classe: 'markdown-editor__glifo--codigo' },
    { acao: 'link', rotulo: 'Link', dica: 'Link (Ctrl+K)', glifo: '🔗', classe: '' },
  ];

  readonly botoesFormatado: readonly BotaoDaBarra[] = [
    { acao: 'desfazer', rotulo: 'Desfazer', dica: 'Desfazer (Ctrl+Z)', glifo: '↶', classe: '' },
    { acao: 'refazer', rotulo: 'Refazer', dica: 'Refazer (Ctrl+Y)', glifo: '↷', classe: '' },
    { acao: 'titulo1', rotulo: 'Título 1', dica: 'Título 1', glifo: 'H1', classe: '' },
    { acao: 'titulo2', rotulo: 'Título 2', dica: 'Título 2', glifo: 'H2', classe: '' },
    { acao: 'negrito', rotulo: 'Negrito', dica: 'Negrito (Ctrl+B)', glifo: 'B', classe: 'markdown-editor__glifo--negrito' },
    { acao: 'italico', rotulo: 'Itálico', dica: 'Itálico (Ctrl+I)', glifo: 'I', classe: 'markdown-editor__glifo--italico' },
    { acao: 'tachado', rotulo: 'Tachado', dica: 'Tachado', glifo: 'S', classe: 'markdown-editor__glifo--tachado' },
    { acao: 'codigo', rotulo: 'Código', dica: 'Código', glifo: '</>', classe: 'markdown-editor__glifo--codigo' },
    { acao: 'lista', rotulo: 'Lista', dica: 'Lista', glifo: '•', classe: '' },
    { acao: 'numerada', rotulo: 'Lista numerada', dica: 'Lista numerada', glifo: '1.', classe: '' },
    { acao: 'tarefa', rotulo: 'Lista de tarefas', dica: 'Lista de tarefas', glifo: '☐', classe: '' },
    { acao: 'citacao', rotulo: 'Citação', dica: 'Citação', glifo: '❝', classe: '' },
    { acao: 'link', rotulo: 'Link', dica: 'Link (Ctrl+K)', glifo: '🔗', classe: '' },
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campo');
  private readonly hospedeFormatado = viewChild<ElementRef<HTMLElement>>('hospedeFormatado');
  private editorFormatado: EditorFormatado | null = null;
  /** Valor externo mais recente (o que o formulário mandou); é o que se devolve se o usuário desfizer tudo. */
  private original = '';
  /** Markdown que o editor mostra para `original`, já normalizado: igual a ele = nada foi editado. */
  private base = '';
  private geracaoMontagem = 0;
  private aoMudar: (valor: string) => void = () => {};
  private aoTocar: () => void = () => {};

  constructor() {
    effect(() => {
      const hospede = this.hospedeFormatado();
      const modo = this.modo();
      untracked(() => {
        if (modo === 'formatado' && hospede) void this.montarFormatado(hospede.nativeElement);
        else this.desmontarFormatado();
      });
    });
    effect(() => {
      const desabilitado = this.desabilitado();
      untracked(() => this.editorFormatado?.definirEditavel(!desabilitado));
    });
    this.destroyRef.onDestroy(() => this.desmontarFormatado());
  }

  // --- ControlValueAccessor ---------------------------------------------------------------------

  writeValue(valor: string | null): void {
    const texto = valor ?? '';
    this.valor.set(texto);
    this.original = texto;
    const editor = this.editorFormatado;
    if (editor && editor.obterMarkdown() !== texto) {
      editor.definirMarkdown(texto);
      this.base = editor.obterMarkdown();
    }
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.aoMudar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.aoTocar = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
  }

  // --- API pública --------------------------------------------------------------------------------

  focar(): void {
    setTimeout(() => {
      if (this.modo() === 'formatado') this.editorFormatado?.focar();
      else this.campo()?.nativeElement.focus();
    });
  }

  /** Menu de contexto do campo: só intercepta quando há trecho selecionado e o consumidor pediu. */
  aoAbrirMenuContexto(evento: MouseEvent): void {
    if (!this.emitirMenuContexto() || this.desabilitado()) return;
    this.atualizarSelecao();
    const texto = this.textoSelecionado();
    if (texto.trim() === '') return;
    evento.preventDefault();
    this.aoMenuContexto.emit({ ...this.selecao(), texto, evento });
  }

  /** Alterna entre a edição formatada e o Markdown cru. */
  alternarModo(): void {
    this.modo.update((atual) => (atual === 'formatado' ? 'texto' : 'formatado'));
    this.focar();
  }

  executarBotao(acao: string): void {
    if (this.modo() === 'formatado') {
      this.editorFormatado?.executar(acao as AcaoFormatada);
      this.editorFormatado?.focar();
    } else {
      this.executar(acao as AcaoMarkdown);
    }
  }

  /** Menu de contexto do editor formatado: entrega o **Markdown do bloco** da seleção (para o "Enviar para"). */
  aoAbrirMenuContextoFormatado(evento: MouseEvent): void {
    const editor = this.editorFormatado;
    if (!editor || !this.emitirMenuContexto() || this.desabilitado() || !editor.temSelecao()) return;
    const texto = editor.blocoSelecionadoEmMarkdown();
    if (texto.trim() === '') return;
    evento.preventDefault();
    this.aoMenuContexto.emit({ inicio: 0, fim: texto.length, texto, evento });
  }

  /** Clique na caixa de uma tarefa marca ou desmarca. */
  aoClicarFormatado(evento: MouseEvent): void {
    if (this.editorFormatado?.alternarMarcacaoNoClique(evento.target, evento.clientX)) evento.preventDefault();
  }

  aoTeclarFormatado(evento: KeyboardEvent): void {
    if (evento.isComposing || this.desabilitado()) return;
    const comControle = evento.ctrlKey || evento.metaKey;
    if (comControle && !evento.altKey && !evento.shiftKey && evento.key.toLowerCase() === 'k') {
      evento.preventDefault();
      this.editorFormatado?.executar('link');
    }
  }

  private async montarFormatado(hospede: HTMLElement): Promise<void> {
    const geracao = ++this.geracaoMontagem;
    const modulo = await import('./markdown-formatado');
    if (geracao !== this.geracaoMontagem || !hospede.isConnected) return;
    const editor = await modulo.EditorFormatado.criar(hospede, this.valor(), {
      aoMudar: (markdown) => this.aoMudarFormatado(markdown),
      aoAtualizar: () => this.atualizarAtivos(),
      aoSair: () => this.aoTocar(),
    });
    if (geracao !== this.geracaoMontagem) {
      void editor.destruir();
      return;
    }
    this.editorFormatado = editor;
    this.original = this.valor();
    this.base = editor.obterMarkdown();
    editor.definirEditavel(!this.desabilitado());
    this.atualizarAtivos();
  }

  private desmontarFormatado(): void {
    this.geracaoMontagem++;
    const editor = this.editorFormatado;
    this.editorFormatado = null;
    if (editor) void editor.destruir();
    this.ativos.set(new Set());
  }

  /** Só uma edição real troca o valor; igual ao estado de abertura devolve o texto original, sem normalização. */
  private aoMudarFormatado(markdown: string): void {
    const efetivo = markdown === this.base ? this.original : markdown;
    if (efetivo === this.valor()) return;
    this.valor.set(efetivo);
    this.aoMudar(efetivo);
  }

  private atualizarAtivos(): void {
    this.ativos.set(this.editorFormatado?.ativas() ?? new Set());
  }

  textoSelecionado(): string {
    const { inicio, fim } = this.selecao();
    return this.valor().slice(inicio, fim);
  }

  // --- Eventos do campo ---------------------------------------------------------------------------

  aoDigitar(evento: Event): void {
    const texto = (evento.target as HTMLTextAreaElement).value;
    this.valor.set(texto);
    this.aoMudar(texto);
    this.atualizarSelecao();
  }

  aoSair(): void {
    this.aoTocar();
  }

  atualizarSelecao(): void {
    const alvo = this.campo()?.nativeElement;
    if (alvo) this.selecao.set({ inicio: alvo.selectionStart, fim: alvo.selectionEnd });
  }

  aoTeclar(evento: KeyboardEvent): void {
    if (evento.isComposing || this.desabilitado()) return;
    const alvo = evento.target as HTMLTextAreaElement;
    const { selectionStart: inicio, selectionEnd: fim, value: texto } = alvo;
    const comControle = evento.ctrlKey || evento.metaKey;

    if (comControle && !evento.altKey && !evento.shiftKey) {
      const tecla = evento.key.toLowerCase();
      const acao: AcaoMarkdown | null = tecla === 'b' ? 'negrito' : tecla === 'i' ? 'italico' : tecla === 'k' ? 'link' : null;
      if (acao) {
        evento.preventDefault();
        this.executar(acao);
      }
      return;
    }

    if (evento.key === 'Enter' && !comControle && !evento.shiftKey && !evento.altKey && inicio === fim) {
      const edicao = continuarLista(texto, inicio);
      if (edicao) {
        evento.preventDefault();
        this.aplicar(edicao);
      }
      return;
    }

    if (evento.key === 'Tab' && !comControle && !evento.altKey) {
      const edicao = ajustarRecuoDeItens(texto, inicio, fim, evento.shiftKey);
      if (edicao) {
        evento.preventDefault();
        this.aplicar(edicao);
      }
    }
  }

  // --- Barra de ferramentas -----------------------------------------------------------------------

  executar(acao: AcaoMarkdown): void {
    const alvo = this.campo()?.nativeElement;
    if (!alvo || this.desabilitado()) return;
    const { selectionStart: inicio, selectionEnd: fim, value: texto } = alvo;

    switch (acao) {
      case 'negrito':
        return this.aplicar(alternarEnvolvimento(texto, inicio, fim, '**'));
      case 'italico':
        return this.aplicar(alternarEnvolvimento(texto, inicio, fim, '*'));
      case 'tachado':
        return this.aplicar(alternarEnvolvimento(texto, inicio, fim, '~~'));
      case 'codigo':
        return this.aplicar(alternarEnvolvimento(texto, inicio, fim, '`'));
      case 'link':
        return this.aplicar(inserirLink(texto, inicio, fim));
      default:
        return this.aplicar(alternarPrefixo(texto, inicio, fim, acao));
    }
  }

  /**
   * Aplica a edição trocando só o trecho que mudou, com `insertText`: o desfazer do navegador continua
   * valendo. Sem suporte, atribui o valor e avisa o `input` à mão.
   */
  private aplicar(edicao: EdicaoMarkdown): void {
    const alvo = this.campo()?.nativeElement;
    if (!alvo) return;
    const atual = alvo.value;
    const novo = edicao.texto;

    let prefixo = 0;
    const limite = Math.min(atual.length, novo.length);
    while (prefixo < limite && atual[prefixo] === novo[prefixo]) prefixo++;
    let sufixo = 0;
    while (
      sufixo < limite - prefixo &&
      atual[atual.length - 1 - sufixo] === novo[novo.length - 1 - sufixo]
    ) {
      sufixo++;
    }

    const trechoNovo = novo.slice(prefixo, novo.length - sufixo);
    alvo.focus();
    if (atual !== novo) {
      alvo.setSelectionRange(prefixo, atual.length - sufixo);
      const feito =
        trechoNovo === '' ? document.execCommand('delete') : document.execCommand('insertText', false, trechoNovo);
      if (!feito || alvo.value !== novo) {
        alvo.value = novo;
        alvo.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    alvo.setSelectionRange(edicao.inicio, edicao.fim);
    this.atualizarSelecao();
  }
}
