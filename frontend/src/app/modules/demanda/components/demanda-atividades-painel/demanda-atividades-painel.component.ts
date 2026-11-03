import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { AtividadeResumoDto } from '@project20/shared';
import { AtividadeEmExecucaoComponent } from '../../../atividade/components/atividade-em-execucao/atividade-em-execucao.component';
import { AtividadeStatusIconeComponent } from '../../../atividade/components/atividade-status-icone/atividade-status-icone.component';
import { rotuloStatusAtividade, visualStatusAtividade } from '../../../atividade/models/atividade.model';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { calcularConsumoDaDemanda, contarAtividadesPorSituacao, filtrarAtividadesDaDemanda, FiltroAtividadesDaDemanda } from '../../utils/demanda-atividades-consumo.util';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';

/**
 * As atividades de uma demanda (a aba Atividades do diálogo de detalhe e da demanda aberta da Árvore, tasks 239 e 304): o total consumido pela
 * demanda numa barra dividida por atividade, e um cartão por atividade com a fatia que ela consumiu (a atividade não tem horas esperadas: a
 * barra mostra a proporção entre elas), o que está em execução agora, filtros e "Nova atividade" / "Ver todas". Só apresenta; quem hospeda carrega
 * a lista e abre o que os botões pedem. Iniciar e pausar não estão aqui (ver a spec 304).
 */
@Component({
    selector: 'app-demanda-atividades-painel',
    standalone: true,
    imports: [FormsModule, ButtonModule, SelectButtonModule, TooltipModule, AtividadeEmExecucaoComponent, AtividadeStatusIconeComponent, PrioridadeSeloComponent, TempoExibicaoPipe],
    templateUrl: './demanda-atividades-painel.component.html',
    styleUrl: './demanda-atividades-painel.component.scss',
})
export class DemandaAtividadesPainelComponent {
    readonly unidadeTempo = inject(VisualizacaoTempoService);

    readonly atividades = input.required<AtividadeResumoDto[]>();
    readonly carregando = input<boolean>(false);
    readonly nova = output<void>();
    readonly verTodas = output<void>();

    readonly rotuloStatusAtividade = rotuloStatusAtividade;
    readonly visualStatusAtividade = visualStatusAtividade;

    private readonly sessao = inject(UsuarioSessaoService);

    readonly filtro = signal<FiltroAtividadesDaDemanda>('todas');
    readonly opcoesFiltro: { rotulo: string; valor: FiltroAtividadesDaDemanda }[] = [
        { rotulo: 'Todas', valor: 'todas' },
        { rotulo: 'Minhas', valor: 'minhas' },
        { rotulo: 'Em aberto', valor: 'abertas' },
    ];

    readonly consumo = computed(() => calcularConsumoDaDemanda(this.atividades()));
    readonly contagem = computed(() => contarAtividadesPorSituacao(this.atividades()));
    readonly visiveis = computed(() => filtrarAtividadesDaDemanda(this.atividades(), this.filtro(), this.sessao.id()));
    private readonly fatiaPorAtividade = computed(() => new Map(this.consumo().fatias.map((fatia) => [fatia.atividadeId, fatia])));

    fatiaDe(atividadeId: number) {
        return this.fatiaPorAtividade().get(atividadeId) ?? { atividadeId, minutos: 0, percentual: 0 };
    }

    iniciaisUsuario(nome: string): string {
        return (nome ?? '').split(' ').slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
    }
}
