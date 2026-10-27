import { Component, OnInit, inject, output, signal } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ContextMenu } from 'primeng/contextmenu';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaExecutadaResumoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DemandaBarraHorasComponent } from '../../../demanda/components/demanda-barra-horas/demanda-barra-horas.component';
import { DemandaStatusMarcaComponent } from '../../../demanda/components/demanda-status-marca/demanda-status-marca.component';
import { OPCOES_STATUS_DEMANDA } from '../../../demanda/constants/demanda-cores.constants';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { percentualDesenvolvidas, rotuloDesenvolvidas } from '../../utils/minhas-demandas.util';

/** Quantas demandas a lateral pede à API. */
const QUANTIDADE_DE_DEMANDAS = 20;

/**
 * "Minhas demandas" (task 245): a lateral à direita do chat, com as últimas demandas que o usuário executou — caminho, barra de horas e quantas
 * atividades estão desenvolvidas. Só entram as que estão em aberto (sem CONCLUIDA nem CANCELADA). Clicar numa abre a demanda ao lado da conversa (a página
 * do chat decide); o botão direito troca o status dela ou, para o desenvolvedor, sai da demanda (com "Desfazer"). Análogo: o seletor do chat para o
 * desenho dos itens e a Árvore de demandas (task 239) para a barra de horas e a bolinha de status.
 */
@Component({
  selector: 'app-chat-minhas-demandas',
  standalone: true,
  imports: [ButtonModule, ContextMenu, SkeletonModule, TooltipModule, DemandaBarraHorasComponent, DemandaStatusMarcaComponent],
  templateUrl: './minhas-demandas.component.html',
  styleUrl: './minhas-demandas.component.scss',
})
export class MinhasDemandasComponent implements OnInit {
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly sessao = inject(UsuarioSessaoService);

  readonly escolhida = output<number>();
  /** Depois da primeira carga: a demanda em que há execução rodando, para a página abri-la por padrão. */
  readonly emExecucaoEncontrada = output<number>();

  readonly itens = signal<DemandaExecutadaResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);

  private avisouExecucao = false;

  /** O menu do botão direito da demanda sob o cursor. */
  readonly itensMenu = signal<MenuItem[]>([]);

  readonly rotuloDesenvolvidas = rotuloDesenvolvidas;
  readonly percentualDesenvolvidas = percentualDesenvolvidas;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.demandaService.listarExecutadas(QUANTIDADE_DE_DEMANDAS).subscribe({
      next: (resposta) => {
        const itens = resposta.dados ?? [];
        this.itens.set(itens);
        this.carregando.set(false);
        const rodando = itens.find((item) => item.executando);
        if (rodando && !this.avisouExecucao) {
          this.avisouExecucao = true;
          this.emExecucaoEncontrada.emit(rodando.demandaId);
        }
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  /** Abre o menu da demanda: trocar o status e, para o desenvolvedor (gestor não é membro), sair dela. */
  abrirMenu(evento: MouseEvent, menu: ContextMenu, demanda: DemandaExecutadaResumoDto): void {
    evento.preventDefault();
    const itens: MenuItem[] = [
      {
        label: 'Alterar status',
        icon: 'pi pi-circle',
        items: OPCOES_STATUS_DEMANDA.map((opcao) => ({
          label: opcao.rotulo,
          icon: opcao.status === demanda.status ? 'pi pi-check' : 'pi pi-circle-fill',
          style: { '--p-menuitem-icon-color': opcao.cor },
          disabled: opcao.status === demanda.status,
          command: () => this.alterarStatus(demanda, opcao.status),
        })),
      },
    ];
    if (!this.sessao.eGestor()) {
      itens.push({ separator: true }, { label: 'Sair da demanda', icon: 'pi pi-sign-out', command: () => this.sair(demanda) });
    }
    this.itensMenu.set(itens);
    menu.show(evento);
  }

  /** Troca o status (otimista, com rollback); concluída ou cancelada sai da lista, que só traz as em aberto. */
  alterarStatus(demanda: DemandaExecutadaResumoDto, status: TipoDemandaStatusEnum): void {
    const anteriores = this.itens();
    const encerrada = status === TipoDemandaStatusEnum.CONCLUIDA || status === TipoDemandaStatusEnum.CANCELADA;
    this.itens.set(encerrada ? anteriores.filter((item) => item.demandaId !== demanda.demandaId) : anteriores.map((item) => (item.demandaId === demanda.demandaId ? { ...item, status } : item)));
    this.demandaService.alterar(demanda.demandaId, { status }).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' }),
      error: () => this.itens.set(anteriores),
    });
  }

  /** Sai da demanda (o desenvolvedor remove a si mesmo): some da lista na hora, com "Desfazer" no toast. */
  sair(demanda: DemandaExecutadaResumoDto): void {
    const usuarioId = this.sessao.id();
    if (usuarioId === undefined) return;
    const anteriores = this.itens();
    this.itens.set(anteriores.filter((item) => item.demandaId !== demanda.demandaId));
    this.demandaService.removerMembro(demanda.demandaId, usuarioId).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `Você saiu de "${demanda.nome}"`,
          desfazer: () => this.demandaService.atribuirMembro(demanda.demandaId, { usuarioId }),
          aposDesfazer: () => this.carregar(),
        }),
      error: () => this.itens.set(anteriores),
    });
  }
}
