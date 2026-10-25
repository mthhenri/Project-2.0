import { NgTemplateOutlet } from '@angular/common';
import { Component, OnChanges, SimpleChanges, computed, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { ROTULO_STATUS_DEMANDA } from '../../constants/demanda-cores.constants';
import { AtividadeNovaDialogComponent } from '../../../atividade/components/atividade-nova-dialog/atividade-nova-dialog.component';
import { DemandaAtividadesPainelComponent } from '../demanda-atividades-painel/demanda-atividades-painel.component';
import { DemandaBarraHorasComponent } from '../demanda-barra-horas/demanda-barra-horas.component';
import { DemandaConexaoListaComponent } from '../demanda-conexao-lista/demanda-conexao-lista.component';
import { DemandaDescricaoDialogComponent } from '../demanda-descricao-dialog/demanda-descricao-dialog.component';
import { DemandaDetalheBase } from '../demanda-detalhe-dialog/demanda-detalhe.base';
import { DemandaFormularioDialogComponent } from '../demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaMembrosCabecalhoComponent } from '../demanda-membros-cabecalho/demanda-membros-cabecalho.component';
import { DemandaMetricasComponent } from '../demanda-metricas/demanda-metricas.component';
import { DemandaStatusComponent } from '../demanda-status/demanda-status.component';
import { DemandaTagsCabecalhoComponent } from '../demanda-tags-cabecalho/demanda-tags-cabecalho.component';

/** As abas da demanda aberta; as três primeiras são as descrições, com o ícone e a cor delas. */
export type AbaDemandaAberta = 'tecnica' | 'cliente' | 'doc' | 'atividades' | 'conexoes';

/**
 * A demanda aberta, a terceira coluna da Árvore (task 239): caminho, nome, status, barra de horas, membros com nome e tags, e as abas Técnica,
 * Cliente, Documentação, Atividades e Conexões, com o texto das descrições para leitura. Toda a lógica (carregar, título, status, tags, membros,
 * descrições, atividades, exclusão, histórico) é da `DemandaDetalheBase`, a mesma do diálogo de detalhe; aqui só muda o desenho.
 */
@Component({
  selector: 'app-demanda-aberta',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ButtonModule,
    ConfirmDialogModule,
    TabsModule,
    TooltipModule,
    MarkdownVisualizadorComponent,
    AtividadeNovaDialogComponent,
    DemandaAtividadesPainelComponent,
    DemandaBarraHorasComponent,
    DemandaConexaoListaComponent,
    DemandaDescricaoDialogComponent,
    DemandaFormularioDialogComponent,
    DemandaMembrosCabecalhoComponent,
    DemandaMetricasComponent,
    DemandaStatusComponent,
    DemandaTagsCabecalhoComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './demanda-aberta.component.html',
  styleUrl: './demanda-aberta.component.scss',
})
export class DemandaAbertaComponent extends DemandaDetalheBase implements OnChanges {
  /** Minutos executados na demanda (vêm do nó do grafo; a demanda recuperada não os traz), para a barra de horas. */
  readonly minutosExecutados = input<number>(0);
  /** A aba mostrada: a Técnica ao abrir; clicar num ícone de descrição da linha abre a aba dela. */
  readonly aba = model<AbaDemandaAberta>('tecnica');
  /** A demanda mostrada mudou por dentro (caminho, conexão, "Voltar"): a página acompanha a pasta e a seleção. */
  readonly navegou = output<number>();

  readonly rotuloStatus = ROTULO_STATUS_DEMANDA;

  /** A aba que vale: Atividades só para quem é membro (ou gestor); sem isso volta para a Técnica. */
  readonly abaAtiva = computed<AbaDemandaAberta>(() => (this.aba() === 'atividades' && !this.eMembro() ? 'tecnica' : this.aba()));

  readonly podeEditarDescricao = (campo: 'descricaoTecnica' | 'descricaoCliente' | 'documentacao'): boolean =>
    campo === 'descricaoCliente' ? this.sessao.eGestor() : this.eMembro();

  ngOnChanges(mudancas: SimpleChanges): void {
    const mudou = mudancas['demandaId'];
    if (!mudou || !this.demandaId || this.demandaId === this.demandaIdAtual()) return;
    this.historico.set([]);
    this.demandaIdAtual.set(this.demandaId);
    this.carregarTudo(this.demandaId);
  }

  /** Recarrega a demanda mostrada (mudou por fora: status trocado na lista, edição por diálogo). */
  atualizar(): void {
    const id = this.demandaIdAtual();
    if (id) this.carregarDemanda(id);
  }

  override navegarParaSubDemanda(id: number): void {
    if (id === this.demandaIdAtual()) return;
    super.navegarParaSubDemanda(id);
    this.navegou.emit(id);
  }

  override voltar(): void {
    super.voltar();
    this.navegou.emit(this.demandaIdAtual());
  }

  /** A aba da descrição que o ícone representa. */
  abaDaDescricao(campo: 'descricaoTecnica' | 'descricaoCliente' | 'documentacao'): AbaDemandaAberta {
    return campo === 'descricaoTecnica' ? 'tecnica' : campo === 'descricaoCliente' ? 'cliente' : 'doc';
  }

  /** O texto da descrição de uma aba, para leitura. */
  textoDaDescricao(campo: 'descricaoTecnica' | 'descricaoCliente' | 'documentacao'): string {
    return this.demanda()?.[campo] ?? '';
  }
}
