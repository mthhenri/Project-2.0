import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { carregarRealce } from './carregador-realce';
import { linguagemDoRealce, rotuloDoBloco, TrechoDeCodigo } from './realce-codigo';

/** Quanto tempo o botão fica em "Copiado" antes de voltar a "Copiar". */
export const TEMPO_DO_COPIADO_MS = 2000;

/**
 * Um bloco de código cercado do Markdown (task 189): cabeçalho com a linguagem e o botão Copiar, e o código com realce quando a
 * linguagem é conhecida. O realce vem de um tokenizador que devolve trechos; o template monta `<span>` com a classe de cada tipo, sem
 * HTML injetado (regra do `app-markdown-visualizador`, que é quem usa este componente). O tokenizador e a gramática só são baixados
 * quando aparece um bloco com linguagem conhecida; enquanto isso (e se falhar) o código aparece sem realce.
 */
@Component({
  selector: 'app-markdown-bloco-codigo',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './markdown-bloco-codigo.component.html',
  styleUrl: './markdown-bloco-codigo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownBlocoCodigoComponent implements OnDestroy {
  /** A linguagem da cerca (` ```ts `), ou `null`. */
  readonly linguagem = input<string | null | undefined>(null);
  /** O código exato, sem a cerca. */
  readonly valor = input.required<string>();

  readonly rotulo = computed(() => rotuloDoBloco(this.linguagem()));
  /** Os trechos realçados; `null` enquanto carrega, sem linguagem conhecida ou se o realce falhou. */
  readonly trechos = signal<TrechoDeCodigo[] | null>(null);
  readonly copiado = signal(false);
  /** O que o template desenha: os trechos realçados ou, sem eles, o código inteiro como um trecho só. */
  readonly exibicao = computed<TrechoDeCodigo[]>(() => this.trechos() ?? [{ texto: this.valor(), tipo: null }]);

  private readonly messageService = inject(MessageService);
  private temporizadorDoCopiado: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect((aoLimpar) => {
      const gramatica = linguagemDoRealce(this.linguagem());
      const codigo = this.valor();
      this.trechos.set(null);
      if (!gramatica) return;
      let obsoleto = false;
      aoLimpar(() => (obsoleto = true));
      carregarRealce(gramatica)
        .then((realcar) => {
          if (!obsoleto) this.trechos.set(realcar(codigo));
        })
        .catch(() => {
          // Sem rede ou sem a gramática: o código continua legível, só sem cor.
        });
    });
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.valor());
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Código', detail: 'Não foi possível copiar o código' });
      return;
    }
    this.copiado.set(true);
    if (this.temporizadorDoCopiado) clearTimeout(this.temporizadorDoCopiado);
    this.temporizadorDoCopiado = setTimeout(() => this.copiado.set(false), TEMPO_DO_COPIADO_MS);
  }

  ngOnDestroy(): void {
    if (this.temporizadorDoCopiado) clearTimeout(this.temporizadorDoCopiado);
  }
}
