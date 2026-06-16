import { Component, Input } from '@angular/core';
import { Tag } from 'primeng/tag';
import { UsuarioResumoDto, UsuarioTipoEnum } from '@project20/shared';

@Component({
  selector: 'app-usuario-cartao',
  standalone: true,
  imports: [Tag],
  templateUrl: './usuario-cartao.component.html',
  styleUrl: './usuario-cartao.component.scss',
})
export class UsuarioCartaoComponent {
  @Input({ required: true }) usuario!: UsuarioResumoDto;

  get iniciais(): string {
    return (this.usuario?.nomeCompleto ?? '')
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  get ehGestor(): boolean {
    return this.usuario?.tipo === UsuarioTipoEnum.GESTOR;
  }
}
