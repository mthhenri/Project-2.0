import { Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { UsuarioTiposTextosComponent } from '../usuario-tipos-textos/usuario-tipos-textos.component';

/** Dialog "Alterar textos dos tipos" da tela de Usuários (só administrador): hospeda a edição do texto de ajuda de cada tipo. */
@Component({
    selector: 'app-usuario-tipos-dialog',
    standalone: true,
    imports: [ButtonModule, DialogModule, UsuarioTiposTextosComponent],
    templateUrl: './usuario-tipos-dialog.component.html',
    styleUrl: './usuario-tipos-dialog.component.scss',
})
export class UsuarioTiposDialogComponent {
    readonly visivel = signal<boolean>(false);

    abrir(): void {
        this.visivel.set(true);
    }
}
