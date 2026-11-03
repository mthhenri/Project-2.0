import { Component, computed, inject, input } from '@angular/core';
import { Tag } from 'primeng/tag';
import { TipoUsuarioEnum } from '@project20/shared';
import { rotuloTipoUsuario, severidadeTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { TipoUsuarioAjudaService } from '../../services/tipo-usuario-ajuda.service';
import { dividirTextoDaAjuda } from '../../utils/ajuda-do-tipo.util';

/**
 * O que um tipo de usuário é e o que ele pode e não pode fazer (task 306/308): a tag do tipo (a mesma cor da tabela) e o texto de ajuda, em
 * Markdown, com as linhas `✓` (verde) e `✕` (vermelho) pintadas aqui. O texto vem de `TipoUsuarioAjudaService` (o administrador o edita);
 * este componente só apresenta. Usado na ajuda da tela de Usuários e no formulário de criar e editar.
 */
@Component({
    selector: 'app-usuario-tipo-descricao',
    standalone: true,
    imports: [Tag, MarkdownVisualizadorComponent],
    templateUrl: './usuario-tipo-descricao.component.html',
    styleUrl: './usuario-tipo-descricao.component.scss',
})
export class UsuarioTipoDescricaoComponent {
    private readonly ajuda = inject(TipoUsuarioAjudaService);

    readonly tipo = input.required<TipoUsuarioEnum>();

    readonly trechos = computed(() => dividirTextoDaAjuda(this.ajuda.textos()[this.tipo()] ?? ''));
    readonly rotulo = computed(() => rotuloTipoUsuario(this.tipo()));
    readonly severidade = computed(() => severidadeTipoUsuario(this.tipo()));
}
