import { Component, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { CampoDescricaoDemanda, DemandaMenuAcoes } from '../../utils/demanda-context-menu.factory';
import { DemandaPastaLinhaComponent } from '../demanda-pasta-linha/demanda-pasta-linha.component';

/**
 * A coluna do meio da Árvore (task 239): as demandas que estão direto na pasta escolhida (ou os resultados da busca, de todas as pastas), com
 * "Demanda aqui" no topo para o gestor. Estados vazio (pasta sem demandas) e sem resultado (filtro que esconde tudo).
 */
@Component({
  selector: 'app-demanda-pasta-lista',
  standalone: true,
  imports: [ButtonModule, TooltipModule, DemandaPastaLinhaComponent],
  templateUrl: './demanda-pasta-lista.component.html',
  styleUrl: './demanda-pasta-lista.component.scss',
})
export class DemandaPastaListaComponent {
  readonly sessao = inject(UsuarioSessaoService);

  readonly titulo = input.required<string>();
  /** O caminho até a pasta, em texto ("Autenticação › Sessão"). */
  readonly caminho = input<string>('');
  readonly itens = input.required<DemandaGrafoNoDto[]>();
  readonly selecionadaId = input<number | null>(null);
  readonly termo = input<string>('');
  /** Na busca a lista traz resultados de várias pastas; o nome de cada uma aparece na linha. */
  readonly nomesDasPastas = input<ReadonlyMap<number, string> | null>(null);
  /** No "Projeto inteiro": o caminho de cada demanda (por id), mostrado acima do nome. */
  readonly caminhosDasDemandas = input<ReadonlyMap<number, string> | null>(null);
  /** O filtro de status ou tags (ou a busca) está escondendo demandas da pasta. */
  readonly filtroAtivo = input<boolean>(false);
  readonly acoes = input.required<DemandaMenuAcoes>();
  /** O id da demanda que é a própria pasta, para "Abrir pasta"; `null` em "Sem pasta" e na busca. */
  readonly pastaDemandaId = input<number | null>(null);
  /** "Demanda aqui" só vale numa pasta: na busca, que mistura várias, some. */
  readonly permitirDemandaAqui = input<boolean>(true);

  readonly demandaEscolhida = output<number>();
  readonly descricaoSolicitada = output<{ id: number; campo: CampoDescricaoDemanda }>();
  readonly statusEscolhido = output<{ demandaId: number; de: TipoDemandaStatusEnum; para: TipoDemandaStatusEnum }>();
  readonly demandaAquiSolicitada = output<void>();
  readonly abrirPastaSolicitada = output<number>();
  readonly filtrosLimpos = output<void>();

  caminhoDe(no: DemandaGrafoNoDto): string {
    return this.caminhosDasDemandas()?.get(no.id) ?? '';
  }

  nomeDaPastaDe(no: DemandaGrafoNoDto): string {
    const nomes = this.nomesDasPastas();
    if (!nomes) return '';
    return no.demandaPaiId !== null && no.demandaPaiId !== undefined ? (nomes.get(no.demandaPaiId) ?? '') : 'Sem pasta';
  }
}
