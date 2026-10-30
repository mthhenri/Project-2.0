import { Component, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ProjetoVolumeVigenciasComponent } from '../projeto-volume-vigencias/projeto-volume-vigencias.component';

/** "Configurar volume" do detalhe do projeto (task 271): só o volume esperado por vigência; o resto do projeto se edita no lugar. */
@Component({
  selector: 'app-projeto-volume-dialog',
  standalone: true,
  imports: [DialogModule, ProjetoVolumeVigenciasComponent],
  template: `
    <p-dialog header="Configurar volume" [(visible)]="mostrar" [modal]="true" [style]="{ width: '36rem' }" [draggable]="false">
      @if (projetoId(); as identificador) {
        @if (mostrar()) {
          <app-projeto-volume-vigencias [projetoId]="identificador" />
        }
      }
    </p-dialog>
  `,
})
export class ProjetoVolumeDialogComponent {
  readonly mostrar = signal<boolean>(false);
  readonly projetoId = signal<number | null>(null);

  abrir(projetoId: number): void {
    this.projetoId.set(projetoId);
    this.mostrar.set(true);
  }
}
