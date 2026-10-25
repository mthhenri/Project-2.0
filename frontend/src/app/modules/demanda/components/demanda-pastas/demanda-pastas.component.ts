import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { PastaId, PastaNo } from '../../utils/demanda-pasta.util';

interface LinhaDePasta {
  pasta: PastaNo;
  aberta: boolean;
}

/**
 * A coluna das pastas da Árvore (task 239): só as demandas de estrutura, em árvore, com "Sem pasta" no topo e a contagem das demandas diretas de
 * cada uma. Clicar escolhe a pasta. Teclado: ↑↓ percorrem e escolhem, → abre, ← fecha ou sobe.
 */
@Component({
  selector: 'app-demanda-pastas',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './demanda-pastas.component.html',
  styleUrl: './demanda-pastas.component.scss',
})
export class DemandaPastasComponent {
  readonly pastas = input.required<PastaNo[]>();
  readonly semPastaQuantidade = input<number>(0);
  /** A pasta escolhida; `undefined` quando nenhuma vale (a lista mostra resultados da busca). */
  readonly pastaId = input<PastaId | undefined>(null);
  readonly expandidas = input<ReadonlySet<number>>(new Set());

  readonly pastaEscolhida = output<PastaId>();
  readonly expansaoAlternada = output<number>();

  private readonly arvore = viewChild<ElementRef<HTMLElement>>('arvore');

  /** As pastas visíveis na ordem da tela (as filhas só com a mãe aberta). */
  readonly linhas = computed<LinhaDePasta[]>(() => {
    const abertas = this.expandidas();
    const resultado: LinhaDePasta[] = [];
    const percorrer = (pastas: PastaNo[]) => {
      for (const pasta of pastas) {
        const aberta = abertas.has(pasta.id);
        resultado.push({ pasta, aberta });
        if (aberta) percorrer(pasta.filhas);
      }
    };
    percorrer(this.pastas());
    return resultado;
  });

  focar(): void {
    this.arvore()?.nativeElement.focus();
  }

  alternar(evento: Event, id: number): void {
    evento.stopPropagation();
    this.expansaoAlternada.emit(id);
  }

  aoTeclar(evento: KeyboardEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.altKey || evento.shiftKey) return;
    // "Sem pasta" é a primeira linha (índice 0), seguida das pastas visíveis.
    const ids: PastaId[] = [null, ...this.linhas().map((linha) => linha.pasta.id)];
    const indice = Math.max(0, ids.indexOf(this.pastaId() ?? null));
    const atual = this.linhas().find((linha) => linha.pasta.id === this.pastaId());

    switch (evento.key) {
      case 'ArrowDown':
        this.pastaEscolhida.emit(ids[Math.min(indice + 1, ids.length - 1)]);
        break;
      case 'ArrowUp':
        this.pastaEscolhida.emit(ids[Math.max(indice - 1, 0)]);
        break;
      case 'ArrowRight':
        if (!atual || !atual.pasta.filhas.length) return;
        if (!atual.aberta) this.expansaoAlternada.emit(atual.pasta.id);
        else this.pastaEscolhida.emit(atual.pasta.filhas[0].id);
        break;
      case 'ArrowLeft':
        if (!atual) return;
        if (atual.aberta && atual.pasta.filhas.length) this.expansaoAlternada.emit(atual.pasta.id);
        else this.pastaEscolhida.emit(this.mae(atual.pasta.id));
        break;
      default:
        return;
    }
    evento.preventDefault();
  }

  /** A pasta mãe de uma pasta visível (a que vem antes dela e tem um nível a menos), ou "Sem pasta". */
  private mae(id: number): PastaId {
    const linhas = this.linhas();
    const indice = linhas.findIndex((linha) => linha.pasta.id === id);
    const nivel = linhas[indice]?.pasta.nivel ?? 0;
    for (let anterior = indice - 1; anterior >= 0; anterior--) {
      if (linhas[anterior].pasta.nivel < nivel) return linhas[anterior].pasta.id;
    }
    return id;
  }
}
