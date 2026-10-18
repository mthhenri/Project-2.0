import { Component, input, output, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { Tag } from 'primeng/tag';
import { TagResumoDto, TipoAtividadeStatusEnum } from '@project20/shared';
import { ATIVIDADE_STATUS_OPCOES, severidadeStatusAtividade } from '../../models/atividade.model';
import { AtividadeTagsPopoverComponent } from '../atividade-tags-popover/atividade-tags-popover.component';

/**
 * Barra flutuante de ações em massa da listagem de Atividades (gestor): aparece com atividades selecionadas e oferece mudar o status,
 * acrescentar tags e excluir. Só emite o que o gestor pediu; quem aplica (e conta o que deu certo) é a tela.
 */
@Component({
  selector: 'app-atividade-barra-em-massa',
  standalone: true,
  imports: [ButtonModule, PopoverModule, Tag, AtividadeTagsPopoverComponent],
  templateUrl: './atividade-barra-em-massa.component.html',
  styleUrl: './atividade-barra-em-massa.component.scss',
})
export class AtividadeBarraEmMassaComponent {
  readonly quantidade = input.required<number>();
  readonly tags = input.required<TagResumoDto[]>();
  readonly carregandoTags = input<boolean>(false);
  /** Uma ação em massa está em andamento: os botões ficam bloqueados. */
  readonly ocupado = input<boolean>(false);

  readonly mudarStatus = output<TipoAtividadeStatusEnum>();
  readonly acrescentarTags = output<number[]>();
  readonly excluir = output<void>();
  readonly limpar = output<void>();
  /** Pede as tags quando o gestor abre o seletor pela primeira vez. */
  readonly precisaDasTags = output<void>();

  private readonly statusPopover = viewChild.required<Popover>('statusPopover');
  private readonly tagsPopover = viewChild.required<AtividadeTagsPopoverComponent>('tagsPopover');

  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;
  readonly severidade = severidadeStatusAtividade;

  abrirStatus(evento: Event): void {
    this.statusPopover().toggle(evento);
  }

  escolherStatus(status: TipoAtividadeStatusEnum | null): void {
    if (!status) return;
    this.statusPopover().hide();
    this.mudarStatus.emit(status);
  }

  abrirTags(evento: Event): void {
    this.precisaDasTags.emit();
    this.tagsPopover().abrir(evento, evento.currentTarget as HTMLElement, []);
  }
}
