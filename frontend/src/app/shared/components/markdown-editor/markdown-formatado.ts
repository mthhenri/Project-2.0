import { Editor, defaultValueCtx, editorViewCtx, remarkStringifyOptionsCtx, rootCtx, serializerCtx } from '@milkdown/kit/core';
import {
  commonmark,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark';
import { gfm, toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm';
import { history, redoCommand, undoCommand } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { callCommand, getMarkdown, replaceAll } from '@milkdown/kit/utils';
import { toggleLinkCommand, turnIntoTextCommand } from '@milkdown/kit/preset/commonmark';
import { lift } from '@milkdown/kit/prose/commands';
import { liftListItem } from '@milkdown/kit/prose/schema-list';
import type { EditorState } from '@milkdown/kit/prose/state';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import type { Node as NoProse, ResolvedPos } from '@milkdown/kit/prose/model';

/**
 * Edição formatada do Markdown (task 134). O texto guardado é sempre Markdown; o Milkdown (ProseMirror) só
 * mostra e edita já formatado. Este arquivo não conhece Angular: o componente o usa e os testes de ida e volta
 * o exercitam sob jsdom.
 *
 * A barra e as regras de digitação só criam o que o `interpretarMarkdown` do shared entende (negrito, itálico, tachado, código em
 * linha, link, títulos, listas, tarefas, citação, bloco de código e régua). HTML cru no texto vira um nó de texto (o Milkdown o desenha com `textContent`), nunca
 * marcação na página.
 */

export type AcaoFormatada =
  | 'desfazer'
  | 'refazer'
  | 'titulo1'
  | 'titulo2'
  | 'titulo3'
  | 'negrito'
  | 'italico'
  | 'tachado'
  | 'codigo'
  | 'lista'
  | 'numerada'
  | 'citacao'
  | 'tarefa'
  | 'link';

/**
 * Também sai o plugin que grava parágrafo vazio como `<br />` (o texto guardado não leva HTML: parágrafo vazio some).
 *
 * Tabela e imagem não são geradas pelo editor (o botão não existe e a regra de digitação e de colar que as criam
 * sai). O esquema delas continua carregado de propósito: um texto que já as tenha (vindo da IA, por exemplo) abre
 * sem quebrar o editor e volta igual ao gravar.
 */
const CRIACAO_FORA_DO_SUBCONJUNTO = /^(InputRule|PasteRule)<.*(table|image)|preserveEmptyLine/i;

function dentroDoSubconjunto(plugins: MilkdownPlugin[]): MilkdownPlugin[] {
  return plugins.filter((plugin) => {
    const nome = (plugin as { meta?: { displayName?: string } }).meta?.displayName ?? '';
    return !CRIACAO_FORA_DO_SUBCONJUNTO.test(nome);
  });
}

/** O editor serializa com uma quebra de linha final; o texto guardado não a leva. */
export function semQuebraFinal(markdown: string): string {
  return markdown.replace(/\n+$/, '');
}

export interface OuvintesEditor {
  /** Markdown atual depois de cada mudança no documento (sem espera: o Milkdown atrasa o `markdownUpdated`). */
  aoMudar: (markdown: string) => void;
  /** Documento ou seleção mudou (a barra reavalia os botões acesos). */
  aoAtualizar: () => void;
  aoSair: () => void;
}

function montar(raiz: HTMLElement | null, markdown: string, ouvintes?: OuvintesEditor): Editor {
  const editor = Editor.make().config((contexto) => {
    if (raiz) contexto.set(rootCtx, raiz);
    contexto.set(defaultValueCtx, markdown);
    contexto.update(remarkStringifyOptionsCtx, (opcoes) => ({
      ...opcoes,
      bullet: '-' as const,
      emphasis: '*' as const,
      strong: '*' as const,
      rule: '-' as const,
      listItemIndent: 'one' as const,
    }));
    if (ouvintes) {
      contexto
        .get(listenerCtx)
        .updated((ctx, documento) => {
          ouvintes.aoMudar(semQuebraFinal(ctx.get(serializerCtx)(documento)));
          ouvintes.aoAtualizar();
        })
        .selectionUpdated(() => ouvintes.aoAtualizar())
        .blur(() => ouvintes.aoSair());
    }
  });
  return editor
    .use(dentroDoSubconjunto(commonmark.flat()))
    .use(dentroDoSubconjunto(gfm.flat()))
    .use(history)
    .use(listener);
}

/** Devolve o Markdown na forma que o editor gravaria (a única fonte da forma "normalizada"). */
export async function normalizarMarkdown(markdown: string): Promise<string> {
  const editor = montar(null, markdown);
  await editor.create();
  try {
    return semQuebraFinal(editor.action(getMarkdown()));
  } finally {
    await editor.destroy();
  }
}

export class EditorFormatado {
  private constructor(private readonly editor: Editor) {}

  static async criar(
    raiz: HTMLElement,
    markdown: string,
    ouvintes: OuvintesEditor,
  ): Promise<EditorFormatado> {
    const editor = montar(raiz, markdown, ouvintes);
    await editor.create();
    return new EditorFormatado(editor);
  }

  obterMarkdown(): string {
    return semQuebraFinal(this.editor.action(getMarkdown()));
  }

  definirEditavel(editavel: boolean): void {
    this.editor.action((contexto) => contexto.get(editorViewCtx).setProps({ editable: () => editavel }));
  }

  /** Troca todo o conteúdo (valor novo vindo do formulário), sem disparar `aoMudar` do usuário. */
  definirMarkdown(markdown: string): void {
    this.editor.action(replaceAll(markdown));
  }

  /**
   * Cada botão é um **interruptor**: aplicar de novo desfaz. Negrito, itálico, tachado e código valem para a palavra
   * onde o cursor está (ou a seleção); título, citação e lista saem do bloco se já estão nele; lista troca de tipo
   * (com marcadores para numerada e vice-versa).
   */
  executar(acao: AcaoFormatada): void {
    const marcas: Partial<Record<AcaoFormatada, string>> = {
      negrito: 'strong',
      italico: 'emphasis',
      tachado: 'strike_through',
      codigo: 'inlineCode',
    };
    const marca = marcas[acao];
    if (marca) return this.alternarMarca(marca);

    switch (acao) {
      case 'desfazer':
        return void this.editor.action(callCommand(undoCommand.key));
      case 'refazer':
        return void this.editor.action(callCommand(redoCommand.key));
      case 'titulo1':
        return this.alternarTitulo(1);
      case 'titulo2':
        return this.alternarTitulo(2);
      case 'titulo3':
        return this.alternarTitulo(3);
      case 'lista':
        return this.alternarLista('bullet_list');
      case 'numerada':
        return this.alternarLista('ordered_list');
      case 'tarefa':
        return this.alternarTarefa();
      case 'citacao':
        return this.alternarCitacao();
      case 'link':
        return this.inserirLink();
    }
  }

  /** Marca na seleção; sem seleção, na palavra do cursor (ou a que acabou de ser digitada). */
  private alternarMarca(nome: string): void {
    this.editor.action((contexto) => {
      const view = contexto.get(editorViewCtx);
      const { state } = view;
      const tipo = state.schema.marks[nome];
      if (!tipo) return;
      let { from, to } = state.selection;
      if (state.selection.empty) {
        const faixa = faixaDaPalavra(state);
        if (!faixa) {
          // Sem palavra por perto: vale para o que for digitado a seguir.
          const ativa = Boolean(tipo.isInSet(state.storedMarks ?? state.selection.$from.marks()));
          view.dispatch(ativa ? state.tr.removeStoredMark(tipo) : state.tr.addStoredMark(tipo.create()));
          return;
        }
        from = faixa.de;
        to = faixa.ate;
      }
      const jaTem = state.doc.rangeHasMark(from, to, tipo);
      view.dispatch(jaTem ? state.tr.removeMark(from, to, tipo) : state.tr.addMark(from, to, tipo.create()));
    });
  }

  private alternarTitulo(nivel: 1 | 2 | 3): void {
    const atual = this.ativas();
    const chave = (['titulo1', 'titulo2', 'titulo3'] as const)[nivel - 1];
    if (atual.has(chave)) this.editor.action(callCommand(turnIntoTextCommand.key));
    else this.editor.action(callCommand(wrapInHeadingCommand.key, nivel));
  }

  private alternarCitacao(): void {
    if (this.ativas().has('citacao')) {
      this.editor.action((contexto) => {
        const view = contexto.get(editorViewCtx);
        lift(view.state, view.dispatch);
      });
    } else {
      this.editor.action(callCommand(wrapInBlockquoteCommand.key));
    }
  }

  private alternarLista(tipo: 'bullet_list' | 'ordered_list'): void {
    const emLista = this.editor.action((contexto) => {
      const view = contexto.get(editorViewCtx);
      const { state } = view;
      const { $from } = state.selection;
      for (let profundidade = $from.depth; profundidade > 0; profundidade--) {
        const lista = $from.node(profundidade);
        if (lista.type.name !== 'bullet_list' && lista.type.name !== 'ordered_list') continue;
        if (lista.type.name === tipo) {
          // Mesma lista: tira o item da lista.
          liftListItem(state.schema.nodes['list_item'])(state, view.dispatch);
        } else {
          const atributos = tipo === 'ordered_list' ? { order: 1, spread: lista.attrs['spread'] } : { spread: lista.attrs['spread'] };
          view.dispatch(state.tr.setNodeMarkup($from.before(profundidade), state.schema.nodes[tipo], atributos));
        }
        return true;
      }
      return false;
    });
    if (emLista) return;
    this.editor.action(callCommand(tipo === 'bullet_list' ? wrapInBulletListCommand.key : wrapInOrderedListCommand.key));
  }

  /** Item de tarefa (caixa de marcar): transforma o item em tarefa ou volta a ser item comum; fora de lista, cria a lista. */
  private alternarTarefa(): void {
    const feito = this.editor.action((contexto) => {
      const view = contexto.get(editorViewCtx);
      const { state } = view;
      const { $from } = state.selection;
      for (let profundidade = $from.depth; profundidade > 0; profundidade--) {
        const item = $from.node(profundidade);
        if (item.type.name !== 'list_item') continue;
        const marcado = item.attrs['checked'];
        const novo = marcado === null || marcado === undefined ? false : null;
        view.dispatch(state.tr.setNodeMarkup($from.before(profundidade), undefined, { ...item.attrs, checked: novo }));
        return true;
      }
      return false;
    });
    if (feito) return;
    this.editor.action(callCommand(wrapInBulletListCommand.key));
    this.alternarTarefa();
  }

  /** Pede o endereço e aplica o link ao trecho selecionado (sem seleção, não faz nada). */
  private inserirLink(): void {
    const endereco = typeof window !== 'undefined' ? window.prompt('Endereço do link (https://...)') : null;
    if (!endereco || !/^(https?:\/\/|mailto:)/i.test(endereco.trim())) return;
    this.editor.action(callCommand(toggleLinkCommand.key, { href: endereco.trim() }));
  }

  /** Quais formatações valem no cursor (para acender os botões da barra). */
  ativas(): ReadonlySet<AcaoFormatada> {
    return this.editor.action((contexto) => {
      const { state } = contexto.get(editorViewCtx);
      const { $from, $to, empty } = state.selection;
      const ativas = new Set<AcaoFormatada>();
      const marcas: [string, AcaoFormatada][] = [
        ['strong', 'negrito'],
        ['emphasis', 'italico'],
        ['strike_through', 'tachado'],
        ['inlineCode', 'codigo'],
        ['link', 'link'],
      ];
      for (const [marca, acao] of marcas) {
        const tipo = state.schema.marks[marca];
        if (!tipo) continue;
        const ativa = empty
          ? Boolean(tipo.isInSet(state.storedMarks ?? $from.marks()))
          : state.doc.rangeHasMark($from.pos, $to.pos, tipo);
        if (ativa) ativas.add(acao);
      }
      for (let profundidade = $from.depth; profundidade > 0; profundidade--) {
        const no = $from.node(profundidade);
        if (no.type.name === 'heading') ativas.add(no.attrs['level'] === 1 ? 'titulo1' : no.attrs['level'] === 2 ? 'titulo2' : 'titulo3');
        if (no.type.name === 'list_item' && no.attrs['checked'] !== null && no.attrs['checked'] !== undefined) ativas.add('tarefa');
        if (no.type.name === 'bullet_list' && !ativas.has('tarefa')) ativas.add('lista');
        if (no.type.name === 'ordered_list') ativas.add('numerada');
        if (no.type.name === 'blockquote') ativas.add('citacao');
      }
      return ativas;
    });
  }

  /** Há trecho selecionado no editor? */
  temSelecao(): boolean {
    return this.editor.action((contexto) => !contexto.get(editorViewCtx).state.selection.empty);
  }

  /**
   * Markdown do **bloco inteiro** (parágrafo, título, bloco de código ou item de lista) que a seleção toca, para o
   * "Enviar para": no editor formatado a seleção é de conteúdo renderizado, e mover só um pedaço de uma formatação
   * quebraria o texto. Seleção que atravessa blocos leva todos eles.
   */
  blocoSelecionadoEmMarkdown(): string {
    return this.editor.action((contexto) => {
      const { state } = contexto.get(editorViewCtx);
      const { $from, $to, empty } = state.selection;
      if (empty) return '';

      const unidade = (posicao: ResolvedPos): number => {
        for (let profundidade = posicao.depth; profundidade > 0; profundidade--) {
          if (posicao.node(profundidade).type.name === 'list_item') return profundidade;
        }
        return Math.max(1, posicao.depth);
      };
      const profundidadeInicio = unidade($from);
      const profundidadeFim = unidade($to);
      const inicio = $from.before(profundidadeInicio);
      const fim = $to.after(profundidadeFim);

      const itemDeLista = $from.node(profundidadeInicio).type.name === 'list_item';
      let filhos: NoProse[] = [];
      const profundidadePai = Math.max(0, profundidadeInicio - 1);
      const pai = $from.node(profundidadePai);
      const inicioDoPai = profundidadePai === 0 ? 0 : $from.start(profundidadePai);
      pai.forEach((filho, deslocamento) => {
        const posicao = inicioDoPai + deslocamento;
        if (posicao >= inicio && posicao + filho.nodeSize <= fim) filhos.push(filho);
      });
      if (filhos.length === 0) return '';
      if (itemDeLista) {
        const lista = $from.node(profundidadeInicio - 1);
        filhos = [lista.type.create(lista.attrs, filhos)];
      }
      const documento = state.schema.topNodeType.create(null, filhos);
      return semQuebraFinal(contexto.get(serializerCtx)(documento));
    });
  }

  focar(): void {
    this.editor.action((contexto) => contexto.get(editorViewCtx).focus());
  }

  async destruir(): Promise<void> {
    await this.editor.destroy();
  }

  /** Para os testes e para quem precisa do contexto cru do ProseMirror. */
  acao<T>(fn: Parameters<Editor['action']>[0]): T {
    return this.editor.action(fn) as T;
  }
}

/** Faixa da palavra sob o cursor (ou imediatamente antes dele), em posições do documento; `null` se não houver. */
function faixaDaPalavra(state: EditorState): { de: number; ate: number } | null {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return null;
  const texto = $from.parent.textBetween(0, $from.parent.content.size, undefined, '\ufffc');
  const eLetra = (caractere: string | undefined): boolean => caractere !== undefined && /[\p{L}\p{N}_]/u.test(caractere);
  let inicio = $from.parentOffset;
  let fim = inicio;
  while (inicio > 0 && eLetra(texto[inicio - 1])) inicio--;
  while (fim < texto.length && eLetra(texto[fim])) fim++;
  if (inicio === fim) return null;
  const base = $from.start();
  return { de: base + inicio, ate: base + fim };
}
