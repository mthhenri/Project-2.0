import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { rotuloTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { coresDosMembros, filtrarGruposPorNome, rotuloDosMembros } from '../../utils/grupo.util';
import { filtrarPessoasPorNome } from '../../utils/mensagem-direta.util';
import { AvatarGrupoComponent } from '../../../../shared/components/avatar-grupo/avatar-grupo.component';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';

/**
 * Escolher com quem conversar: os grupos de que o usuário é membro e todas as pessoas ativas, com a presença. As pessoas vêm de `GET /mensagem-direta/pessoas`
 * (qualquer usuário). É também o seletor "Para" do atalho do Project Desktop (task 213): escolher um grupo leva o código copiado para ele (task 247).
 */
@Component({
    selector: 'app-mensagem-direta-nova',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, TooltipModule, AvatarGrupoComponent, AvatarUsuarioComponent],
    templateUrl: './mensagem-direta-nova.component.html',
    styleUrl: './mensagem-direta-nova.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaNovaComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);

    readonly controleBusca = new FormControl('', { nonNullable: true });
    private readonly texto = toSignal(this.controleBusca.valueChanges, { initialValue: '' });
    protected readonly rotuloTipo = rotuloTipoUsuario;

    protected readonly pessoas = computed(() => filtrarPessoasPorNome(this.estado.pessoas() ?? [], this.texto()));
    protected readonly grupos = computed(() => filtrarGruposPorNome(this.estado.grupoEstado.grupos(), this.texto()));
    protected readonly coresDosMembros = coresDosMembros;
    protected readonly rotuloDosMembros = rotuloDosMembros;

    protected voltar(): void {
        this.estado.visao.set('LISTA');
    }

    protected escolher(usuarioId: number, nome: string): void {
        void this.estado.abrirConversa(usuarioId, nome);
    }

    protected escolherGrupo(grupoId: number): void {
        void this.estado.abrirGrupo(grupoId);
    }

    protected novoGrupo(): void {
        this.estado.novoGrupo();
    }
}
