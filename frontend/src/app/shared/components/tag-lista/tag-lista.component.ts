import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { TagResumoDto } from '@project20/shared';

/**
 * As tags de um item em listas e linhas (P-050): chips com espaço entre si e entre as linhas, nome longo cortado com reticências e, passando de
 * `maximo`, um "+N" que diz no tooltip quais ficaram de fora. É só apresentação: quem edita as tags continua sendo o dono da lista.
 * Análogo: o chip do cabeçalho da demanda (`demanda-tags-cabecalho`), que mostra todas e edita.
 */
@Component({
  selector: 'app-tag-lista',
  standalone: true,
  imports: [TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.tag-lista--compacto]': 'compacto()' },
  templateUrl: './tag-lista.component.html',
  styleUrl: './tag-lista.component.scss',
})
export class TagListaComponent {
  readonly tags = input.required<readonly TagResumoDto[]>();
  /** Quantas aparecem antes do "+N". */
  readonly maximo = input(3);
  /** Chip mais estreito, para coluna de tabela que não tem folga. */
  readonly compacto = input(false);

  readonly visiveis = computed(() => this.tags().slice(0, this.maximo()));
  readonly ocultas = computed(() => this.tags().slice(this.maximo()));
  readonly nomesOcultos = computed(() => this.ocultas().map((tag) => tag.nome).join(', '));
}
