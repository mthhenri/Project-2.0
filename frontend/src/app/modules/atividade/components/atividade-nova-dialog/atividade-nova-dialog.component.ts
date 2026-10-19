import { Component, output, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { AtividadeFormularioComponent } from '../atividade-formulario/atividade-formulario.component';

/** Dialog de nova atividade: é o único ponto de criação de atividades (não há página) e hospeda o formulário com os botões do rodapé. */
@Component({
  selector: 'app-atividade-nova-dialog',
  standalone: true,
  imports: [ButtonModule, DialogModule, DialogFormularioDirective, DialogDicaAtalhosComponent, AtividadeFormularioComponent],
  templateUrl: './atividade-nova-dialog.component.html',
})
export class AtividadeNovaDialogComponent {
  /** Emite após cada atividade criada, para o chamador recarregar o que exibe. */
  readonly aoCriar = output<void>();

  readonly visivel = signal<boolean>(false);
  /** A demanda já escolhida ao abrir; o formulário é recriado a cada abertura (estado limpo, defaults de sempre). */
  readonly demandaIdInicial = signal<number | null>(null);

  private readonly formulario = viewChild(AtividadeFormularioComponent);

  /** `demandaId`: demanda já selecionada ao abrir (opcional). */
  abrir(demandaId: number | null = null): void {
    this.demandaIdInicial.set(demandaId);
    this.visivel.set(true);
  }

  salvando(): boolean {
    return this.formulario()?.salvando() ?? false;
  }

  /** `criarOutra`: mantém o dialog aberto (demanda, responsável, status e tags preservados) para cadastro em série. */
  salvar(criarOutra = false): void {
    this.formulario()?.salvar(criarOutra);
  }

  aoCriarAtividade(criarOutra: boolean): void {
    if (!criarOutra) this.visivel.set(false);
    this.aoCriar.emit();
  }
}
