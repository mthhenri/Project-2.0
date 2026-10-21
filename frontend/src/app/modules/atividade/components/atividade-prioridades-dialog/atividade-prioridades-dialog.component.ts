import { Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PrioridadesCoresComponent } from '../prioridades-cores/prioridades-cores.component';

/** Dialog "Alterar prioridades" da listagem de atividades (só administrador): hospeda a edição da cor de cada prioridade. */
@Component({
  selector: 'app-atividade-prioridades-dialog',
  standalone: true,
  imports: [ButtonModule, DialogModule, PrioridadesCoresComponent],
  templateUrl: './atividade-prioridades-dialog.component.html',
})
export class AtividadePrioridadesDialogComponent {
  readonly visivel = signal<boolean>(false);

  abrir(): void {
    this.visivel.set(true);
  }
}
