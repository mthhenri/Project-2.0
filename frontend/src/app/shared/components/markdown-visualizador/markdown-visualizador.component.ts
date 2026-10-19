import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { interpretarMarkdown } from '@project20/shared';
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

  readonly blocos = computed(() => interpretarMarkdown(this.texto() ?? ''));
}
