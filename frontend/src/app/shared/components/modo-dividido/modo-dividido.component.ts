import { Component, input } from '@angular/core';

/**
 * Modo Dividido (task 278): uma lista estreita à esquerda e, ao lado, o editor, sem véu nem janela sobreposta. É só o desenho da divisão:
 * a lista entra no slot `[lista]`, o editor é o conteúdo; quem usa decide o que cada lado mostra e guarda o estado.
 * Ocupa a altura do contêiner e cada lado rola sozinho.
 */
@Component({
  selector: 'app-modo-dividido',
  standalone: true,
  templateUrl: './modo-dividido.component.html',
  styleUrl: './modo-dividido.component.scss',
})
export class ModoDivididoComponent {
  /** O nome acessível da lista (leitor de tela), por exemplo "Demandas". */
  readonly rotuloLista = input<string>('Lista');
  /** O nome acessível do editor, por exemplo "Editor de descrição". */
  readonly rotuloEditor = input<string>('Editor');
}
