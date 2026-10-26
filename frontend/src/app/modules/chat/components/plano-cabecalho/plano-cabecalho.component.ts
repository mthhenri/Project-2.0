import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaResumoDto, PlanoRecuperadoDto, ProjetoResumoDto } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { ProjetoService } from '../../../projeto/services/projeto.service';

/**
 * Cabeçalho do plano (task 233): título editável, de que projeto é (ou "pessoal"), solo, a demanda ligada, arquivar e excluir.
 * Não grava nada: cada ação sai como evento e o documento (`app-plano-documento`) chama a API e atualiza o plano.
 * Análogo visual: o cabeçalho do detalhe da demanda e os chips da tela de Atividades.
 */
@Component({
  selector: 'app-plano-cabecalho',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, ConfirmPopupModule, InputTextModule, PopoverModule, SelectModule, TooltipModule],
  providers: [ConfirmationService],
  templateUrl: './plano-cabecalho.component.html',
  styleUrl: './plano-cabecalho.component.scss',
})
export class PlanoCabecalhoComponent {
  readonly plano = input.required<PlanoRecuperadoDto>();
  /** Uma ação do cabeçalho está em andamento (desabilita os botões). */
  readonly ocupado = input(false);

  readonly tituloAlterado = output<string>();
  readonly soloAlterado = output<boolean>();
  readonly projetoAtribuido = output<number>();
  readonly demandaLigada = output<number>();
  readonly arquivadoAlterado = output<boolean>();
  readonly excluido = output<void>();

  private readonly sessao = inject(UsuarioSessaoService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly projetoService = inject(ProjetoService);
  private readonly demandaService = inject(DemandaService);
  private readonly campoTitulo = viewChild<ElementRef<HTMLInputElement>>('campoTitulo');
  private readonly popoverProjeto = viewChild<Popover>('popoverProjeto');
  private readonly popoverDemanda = viewChild<Popover>('popoverDemanda');

  readonly editandoTitulo = signal(false);
  readonly controleTitulo = new FormControl<string>('', { nonNullable: true });
  readonly projetos = signal<ProjetoResumoDto[]>([]);
  readonly demandas = signal<DemandaResumoDto[]>([]);
  readonly carregandoOpcoes = signal(false);
  readonly controleProjeto = new FormControl<number | null>(null);
  readonly controleDemanda = new FormControl<number | null>(null);

  /** Só quem criou o plano o marca como solo e lhe atribui projeto. */
  readonly eCriador = computed(() => this.plano().criadorId === this.sessao.id());
  readonly ePessoal = computed(() => this.plano().projetoId === null);

  iniciarEdicaoDoTitulo(): void {
    this.controleTitulo.setValue(this.plano().titulo);
    this.editandoTitulo.set(true);
    setTimeout(() => {
      const campo = this.campoTitulo()?.nativeElement;
      campo?.focus();
      campo?.select();
    });
  }

  cancelarEdicaoDoTitulo(): void {
    this.editandoTitulo.set(false);
  }

  /** Enter ou perder o foco confirma; vazio ou igual ao atual só fecha o campo. */
  confirmarTitulo(): void {
    if (!this.editandoTitulo()) return;
    this.editandoTitulo.set(false);
    const digitado = this.controleTitulo.value.trim();
    if (digitado && digitado !== this.plano().titulo) this.tituloAlterado.emit(digitado);
  }

  abrirProjetos(evento: Event): void {
    this.controleProjeto.reset();
    this.popoverProjeto()?.toggle(evento);
    if (this.projetos().length > 0) return;
    this.carregandoOpcoes.set(true);
    this.projetoService.listar({ allRows: true }).subscribe({
      next: (resposta) => {
        this.projetos.set(resposta.dados?.itens ?? []);
        this.carregandoOpcoes.set(false);
      },
      error: () => this.carregandoOpcoes.set(false),
    });
  }

  atribuirProjeto(): void {
    const projetoId = this.controleProjeto.value;
    if (projetoId === null) return;
    this.popoverProjeto()?.hide();
    this.projetoAtribuido.emit(projetoId);
  }

  abrirDemandas(evento: Event): void {
    const projetoId = this.plano().projetoId;
    if (projetoId === null) return;
    this.controleDemanda.setValue(this.plano().demandaId);
    this.popoverDemanda()?.toggle(evento);
    this.carregandoOpcoes.set(true);
    this.demandaService.listar({ projetoId, pagina: 1, itensPorPagina: 200 }).subscribe({
      next: (resposta) => {
        this.demandas.set(resposta.dados?.itens ?? []);
        this.carregandoOpcoes.set(false);
      },
      error: () => this.carregandoOpcoes.set(false),
    });
  }

  ligarDemanda(): void {
    const demandaId = this.controleDemanda.value;
    if (demandaId === null || demandaId === this.plano().demandaId) return;
    this.popoverDemanda()?.hide();
    this.demandaLigada.emit(demandaId);
  }

  confirmarExclusao(evento: Event): void {
    this.confirmationService.confirm({
      target: evento.currentTarget ?? evento.target ?? undefined,
      message: `Excluir o plano "${this.plano().titulo}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      accept: () => this.excluido.emit(),
    });
  }
}
