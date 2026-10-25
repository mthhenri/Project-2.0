import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MarkdownEditorComponent } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';

/**
 * O diálogo de edição (ou leitura) de uma descrição da demanda, o mesmo no diálogo de detalhe e na demanda aberta da Árvore (task 239).
 * Só apresenta: o estado, o formulário e o salvar são da `DemandaDetalheBase`, que também decide se pergunta antes de fechar com alteração
 * não salva (`tentarFechar`).
 */
@Component({
  selector: 'app-demanda-descricao-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, MarkdownEditorComponent, MarkdownVisualizadorComponent, AssistenteDescricaoComponent],
  templateUrl: './demanda-descricao-dialog.component.html',
  styleUrl: './demanda-descricao-dialog.component.scss',
})
export class DemandaDescricaoDialogComponent {
  readonly visivel = input.required<boolean>();
  readonly titulo = input.required<string>();
  readonly nomeDemanda = input<string>('');
  readonly podeEditar = input<boolean>(false);
  readonly carregandoSalvar = input<boolean>(false);
  readonly formulario = input.required<FormGroup>();

  /** Qualquer pedido de fechar (X, ESC, Cancelar), com o valor de `visible` que o PrimeNG quer; quem hospeda confirma se há o que salvar. */
  readonly tentarFechar = output<boolean>();
  readonly salvar = output<void>();
  readonly textoAssistenteAceito = output<string>();

  get texto(): string {
    return (this.formulario().value['valor'] as string | null) ?? '';
  }
}
