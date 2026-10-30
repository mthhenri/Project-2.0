import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { interpretarMarkdown } from '@project20/shared';
import { partirPorDestaques } from './destaques.util';
import { MarkdownBlocoCodigoComponent } from '../markdown-bloco-codigo/markdown-bloco-codigo.component';

/**
 * Exibe um texto em Markdown. O texto vira uma árvore de nós (`interpretarMarkdown`) e o template cria
 * elementos nativos a partir dela: nada do texto chega à página como HTML. Proibido aqui qualquer
 * escrita de marcação (binding de HTML interno, desvio do sanitizador do Angular, atribuição direta ao
 * DOM); este componente é a única forma de exibir texto rico.
 */
@Component({
  selector: 'app-markdown-visualizador',
  standalone: true,
  imports: [NgTemplateOutlet, MarkdownBlocoCodigoComponent],
  templateUrl: './markdown-visualizador.component.html',
  styleUrl: './markdown-visualizador.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownVisualizadorComponent {
  readonly texto = input<string | null | undefined>('');

  /** Menções (`@Nome`) e referências (`#Nome`) conhecidas, que ganham um destaque no texto. Vazio, nada muda. */
  readonly destaques = input<readonly string[]>([]);

  /** O texto está sobre um fundo colorido (o balão da própria mensagem): herda cor e tamanho do entorno em vez de usar os do tema. */
  readonly herdaCor = input(false);

  /** Mostra tabelas (`| a | b |`). Ligado por padrão desde que o editor cria tabelas (I-003); quem não deve ver tabela desliga. */
  readonly comTabelas = input(true);

  readonly blocos = computed(() => interpretarMarkdown(this.texto() ?? '', { tabelas: this.comTabelas() }));

  protected partir(valor: string) {
    return partirPorDestaques(valor, this.destaques());
  }
}
