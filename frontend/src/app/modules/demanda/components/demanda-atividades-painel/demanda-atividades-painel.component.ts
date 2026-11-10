import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { AtividadeResumoDto, temPermissaoDeGestor } from '@project20/shared';
import { AtividadeEmExecucaoComponent } from '../../../atividade/components/atividade-em-execucao/atividade-em-execucao.component';
import { AtividadeStatusIconeComponent } from '../../../atividade/components/atividade-status-icone/atividade-status-icone.component';
import { ExecucaoIniciarDialogComponent } from '../../../atividade/components/execucao-iniciar-dialog/execucao-iniciar-dialog.component';
import { ATIVIDADE_STATUS_EXECUTAVEL, rotuloStatusAtividade, visualStatusAtividade } from '../../../atividade/models/atividade.model';
import { ExecucaoEncerrarDialogComponent } from '../../../../shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { calcularConsumoDaDemanda, contarAtividadesPorSituacao, filtrarAtividadesDaDemanda, FiltroAtividadesDaDemanda } from '../../utils/demanda-atividades-consumo.util';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { DemandaBarraHorasComponent } from '../demanda-barra-horas/demanda-barra-horas.component';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';

/**
 * As atividades de uma demanda (a aba Atividades do diálogo de detalhe e da demanda aberta da Árvore, tasks 239 e 304): o total consumido pela
 * demanda numa barra dividida por atividade, e um cartão por atividade com a fatia que ela consumiu (a atividade não tem horas esperadas: a
 * barra mostra a proporção entre elas), o que está em execução agora, filtros e "Nova atividade" / "Ver todas". Só apresenta; quem hospeda carrega
 * a lista e abre o que os botões pedem. O cartão traz o play e o pause da atividade (mesma regra e mesmos diálogos da listagem de atividades:
 * "Iniciar execução" próprio e "Encerrar execução" compartilhado); depois de iniciar ou encerrar, `execucaoAlterada` pede a recarga da lista.
 */
@Component({
    selector: 'app-demanda-atividades-painel',
    standalone: true,
    imports: [AvatarUsuarioComponent, FormsModule, ButtonModule, SelectButtonModule, TooltipModule, AtividadeEmExecucaoComponent, AtividadeStatusIconeComponent, DemandaBarraHorasComponent, ExecucaoEncerrarDialogComponent, ExecucaoIniciarDialogComponent, PrioridadeSeloComponent, TempoExibicaoPipe],
    templateUrl: './demanda-atividades-painel.component.html',
    styleUrl: './demanda-atividades-painel.component.scss',
})
export class DemandaAtividadesPainelComponent {
    readonly unidadeTempo = inject(VisualizacaoTempoService);

    readonly atividades = input.required<AtividadeResumoDto[]>();
    /** Horas estimadas da demanda: a barra do total mostra o estouro (executado acima do estimado) em vermelho. */
    readonly horasEstimadas = input<number>(0);
    readonly carregando = input<boolean>(false);
    readonly nova = output<void>();
    readonly verTodas = output<void>();
    /** Uma execução foi iniciada ou encerrada pelo cartão: quem hospeda recarrega as atividades. */
    readonly execucaoAlterada = output<void>();

    private readonly dialogoIniciar = viewChild.required<ExecucaoIniciarDialogComponent>('dialogoIniciar');
    private readonly dialogoEncerrar = viewChild.required<ExecucaoEncerrarDialogComponent>('dialogoEncerrar');

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

    /** Gestor, administrador e auxiliar conduzem a execução de qualquer atividade; o desenvolvedor, só a das suas (§14). */
    podeExecutar(atividade: AtividadeResumoDto): boolean {
        return this.sessao.podeConduzirExecucaoDeOutro() || atividade.usuarioId === this.sessao.id();
    }

    /** O play só vale para atividade planejada ou em desenvolvimento; o pause vale sempre que há execução em andamento. */
    podeAlternar(atividade: AtividadeResumoDto): boolean {
        return atividade.execucaoAtivaId !== null || ATIVIDADE_STATUS_EXECUTAVEL.includes(atividade.status);
    }

    /** Quando a execução em andamento começou, para o cronômetro do selo "Em execução"; sem ela, o selo fica sem o tempo. */
    inicioDaExecucao(atividade: AtividadeResumoDto): Date | null {
        return atividade.execucaoAtivaInicioData ? new Date(atividade.execucaoAtivaInicioData) : null;
    }

    rotuloExecucao(atividade: AtividadeResumoDto): string {
        if (atividade.execucaoAtivaId !== null) return 'Encerrar execução';
        return this.podeAlternar(atividade) ? 'Iniciar execução' : 'Mude o status para Planejada ou Desenvolvendo';
    }

    alternarExecucao(atividade: AtividadeResumoDto): void {
        if (atividade.execucaoAtivaId !== null) {
            this.dialogoEncerrar().abrir({
                execucaoId: atividade.execucaoAtivaId,
                atividadeId: atividade.id,
                descricao: atividade.execucaoAtivaDescricao ?? '',
                descricaoOpcional: !!atividade.usuarioTipo && temPermissaoDeGestor(atividade.usuarioTipo),
            });
            return;
        }
        this.dialogoIniciar().abrir(atividade);
    }

    fatiaDe(atividadeId: number) {
        return this.fatiaPorAtividade().get(atividadeId) ?? { atividadeId, minutos: 0, percentual: 0 };
    }

}
