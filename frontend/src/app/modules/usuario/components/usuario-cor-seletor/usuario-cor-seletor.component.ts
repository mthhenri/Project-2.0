import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SeletorCorComponent } from '../../../../shared/components/seletor-cor/seletor-cor.component';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';

/**
 * Escolher a cor da bolinha de uma pessoa (task 316): a prévia com as iniciais, o seletor livre de cor e "Voltar à cor padrão". Serve ao próprio perfil
 * (o diálogo "Editar cor" do perfil) e à edição de usuário pelo gestor (a cor segue o formulário).
 */
@Component({
    selector: 'app-usuario-cor-seletor',
    standalone: true,
    imports: [FormsModule, SeletorCorComponent, AvatarUsuarioComponent],
    templateUrl: './usuario-cor-seletor.component.html',
    styleUrl: './usuario-cor-seletor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioCorSeletorComponent {
    /** O nome de quem tem a bolinha: dele saem as iniciais da prévia. */
    readonly nome = input.required<string>();
    /** A cor escolhida (`#RRGGBB`); `null` = cor padrão do tema. */
    readonly cor = model<string | null>(null);

    /** A paleta das tags devolve `#rrggbb` minúsculo; a cor do usuário é sempre `#RRGGBB` maiúsculo. */
    protected aoEscolher(valor: string | null): void {
        if (typeof valor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(valor)) return;
        this.cor.set(valor.toUpperCase());
    }

    protected voltarAoPadrao(): void {
        this.cor.set(null);
    }
}
