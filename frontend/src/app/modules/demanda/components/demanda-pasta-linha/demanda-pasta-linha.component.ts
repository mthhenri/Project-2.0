import { Component, OnChanges, SimpleChanges, inject, input, output } from '@angular/core';
import { ContextMenu } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { CampoDescricaoDemanda, DemandaMenuAcoes, construirMenuDemanda } from '../../utils/demanda-context-menu.factory';
import { dividirDestaque } from '../../utils/demanda-filtro.util';
import { DemandaBarraHorasComponent } from '../demanda-barra-horas/demanda-barra-horas.component';
import { DemandaStatusComponent } from '../demanda-status/demanda-status.component';

interface DescricaoDaLinha {
  campo: CampoDescricaoDemanda;
  rotulo: string;
  icone: string;
  tipo: 'tecnica' | 'cliente' | 'doc';
}

/**
 * A linha de uma demanda na lista da pasta (task 239): status em bolinha, nome, barra de horas ("2h de 6h") e tags debaixo do nome, e os ícones
 * das três descrições à direita. Sem membros e sem ações na linha: elas vão para a demanda aberta; o botão direito abre o menu de contexto de hoje.
 */
@Component({
  selector: 'app-demanda-pasta-linha',
  standalone: true,
  imports: [ContextMenu, TooltipModule, DemandaBarraHorasComponent, DemandaStatusComponent],
  templateUrl: './demanda-pasta-linha.component.html',
  styleUrl: './demanda-pasta-linha.component.scss',
})
export class DemandaPastaLinhaComponent implements OnChanges {
  private static menuAberto: ContextMenu | null = null;

  readonly sessao = inject(UsuarioSessaoService);

  readonly no = input.required<DemandaGrafoNoDto>();
  readonly selecionada = input<boolean>(false);
  /** Termo da busca, destacado no nome. */
  readonly termo = input<string>('');
  /** Na busca a lista mistura pastas: o nome da pasta de cada resultado aparece embaixo. */
  readonly nomeDaPasta = input<string>('');
  /** No "Projeto inteiro" o caminho até a demanda ("Suporte › GR Sisger") aparece acima do nome. */
  readonly caminho = input<string>('');
  readonly acoes = input.required<DemandaMenuAcoes>();

  readonly escolhida = output<void>();
  readonly statusEscolhido = output<{ demandaId: number; de: TipoDemandaStatusEnum; para: TipoDemandaStatusEnum }>();
  readonly descricaoSolicitada = output<CampoDescricaoDemanda>();

  itensMenu: MenuItem[] = [];

  readonly descricoes: DescricaoDaLinha[] = [
    { campo: 'descricaoTecnica', rotulo: 'Descrição técnica', icone: 'icone-descricao icone-descricao--tecnica', tipo: 'tecnica' },
    { campo: 'descricaoCliente', rotulo: 'Descrição do cliente', icone: 'pi pi-user', tipo: 'cliente' },
    { campo: 'documentacao', rotulo: 'Documentação', icone: 'icone-descricao icone-descricao--doc', tipo: 'doc' },
  ];

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['no'] || mudancas['acoes']) this.itensMenu = construirMenuDemanda(this.no(), this.acoes(), this.sessao.eGestor());
  }

  get nomeEmPartes(): { texto: string; destaque: boolean }[] {
    return dividirDestaque(this.no().nome, this.termo());
  }

  preenchida(campo: CampoDescricaoDemanda): boolean {
    const no = this.no();
    return campo === 'descricaoTecnica' ? no.temDescricaoTecnica : campo === 'descricaoCliente' ? no.temDescricaoCliente : no.temDocumentacao;
  }

  aoEscolherStatus(para: TipoDemandaStatusEnum): void {
    this.statusEscolhido.emit({ demandaId: this.no().id, de: this.no().status, para });
  }

  abrirDescricao(evento: Event, campo: CampoDescricaoDemanda): void {
    evento.stopPropagation();
    this.descricaoSolicitada.emit(campo);
  }

  /** Abre o menu desta demanda, fechando antes qualquer outro já aberto na lista. */
  abrirMenu(evento: MouseEvent, menu: ContextMenu): void {
    evento.preventDefault();
    const anterior = DemandaPastaLinhaComponent.menuAberto;
    if (anterior && anterior !== menu) anterior.hide();
    DemandaPastaLinhaComponent.menuAberto = menu;
    menu.show(evento);
  }

  aoFecharMenu(menu: ContextMenu): void {
    if (DemandaPastaLinhaComponent.menuAberto === menu) DemandaPastaLinhaComponent.menuAberto = null;
  }
}
