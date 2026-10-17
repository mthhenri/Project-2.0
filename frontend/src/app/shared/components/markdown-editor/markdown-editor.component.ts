import { Component, ElementRef, forwardRef, input, output, signal, viewChild } from '@angular/core';
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

export type AcaoMarkdown =
  | 'negrito'
  | 'italico'
  | 'tachado'
  | 'codigo'
  | 'link'
  | PrefixoDeLinha;

interface BotaoDaBarra {
  acao: AcaoMarkdown;
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
 * Editor de Markdown próprio. O valor do controle é sempre a **string Markdown** (vazio é `''`).
 *
 * - Campo: `<textarea>` nativo (seleção, desfazer e refazer nativos; as edições da barra entram pelo
 *   `insertText`, que preserva o desfazer do navegador).
 * - Barra, `Ctrl+B`/`Ctrl+I`/`Ctrl+K`, `Enter` continuando listas e `Tab`/`Shift+Tab` aninhando itens.
 * - **`Enter` insere linha**; quem confirma o dialog é o `Ctrl+Enter` (contrato do `dialogFormulario`).
 * - Abas Editar | Visualizar (a pré-visualização usa `app-markdown-visualizador`).
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
  /** Esconde as abas Editar | Visualizar e deixa só o campo com a barra (o pad, onde a prévia não faz falta). */
  readonly semAbas = input<boolean>(false);
  readonly emitirMenuContexto = input<boolean>(false);

  /** Botão direito sobre um trecho selecionado (só com `emitirMenuContexto`); o consumidor abre o seu menu. */
  readonly aoMenuContexto = output<MenuContextoEditorEvento>();

  readonly valor = signal<string>('');
  readonly desabilitado = signal<boolean>(false);
  readonly aba = signal<'editar' | 'visualizar'>('editar');
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

  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campo');
  private aoMudar: (valor: string) => void = () => {};
  private aoTocar: () => void = () => {};

  // --- ControlValueAccessor ---------------------------------------------------------------------

  writeValue(valor: string | null): void {
    this.valor.set(valor ?? '');
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
    this.aba.set('editar');
    setTimeout(() => this.campo()?.nativeElement.focus());
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

  mostrarAba(aba: 'editar' | 'visualizar'): void {
    this.aba.set(aba);
    if (aba === 'editar') this.focar();
  }
}
