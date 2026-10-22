import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { rotuloTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { filtrarPessoasPorNome } from '../../utils/mensagem-direta.util';
import { MensagemDiretaAvatarComponent } from '../mensagem-direta-avatar/mensagem-direta-avatar.component';

/** Escolher com quem conversar: todas as pessoas ativas, com a presença. A lista vem de `GET /mensagem-direta/pessoas` (qualquer usuário). */
@Component({
  selector: 'app-mensagem-direta-nova',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, TooltipModule, MensagemDiretaAvatarComponent],
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

  protected voltar(): void {
    this.estado.visao.set('LISTA');
  }

  protected escolher(usuarioId: number, nome: string): void {
    void this.estado.abrirConversa(usuarioId, nome);
  }
}
