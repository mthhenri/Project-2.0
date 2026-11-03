import { Component, computed, input } from '@angular/core';
import { Tag } from 'primeng/tag';
import { DESCRICAO_TIPO_USUARIO, TipoUsuarioEnum } from '@project20/shared';
import { rotuloTipoUsuario, severidadeTipoUsuario } from '../../../../core/utils/tipo-usuario';

/**
 * O que um tipo de usuário é e o que ele pode e não pode fazer (task 306): a tag do tipo (a mesma cor da tabela), uma frase e as listas
 * "Pode" e "Não pode". O texto vem de `DESCRICAO_TIPO_USUARIO` (`shared`); aqui só se apresenta. Usado na ajuda da tela de Usuários
 * e no formulário de criar e editar.
 */
@Component({
    selector: 'app-usuario-tipo-descricao',
    standalone: true,
    imports: [Tag],
    templateUrl: './usuario-tipo-descricao.component.html',
    styleUrl: './usuario-tipo-descricao.component.scss',
})
export class UsuarioTipoDescricaoComponent {
    readonly tipo = input.required<TipoUsuarioEnum>();

    readonly descricao = computed(() => DESCRICAO_TIPO_USUARIO[this.tipo()]);
    readonly rotulo = computed(() => rotuloTipoUsuario(this.tipo()));
    readonly severidade = computed(() => severidadeTipoUsuario(this.tipo()));
}
