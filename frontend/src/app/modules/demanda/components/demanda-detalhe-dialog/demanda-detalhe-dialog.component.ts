import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DemandaArvoreItemComponent } from '../demanda-arvore-item/demanda-arvore-item.component';
import { DemandaStatusComponent } from '../demanda-status/demanda-status.component';
import { DemandaTagsCabecalhoComponent } from '../demanda-tags-cabecalho/demanda-tags-cabecalho.component';
import { DemandaMembrosCabecalhoComponent } from '../demanda-membros-cabecalho/demanda-membros-cabecalho.component';
import { DemandaMetricasComponent } from '../demanda-metricas/demanda-metricas.component';
import { DemandaConexaoListaComponent } from '../demanda-conexao-lista/demanda-conexao-lista.component';
import { DemandaFormularioDialogComponent } from '../demanda-formulario-dialog/demanda-formulario-dialog.component';
import { AtividadeNovaDialogComponent } from '../../../atividade/components/atividade-nova-dialog/atividade-nova-dialog.component';
import { DemandaAtividadesPainelComponent } from '../demanda-atividades-painel/demanda-atividades-painel.component';
import { DemandaDescricaoDialogComponent } from '../demanda-descricao-dialog/demanda-descricao-dialog.component';
import { DemandaDetalheBase } from './demanda-detalhe.base';

@Component({
  selector: 'app-demanda-detalhe-dialog',
  standalone: true,
  imports: [
    DemandaAtividadesPainelComponent,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    TabsModule,
    TooltipModule,
    ConfirmDialogModule,
    DemandaArvoreItemComponent,
    DemandaConexaoListaComponent,
    DemandaStatusComponent,
    DemandaTagsCabecalhoComponent,
    DemandaMembrosCabecalhoComponent,
    DemandaMetricasComponent,
    DemandaFormularioDialogComponent,
    DemandaDescricaoDialogComponent,
    AtividadeNovaDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './demanda-detalhe-dialog.component.html',
  styleUrl: './demanda-detalhe-dialog.component.scss',
})
/**
 * O detalhe da demanda em diálogo (usado pela árvore do detalhe do projeto). Toda a lógica está na `DemandaDetalheBase`, compartilhada com a
 * demanda aberta da Árvore (task 239); aqui ficam só o abrir e fechar do diálogo e as sub-demandas, que a demanda aberta não tem.
 */
export class DemandaDetalheDialogComponent extends DemandaDetalheBase implements OnChanges {
  @Input() visivel = false;
  @Output() visivelChange = new EventEmitter<boolean>();

  readonly mostrarDialogNovaSubDemanda = signal<boolean>(false);
  readonly mostrarDialogSubEdicao = signal<boolean>(false);
  readonly demandaIdSubEdicao = signal<number>(0);
  readonly mostrarDialogNovaFilha = signal<boolean>(false);
  readonly demandaPaiIdNovaFilha = signal<number>(0);

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['visivel']?.currentValue === true) {
      this.historico.set([]);
      this.demandaIdAtual.set(this.demandaId);
      this.carregarTudo(this.demandaId);
    } else if (mudancas['demandaId'] && !mudancas['demandaId'].firstChange && this.visivel) {
      this.historico.set([]);
      this.demandaIdAtual.set(this.demandaId);
      this.carregarTudo(this.demandaId);
    }
  }

  fechar(): void {
    this.visivelChange.emit(false);
  }

  aoDemandaCriada(): void {
    this.recarregarSubDemandas();
  }

  abrirSubEdicao(demandaId: number): void {
    this.demandaIdSubEdicao.set(demandaId);
    this.mostrarDialogSubEdicao.set(true);
  }

  abrirNovaFilha(demandaPaiId: number): void {
    this.demandaPaiIdNovaFilha.set(demandaPaiId);
    this.mostrarDialogNovaFilha.set(true);
  }

  protected override aoExcluida(): void {
    this.visivelChange.emit(false);
  }

  protected override aoRecarregar(): void {
    this.mostrarDialogNovaSubDemanda.set(false);
  }
}
