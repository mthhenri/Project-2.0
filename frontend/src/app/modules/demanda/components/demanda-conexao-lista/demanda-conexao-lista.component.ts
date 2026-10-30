import { Component, ElementRef, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaConexaoResumoDto } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DesfazerService } from '../../../../core/services/desfazer.service';

interface DestinoConexao {
  demandaConectadaId: number;
  nomeDemandaConectada: string;
}

const GRUPOS_DE_DIRECAO: { direcao: DemandaConexaoResumoDto['direcao']; titulo: string; icone: string }[] = [
  { direcao: 'saida', titulo: 'Esta demanda depende de', icone: 'pi-arrow-right' },
  { direcao: 'entrada', titulo: 'Dependem desta demanda', icone: 'pi-arrow-left' },
  { direcao: 'bidirecional', titulo: 'Dependência mútua', icone: 'pi-arrows-h' },
];

/**
 * Conexões da demanda (task 108): criação inline (autocomplete com busca + direção + "Adicionar"), erro de
 * ciclo mostrado na própria linha, tooltip semântico da direção, link que navega dentro do detalhe e lixeira
 * com "Desfazer". O estado das conexões vive no dialog (cache de navegação) via `model`.
 */
@Component({
  selector: 'app-demanda-conexao-lista',
  standalone: true,
  imports: [FormsModule, ButtonModule, Select, SelectButtonModule, TooltipModule],
  templateUrl: './demanda-conexao-lista.component.html',
  styleUrl: './demanda-conexao-lista.component.scss',
})
export class DemandaConexaoListaComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly sessao = inject(UsuarioSessaoService);

  readonly demandaId = input.required<number>();
  readonly nomeDemanda = input<string>('');
  /** Demandas do projeto que podem ser conectadas (já sem a atual). */
  readonly todasDemandas = input<DestinoConexao[]>([]);
  readonly conexoes = model<DemandaConexaoResumoDto[]>([]);
  /** O link de uma conexão navega para a demanda conectada dentro do próprio dialog. */
  readonly demandaAbrir = output<number>();

  readonly opcoesDirecao = [
    { rotulo: '→ Depende de', valor: false },
    { rotulo: '↔ Bidirecional', valor: true },
  ];

  readonly destinoId = signal<number | null>(null);
  readonly ehBidirecional = signal<boolean>(false);
  readonly salvando = signal<boolean>(false);
  readonly erroInline = signal<string | null>(null);

  /** Candidatos: as demandas do projeto que ainda não estão conectadas a esta. */
  readonly candidatos = computed(() => {
    const conectadas = new Set(this.conexoes().map((conexao) => conexao.demandaConectadaId));
    return this.todasDemandas().filter((demanda) => !conectadas.has(demanda.demandaConectadaId));
  });

  /** As conexões agrupadas pelo que significam (o rótulo diz o sentido, sem depender de ícone nem de tooltip). Grupo vazio não aparece. */
  readonly grupos = computed(() =>
    GRUPOS_DE_DIRECAO.map((grupo) => ({ ...grupo, itens: this.conexoes().filter((conexao) => conexao.direcao === grupo.direcao) })).filter((grupo) => grupo.itens.length > 0),
  );

  tooltipDirecao(conexao: DemandaConexaoResumoDto): string {
    const outra = `"${conexao.nomeDemandaConectada}"`;
    switch (conexao.direcao) {
      case 'saida':
        return `Esta demanda depende de ${outra}`;
      case 'entrada':
        return `${outra} depende desta demanda`;
      default:
        return `Dependência mútua com ${outra}`;
    }
  }

  /** Escolhido o destino, o foco vai ao "Adicionar": Enter confirma (a lista de opções consome o Enter dela). */
  aoEscolherDestino(id: number | null): void {
    this.destinoId.set(id);
    this.erroInline.set(null);
    if (id) {
      setTimeout(() => this.elemento.nativeElement.querySelector<HTMLButtonElement>('.demanda-conexao-lista__adicionar button')?.focus());
    }
  }

  adicionar(): void {
    const destino = this.destinoId();
    if (!destino || this.salvando()) return;

    this.salvando.set(true);
    this.erroInline.set(null);
    this.demandaService
      .criarConexao(this.demandaId(), { demandaDestinoId: destino, ehBidirecional: this.ehBidirecional() }, true)
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.destinoId.set(null);
          this.ehBidirecional.set(false);
          this.recarregar();
        },
        error: (erro: HttpErrorResponse) => {
          this.salvando.set(false);
          this.erroInline.set(erro.error?.mensagem ?? 'Não foi possível criar a conexão.');
        },
      });
  }

  /** Remoção imediata: a conexão sai na hora e o toast oferece "Desfazer" (re-POST no sentido original). */
  excluir(conexao: DemandaConexaoResumoDto): void {
    const anteriores = this.conexoes();
    this.conexoes.set(anteriores.filter((item) => item.id !== conexao.id));

    this.demandaService.excluirConexao(this.demandaId(), conexao.id).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `Conexão com "${conexao.nomeDemandaConectada}" removida`,
          desfazer: () => this.recriarConexao(conexao),
          aposDesfazer: () => this.recarregar(),
        }),
      error: () => this.conexoes.set(anteriores),
    });
  }

  private recriarConexao(conexao: DemandaConexaoResumoDto) {
    if (conexao.direcao === 'entrada') {
      return this.demandaService.criarConexao(conexao.demandaConectadaId, {
        demandaDestinoId: this.demandaId(),
        ehBidirecional: false,
      });
    }
    return this.demandaService.criarConexao(this.demandaId(), {
      demandaDestinoId: conexao.demandaConectadaId,
      ehBidirecional: conexao.direcao === 'bidirecional',
    });
  }

  private recarregar(): void {
    this.demandaService.listarConexoes(this.demandaId()).subscribe((resposta) => {
      if (resposta.sucesso && resposta.dados) this.conexoes.set(resposta.dados);
    });
  }
}
