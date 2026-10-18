import { Component, input, output, signal, viewChild } from '@angular/core';
import { Popover, PopoverModule } from 'primeng/popover';
import { TagResumoDto } from '@project20/shared';

/**
 * Seletor de tags em popover (chips clicáveis), o mesmo padrão do cabeçalho da demanda. **Não salva a cada clique**: ao fechar, se o
 * conjunto mudou, emite `salvar` com os ids marcados. Serve à tag de uma atividade na célula da listagem e, em massa, a "acrescentar
 * tags" às atividades selecionadas (a tela decide o que fazer com o conjunto).
 */
@Component({
  selector: 'app-atividade-tags-popover',
  standalone: true,
  imports: [PopoverModule],
  templateUrl: './atividade-tags-popover.component.html',
  styleUrl: './atividade-tags-popover.component.scss',
})
export class AtividadeTagsPopoverComponent {
  readonly tags = input.required<TagResumoDto[]>();
  readonly titulo = input<string>('Tags');
  /** Com `true`, só emite quando há ao menos uma tag marcada (acrescentar em massa não faz nada com o conjunto vazio). */
  readonly exigirSelecao = input<boolean>(false);
  readonly carregando = input<boolean>(false);
  /** Os ids marcados ao fechar, só quando mudaram em relação ao que estava marcado ao abrir. */
  readonly salvar = output<number[]>();

  private readonly popover = viewChild.required<Popover>('popover');
  readonly selecionadas = signal<number[]>([]);
  private inicial: number[] = [];

  /** Abre ancorado em `alvo` (ou no elemento do evento). */
  abrir(evento: Event, alvo: HTMLElement | undefined, marcadas: readonly number[]): void {
    this.inicial = [...marcadas];
    this.selecionadas.set([...marcadas]);
    this.popover().show(evento, alvo);
  }

  estaMarcada(tagId: number): boolean {
    return this.selecionadas().includes(tagId);
  }

  alternar(tagId: number): void {
    this.selecionadas.update((atuais) => (atuais.includes(tagId) ? atuais.filter((id) => id !== tagId) : [...atuais, tagId]));
  }

  aoFechar(): void {
    const atuais = this.selecionadas();
    const mudou = atuais.length !== this.inicial.length || atuais.some((id) => !this.inicial.includes(id));
    if (!mudou) return;
    if (this.exigirSelecao() && atuais.length === 0) return;
    this.salvar.emit([...atuais]);
  }
}
