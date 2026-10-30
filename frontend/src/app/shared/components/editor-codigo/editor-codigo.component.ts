import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, effect, input, model, signal, viewChild } from '@angular/core';
import { carregarRealce } from '../markdown-bloco-codigo/carregador-realce';
import { linguagemDoRealce, TrechoDeCodigo } from '../markdown-bloco-codigo/realce-codigo';
import { desindentar, diferencaDeTexto, EdicaoDoEditor, indentar, quebrarLinha } from './editor-codigo.util';

/**
 * Editor de código pequeno (task 216): um `<textarea>` transparente por cima de uma camada que mostra o mesmo texto com realce (as mesmas
 * gramáticas e cores do bloco enviado, `app-markdown-bloco-codigo`), mais uma coluna de números de linha. As duas camadas usam a mesma fonte e
 * o mesmo espaçamento, sem quebra automática (rola na horizontal), e a rolagem do `<textarea>` é copiada para elas. Tab e Shift+Tab recuam,
 * Enter mantém o recuo. Não é um VS Code: sem autocompletar nem fechamento automático de pares.
 *
 * O realce vem de trechos montados em `<span>` pelo template (sem HTML injetado); enquanto a gramática baixa, ou sem linguagem, o código
 * aparece sem cor.
 */
@Component({
  selector: 'app-editor-codigo',
  standalone: true,
  templateUrl: './editor-codigo.component.html',
  styleUrl: './editor-codigo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorCodigoComponent {
  /** O código do editor. */
  readonly valor = model<string>('');
  /** A linguagem do realce, em qualquer apelido que o bloco enviado entende (`ts`, `python`...); `null` não realça. */
  readonly linguagem = input<string | null | undefined>(null);
  /** O nome que leitores de tela dão ao campo. */
  readonly rotulo = input('Código');

  private readonly campo = viewChild.required<ElementRef<HTMLTextAreaElement>>('campo');
  private readonly numeros = viewChild.required<ElementRef<HTMLElement>>('numeros');
  private readonly camadaDeRealce = viewChild.required<ElementRef<HTMLElement>>('camadaDeRealce');

  /** A função que realça o texto da linguagem atual; `null` enquanto carrega, sem linguagem conhecida ou se falhar. */
  private readonly realcar = signal<((codigo: string) => TrechoDeCodigo[]) | null>(null);

  /** O que a camada desenha: os trechos realçados ou, sem eles, o texto inteiro como um trecho só. */
  protected readonly exibicao = computed<TrechoDeCodigo[]>(() => {
    const texto = this.valor();
    const realcar = this.realcar();
    // Texto que termina em quebra de linha precisa de um caractere depois dela, senão a última linha vazia não ganha altura na camada.
    const trechos = realcar ? realcar(texto) : [{ texto, tipo: null }];
    return texto.endsWith('\n') ? [...trechos, { texto: ' ', tipo: null }] : trechos;
  });

  protected readonly numerosDasLinhas = computed(() => Array.from({ length: this.valor().split('\n').length }, (_, indice) => indice + 1));

  constructor() {
    effect((aoLimpar) => {
      const gramatica = linguagemDoRealce(this.linguagem());
      this.realcar.set(null);
      if (!gramatica) return;
      let obsoleto = false;
      aoLimpar(() => (obsoleto = true));
      carregarRealce(gramatica)
        .then((realcar) => {
          if (!obsoleto) this.realcar.set(realcar);
        })
        .catch(() => {
          // Sem rede ou sem a gramática: o código continua editável, só sem cor.
        });
    });

    // O campo rola para o cursor assim que o texto muda (um código colado leva o cursor ao fim), mas as camadas só crescem depois da renderização: a
    // rolagem copiada no evento chegava a elas ainda curta e ficava assim. Depois de cada renderização, a rolagem é copiada de novo.
    afterRenderEffect(() => {
      this.exibicao();
      this.numerosDasLinhas();
      this.sincronizarRolagem();
    });

    // Quem muda o `valor` por fora (o painel abre com o trecho selecionado) escreve no campo; o que o usuário digita já está nele.
    effect(() => {
      const valor = this.valor();
      const campo = this.campo().nativeElement;
      if (campo.value !== valor) campo.value = valor;
    });
  }

  /** Põe o foco no campo, com o cursor no fim do código. */
  focar(): void {
    const campo = this.campo().nativeElement;
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  }

  protected aoDigitar(): void {
    this.valor.set(this.campo().nativeElement.value);
  }

  /** As camadas de trás acompanham a rolagem do campo. */
  protected sincronizarRolagem(): void {
    const campo = this.campo().nativeElement;
    this.numeros().nativeElement.scrollTop = campo.scrollTop;
    const camada = this.camadaDeRealce().nativeElement;
    camada.scrollTop = campo.scrollTop;
    camada.scrollLeft = campo.scrollLeft;
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    if (evento.isComposing || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    const campo = this.campo().nativeElement;
    const inicio = campo.selectionStart;
    const fim = campo.selectionEnd;
    if (evento.key === 'Tab') {
      evento.preventDefault();
      this.aplicar(evento.shiftKey ? desindentar(campo.value, inicio, fim) : indentar(campo.value, inicio, fim));
    } else if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      this.aplicar(quebrarLinha(campo.value, inicio, fim));
    }
  }

  /**
   * Troca só o trecho que mudou pelo comando nativo de inserção (o Ctrl+Z desfaz a edição); sem ele, `setRangeText`. Depois põe a seleção que
   * a regra pediu e atualiza o `valor`.
   */
  private aplicar(edicao: EdicaoDoEditor): void {
    const campo = this.campo().nativeElement;
    const { inicio, fimAntigo, inserido } = diferencaDeTexto(campo.value, edicao.texto);
    campo.focus();
    campo.setSelectionRange(inicio, fimAntigo);
    const nativo = typeof document.execCommand === 'function' && (inserido === '' ? document.execCommand('delete') : document.execCommand('insertText', false, inserido));
    if (!nativo) {
      campo.setRangeText(inserido, inicio, fimAntigo, 'end');
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    }
    campo.setSelectionRange(edicao.inicio, edicao.fim);
    this.valor.set(campo.value);
  }
}
