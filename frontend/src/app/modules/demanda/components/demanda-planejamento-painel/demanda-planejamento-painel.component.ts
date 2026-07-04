import { Component, computed, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaPlanejamentoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';

/** Linha da tabela de Planejamento com os derivados de apresentação (percentual/estouro). */
interface LinhaPlanejamento extends DemandaPlanejamentoDto {
  /** Fração 0..1 do executado sobre o estimado; null quando não há estimativa. */
  percentual: number | null;
  /** Percentual exibido, limitado a 100 para a barra. */
  percentualBarra: number;
  /** Percentual real (pode passar de 100) para o rótulo. */
  percentualRotulo: number | null;
  estourou: boolean;
}

@Component({
  selector: 'app-demanda-planejamento-painel',
  standalone: true,
  imports: [TableModule, Tag, ProgressBarModule, TooltipModule, MinutosParaHorasPipe],
  templateUrl: './demanda-planejamento-painel.component.html',
  styleUrl: './demanda-planejamento-painel.component.scss',
})
export class DemandaPlanejamentoPainelComponent {
  readonly itens = input<DemandaPlanejamentoDto[]>([]);
  readonly carregando = input<boolean>(false);

  readonly linhas = computed<LinhaPlanejamento[]>(() =>
    this.itens().map((item) => {
      const minutosEstimados = item.horasEstimadas * 60;
      const temEstimativa = item.horasEstimadas > 0;
      const percentual = temEstimativa ? item.minutosExecutados / minutosEstimados : null;
      return {
        ...item,
        percentual,
        percentualBarra: percentual === null ? 0 : Math.min(100, Math.round(percentual * 100)),
        percentualRotulo: percentual === null ? null : Math.round(percentual * 100),
        estourou: temEstimativa && item.minutosExecutados >= minutosEstimados,
      };
    }),
  );

  severidadeStatus(status: TipoDemandaStatusEnum): 'secondary' | 'info' | 'success' | 'danger' {
    const mapa: Record<TipoDemandaStatusEnum, 'secondary' | 'info' | 'success' | 'danger'> = {
      [TipoDemandaStatusEnum.PENDENTE]:  'secondary',
      [TipoDemandaStatusEnum.PLANEJADA]: 'info',
      [TipoDemandaStatusEnum.CONCLUIDA]: 'success',
      [TipoDemandaStatusEnum.CANCELADA]: 'danger',
    };
    return mapa[status];
  }

  rotuloStatus(status: TipoDemandaStatusEnum): string {
    const mapa: Record<TipoDemandaStatusEnum, string> = {
      [TipoDemandaStatusEnum.PENDENTE]:  'Pendente',
      [TipoDemandaStatusEnum.PLANEJADA]: 'Planejada',
      [TipoDemandaStatusEnum.CONCLUIDA]: 'Concluída',
      [TipoDemandaStatusEnum.CANCELADA]: 'Cancelada',
    };
    return mapa[status];
  }

  /** Nomes dos executores ativos concatenados, para o tooltip. */
  nomesExecutores(linha: LinhaPlanejamento): string {
    return linha.executoresAtivos.map((executor) => executor.nomeCompleto).join(', ');
  }
}
