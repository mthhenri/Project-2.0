import { Component, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AtividadeResumoDto } from '@project20/shared';
import { rotuloStatusAtividade, severidadeStatusAtividade } from '../../../atividade/models/atividade.model';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';

/**
 * As atividades de uma demanda (a aba Atividades do diálogo de detalhe e da demanda aberta da Árvore, task 239): lista com status, prioridade,
 * executor e tempo, mais "Nova atividade" e "Ver todas". Só apresenta; quem hospeda carrega a lista e abre o que os botões pedem.
 */
@Component({
  selector: 'app-demanda-atividades-painel',
  standalone: true,
  imports: [ButtonModule, Tag, TooltipModule, PrioridadeSeloComponent, TempoExibicaoPipe],
  templateUrl: './demanda-atividades-painel.component.html',
  styleUrl: './demanda-atividades-painel.component.scss',
})
export class DemandaAtividadesPainelComponent {
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  readonly atividades = input.required<AtividadeResumoDto[]>();
  readonly carregando = input<boolean>(false);
  readonly nova = output<void>();
  readonly verTodas = output<void>();

  readonly severidadeStatusAtividade = severidadeStatusAtividade;
  readonly rotuloStatusAtividade = rotuloStatusAtividade;

  iniciaisUsuario(nome: string): string {
    return (nome ?? '').split(' ').slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  }
}
