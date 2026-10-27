import { Component, computed, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaDocumentacaoResumoDto } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { PadPainelComponent } from '../../../usuario/components/pad-painel/pad-painel.component';
import { PadService } from '../../../usuario/services/pad.service';
import { DocumentacaoDemandaComponent } from '../../components/documentacao-demanda/documentacao-demanda.component';
import { DocumentacaoSeletorComponent } from '../../components/documentacao-seletor/documentacao-seletor.component';
import { demandaEmExecucao, DIVISAO_DA_TELA, divisaoPeloPonteiro, limitarDivisao } from '../../utils/documentacao-arvore.util';

/**
 * A tela de Documentações (task 259): a demanda em que a pessoa está trabalhando à esquerda, para escrever os três textos, e o pad dela à direita, os
 * dois à vista ao mesmo tempo. A demanda escolhida, a divisão entre os dois e o pad recolhido ficam guardados no navegador, por usuário. Análogos: o
 * documento do plano (edição), o seletor do chat (seletor) e o pad (painel).
 */
@Component({
  selector: 'app-documentacao',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, TooltipModule, DocumentacaoDemandaComponent, DocumentacaoSeletorComponent, PadPainelComponent],
  providers: [ConfirmationService],
  templateUrl: './documentacao.page.html',
  styleUrl: './documentacao.page.scss',
})
export class DocumentacaoPage {
  private readonly demandaService = inject(DemandaService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly pad = inject(PadService);
  private readonly confirmationService = inject(ConfirmationService);

  private readonly seletor = viewChild(DocumentacaoSeletorComponent);
  private readonly area = viewChild<ElementRef<HTMLElement>>('area');

  readonly limites = DIVISAO_DA_TELA;
  readonly demandas = signal<DemandaDocumentacaoResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly escolhidaId = signal<number | null>(null);
  /** Há texto da demanda mexido e ainda não gravado: trocar de demanda pede confirmação. */
  readonly sujo = signal(false);
  readonly padRecolhido = signal(this.lerGuardado('documentacao.pad.recolhido') === 'true');
  readonly divisao = signal(this.lerDivisao());
  readonly arrastando = signal(false);

  readonly escolhida = computed(() => this.demandas().find((demanda) => demanda.id === this.escolhidaId()) ?? null);

  constructor() {
    this.carregar();
    effect(() => {
      const usuarioId = this.sessao.id();
      if (usuarioId) untracked(() => this.pad.garantirCarregado(usuarioId, this.sessao.nomeCompleto() ?? ''));
    });
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.demandaService.listarParaDocumentacao().subscribe({
      next: (resposta) => {
        const demandas = resposta.dados ?? [];
        this.demandas.set(demandas);
        this.escolhidaId.set(this.demandaInicial(demandas));
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  /** A primeira visita abre a demanda em execução; depois, a guardada. Guardada que sumiu ou deixou de ser acessível volta ao "escolha uma". */
  private demandaInicial(demandas: DemandaDocumentacaoResumoDto[]): number | null {
    const guardada = this.lerGuardado(this.chaveDaDemanda());
    if (guardada === null) return demandaEmExecucao(demandas)?.id ?? null;
    const id = Number(guardada);
    if (demandas.some((demanda) => demanda.id === id)) return id;
    this.guardar(this.chaveDaDemanda(), null);
    return null;
  }

  /** Escolher outra demanda com texto sem gravar pede confirmação; a mesma demanda não faz nada. */
  escolher(demandaId: number): void {
    if (demandaId === this.escolhidaId()) return;
    if (!this.sujo()) {
      this.aplicarEscolha(demandaId);
      return;
    }
    this.confirmationService.confirm({
      header: 'Trocar de demanda',
      message: 'Há texto desta demanda que ainda não foi gravado. Trocar de demanda descarta essas alterações.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Descartar e trocar',
      rejectLabel: 'Continuar editando',
      accept: () => this.aplicarEscolha(demandaId),
    });
  }

  abrirSeletor(): void {
    this.seletor()?.abrir();
  }

  alternarPad(): void {
    this.padRecolhido.update((atual) => !atual);
    this.guardar('documentacao.pad.recolhido', String(this.padRecolhido()));
  }

  iniciarArrasto(evento: PointerEvent): void {
    evento.preventDefault();
    (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
    this.arrastando.set(true);
  }

  aoArrastar(evento: PointerEvent): void {
    if (!this.arrastando()) return;
    const area = this.area()?.nativeElement.getBoundingClientRect();
    if (!area) return;
    this.divisao.set(divisaoPeloPonteiro(evento.clientX, area.left, area.width));
  }

  finalizarArrasto(): void {
    if (!this.arrastando()) return;
    this.arrastando.set(false);
    this.guardarDivisao();
  }

  /** Setas ajustam o divisor pelo teclado: ← diminui a demanda, → aumenta. */
  aoTeclarNoDivisor(evento: KeyboardEvent): void {
    const passo = evento.key === 'ArrowRight' ? DIVISAO_DA_TELA.passoDoTeclado : evento.key === 'ArrowLeft' ? -DIVISAO_DA_TELA.passoDoTeclado : 0;
    if (passo === 0) return;
    evento.preventDefault();
    this.divisao.update((atual) => limitarDivisao(atual + passo));
    this.guardarDivisao();
  }

  /** Duplo clique no divisor: volta aos 56%. */
  restaurarDivisao(): void {
    this.divisao.set(DIVISAO_DA_TELA.padrao);
    this.guardarDivisao();
  }

  private aplicarEscolha(demandaId: number): void {
    this.sujo.set(false);
    this.escolhidaId.set(demandaId);
    this.guardar(this.chaveDaDemanda(), String(demandaId));
  }

  private chaveDaDemanda(): string {
    return `documentacao.demanda.${this.sessao.id() ?? 0}`;
  }

  private lerDivisao(): number {
    const guardada = this.lerGuardado('documentacao.divisao');
    return guardada === null ? DIVISAO_DA_TELA.padrao : limitarDivisao(Number(guardada));
  }

  private guardarDivisao(): void {
    this.guardar('documentacao.divisao', String(this.divisao()));
  }

  private lerGuardado(chave: string): string | null {
    try {
      return localStorage.getItem(chave);
    } catch {
      return null;
    }
  }

  private guardar(chave: string, valor: string | null): void {
    try {
      if (valor === null) localStorage.removeItem(chave);
      else localStorage.setItem(chave, valor);
    } catch {
      // Sem armazenamento (janela privada, dados bloqueados): a tela funciona, só não lembra.
    }
  }
}
