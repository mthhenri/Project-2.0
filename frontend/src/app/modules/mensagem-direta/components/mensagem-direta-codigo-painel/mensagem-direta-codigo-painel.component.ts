import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input, OnInit, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { LIMITE_TEXTO_MENSAGEM_DIRETA } from '@project20/shared';
import { EditorCodigoComponent } from '../../../../shared/components/editor-codigo/editor-codigo.component';
import { LINGUAGENS_DO_EDITOR } from '../../../../shared/components/markdown-bloco-codigo/realce-codigo';
import { inserirBlocoDeCodigo } from '../../utils/compositor.util';

/** O que o painel devolve ao confirmar: o código e o nome curto da cerca (`ts`), ou `null` sem linguagem. */
export interface CodigoEscolhido {
  codigo: string;
  linguagem: string | null;
}

/**
 * O mini editor de código do compositor (task 216): abre pelo botão `</>`, com seletor de linguagem, editor (números de linha, realce, Tab e
 * recuo automático), contador do limite da mensagem e os botões Cancelar e Inserir. `Ctrl+Enter` insere e `Esc` cancela. Quem usa decide
 * o que fazer com o código (o compositor o põe no campo como bloco cercado, já com a linguagem).
 */
@Component({
  selector: 'app-mensagem-direta-codigo-painel',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, Select, TooltipModule, EditorCodigoComponent],
  templateUrl: './mensagem-direta-codigo-painel.component.html',
  styleUrl: './mensagem-direta-codigo-painel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaCodigoPainelComponent implements OnInit {
  /** O texto do campo da mensagem e o trecho que o bloco vai substituir: o contador mede a mensagem inteira, cerca incluída. */
  readonly texto = input.required<string>();
  readonly inicio = input.required<number>();
  readonly fim = input.required<number>();
  /** O código com que o editor abre (o trecho que estava selecionado no campo). */
  readonly codigoInicial = input('');
  readonly inserir = output<CodigoEscolhido>();
  readonly cancelar = output<void>();

  private readonly editor = viewChild.required(EditorCodigoComponent);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly opcoes = LINGUAGENS_DO_EDITOR;
  protected readonly controleLinguagem = new FormControl<string | null>(null);
  protected readonly linguagem = toSignal(this.controleLinguagem.valueChanges, { initialValue: null });
  protected readonly codigo = signal('');
  protected readonly limite = LIMITE_TEXTO_MENSAGEM_DIRETA;

  /** O tamanho que a mensagem teria com o bloco já dentro dela. */
  protected readonly tamanhoFinal = computed(() => inserirBlocoDeCodigo(this.texto(), this.inicio(), this.fim(), this.codigo(), this.linguagem()).texto.length);
  protected readonly excedeu = computed(() => this.tamanhoFinal() > this.limite);
  protected readonly podeInserir = computed(() => this.codigo().trim().length > 0 && !this.excedeu());
  protected readonly contador = computed(() => `${this.tamanhoFinal().toLocaleString('pt-BR')} / ${this.limite.toLocaleString('pt-BR')}`);

  constructor() {
    afterNextRender(() => this.editor().focar());
  }

  ngOnInit(): void {
    this.codigo.set(this.codigoInicial());
  }

  protected confirmar(): void {
    if (this.podeInserir()) this.inserir.emit({ codigo: this.codigo(), linguagem: this.linguagem() });
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    if (evento.isComposing) return;
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      this.confirmar();
      return;
    }
    // O Esc do seletor de linguagem fecha só a lista dele; em qualquer outro lugar do painel, cancela (e não chega ao Esc do popup).
    const noSeletor = evento.target instanceof Element && evento.target.closest('p-select') !== null;
    if (evento.key === 'Escape' && !noSeletor && this.elemento.nativeElement.contains(evento.target as Node)) {
      evento.preventDefault();
      evento.stopPropagation();
      this.cancelar.emit();
    }
  }
}
