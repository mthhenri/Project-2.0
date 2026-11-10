import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';
import { UsuarioCorSeletorComponent } from '../usuario-cor-seletor/usuario-cor-seletor.component';

/**
 * A pessoa escolhendo a cor da própria bolinha (task 316), aberto pelo "Editar cor" do perfil. À direita do seletor, prévias dos lugares
 * onde a bolinha aparece (no chat e no resto do sistema), com a cor em escolha, para ver o resultado antes de salvar.
 */
@Component({
    selector: 'app-usuario-cor-dialog',
    standalone: true,
    imports: [DialogFormularioDirective, DialogDicaAtalhosComponent, ButtonModule, DialogModule, AvatarUsuarioComponent, UsuarioCorSeletorComponent],
    templateUrl: './usuario-cor-dialog.component.html',
    styleUrl: './usuario-cor-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioCorDialogComponent {
    private readonly usuarioService = inject(UsuarioService);
    readonly sessao = inject(UsuarioSessaoService);
    private readonly messageService = inject(MessageService);

    readonly mostrarDialog = signal(false);
    readonly carregando = signal(false);
    /** A cor em escolha (`#RRGGBB`); só vale depois de "Salvar". `null` = cor padrão do tema. */
    readonly cor = signal<string | null>(null);
    readonly nome = computed(() => this.sessao.nomeCompleto() ?? '');
    readonly primeiroNome = computed(() => this.nome().split(' ')[0]);
    readonly login = computed(() => this.sessao.login() ?? '');

    /** Abre com a cor atual da pessoa já no seletor. */
    abrir(): void {
        this.cor.set(this.sessao.corAvatar());
        this.mostrarDialog.set(true);
    }

    salvar(): void {
        if (this.carregando()) return;
        this.carregando.set(true);
        this.usuarioService
            .alterarCor({ corAvatar: this.cor() })
            .pipe(finalize(() => this.carregando.set(false)))
            .subscribe({
                next: (resposta) => {
                    if (!resposta.sucesso || !resposta.dados) return;
                    this.sessao.definirCorAvatar(resposta.dados.corAvatar);
                    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Cor da bolinha alterada' });
                    this.mostrarDialog.set(false);
                },
            });
    }
}
