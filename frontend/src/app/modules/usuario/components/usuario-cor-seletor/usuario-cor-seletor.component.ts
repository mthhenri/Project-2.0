import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ColorPickerModule } from 'primeng/colorpicker';
import { MensagemDiretaAvatarComponent } from '../../../mensagem-direta/components/mensagem-direta-avatar/mensagem-direta-avatar.component';

/**
 * Escolher a cor da bolinha de uma pessoa (task 316): a prévia com as iniciais, o seletor livre de cor e "Voltar à cor padrão". Serve ao próprio perfil
 * (popover da barra de cima, com o botão "Aplicar") e à edição de usuário pelo gestor (a cor segue o formulário, sem botão próprio).
 */
@Component({
    selector: 'app-usuario-cor-seletor',
    standalone: true,
    imports: [FormsModule, ButtonModule, ColorPickerModule, MensagemDiretaAvatarComponent],
    templateUrl: './usuario-cor-seletor.component.html',
    styleUrl: './usuario-cor-seletor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioCorSeletorComponent {
    /** O nome de quem tem a bolinha: dele saem as iniciais da prévia. */
    readonly nome = input.required<string>();
    /** A cor escolhida (`#RRGGBB`); `null` = cor padrão do tema. */
    readonly cor = model<string | null>(null);
    /** Com texto, mostra o botão que confirma a escolha (o perfil); sem, a cor segue o formulário que contém o seletor (o gestor). */
    readonly rotuloAplicar = input<string | null>(null);
    readonly aplicando = input(false);
    readonly aplicada = output<void>();

    /** O seletor trabalha com hexadecimal sem `#`. */
    protected readonly valorDoSeletor = computed(() => this.cor()?.replace('#', '') ?? '');

    protected aoEscolher(valor: string | object): void {
        if (typeof valor !== 'string' || !/^[0-9A-Fa-f]{6}$/.test(valor)) return;
        this.cor.set(`#${valor.toUpperCase()}`);
    }

    protected voltarAoPadrao(): void {
        this.cor.set(null);
    }
}
