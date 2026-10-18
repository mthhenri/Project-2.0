import { Component, OnInit, effect, inject, signal, untracked } from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { AtividadePrioridadeResumoDto } from '@project20/shared';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';

/**
 * Aba "Prioridades" das Configurações da IA (task 143, exclusiva de administrador): a cor de cada prioridade da atividade, com o selo
 * ao vivo. Nome e ordem são fixos; só a cor muda. Análogo visual: a aba Provedor e modelos (cartões com borda).
 */
@Component({
  selector: 'app-prioridades-aba',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, PrioridadeSeloComponent],
  templateUrl: './prioridades-aba.component.html',
  styleUrl: './prioridades-aba.component.scss',
})
export class PrioridadesAbaComponent implements OnInit {
  private readonly prioridadeService = inject(AtividadePrioridadeService);
  private readonly messageService = inject(MessageService);

  readonly prioridades = this.prioridadeService.prioridades;
  /** Um controle de cor por prioridade, na mesma ordem da lista. */
  readonly cores = new FormArray<FormControl<string>>([]);
  readonly salvando = signal<string | null>(null);
  readonly versaoDosControles = signal(0);

  constructor() {
    // Reconstrói os controles quando a lista chega (ou muda de tamanho); trocar a cor de uma só não recria nada.
    effect(() => {
      const lista = this.prioridades();
      untracked(() => {
        if (this.cores.length === lista.length && lista.length > 0) return;
        this.cores.clear();
        lista.forEach((item) => this.cores.push(this.novoControle(item.cor)));
        this.versaoDosControles.update((valor) => valor + 1);
      });
    });
  }

  ngOnInit(): void {
    this.prioridadeService.carregar();
  }

  mudou(indice: number): boolean {
    return this.cores.at(indice).value.toLowerCase() !== this.prioridades()[indice].cor.toLowerCase();
  }

  descartar(indice: number): void {
    this.cores.at(indice).setValue(this.prioridades()[indice].cor);
  }

  salvar(indice: number, prioridade: AtividadePrioridadeResumoDto): void {
    const controle = this.cores.at(indice);
    if (controle.invalid || !this.mudou(indice) || this.salvando()) return;
    this.salvando.set(prioridade.codigo);
    this.prioridadeService.alterarCor(prioridade.codigo, { cor: controle.value }).subscribe({
      next: () => {
        this.salvando.set(null);
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `Cor de "${prioridade.descricao}" alterada` });
      },
      error: () => this.salvando.set(null),
    });
  }

  private novoControle(cor: string): FormControl<string> {
    return new FormControl(cor, { nonNullable: true, validators: [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)] });
  }
}
