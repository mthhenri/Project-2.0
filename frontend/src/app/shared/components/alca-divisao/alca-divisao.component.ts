import { Component, ElementRef, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { DIVISAO, larguraDaPrimeiraPeloPonteiro, larguraMaximaDaPrimeira, limitarLarguraDaPrimeira } from './alca-divisao.util';

/**
 * A alça entre duas colunas lado a lado (task 289), como a do drawer do pad e a do divisor de Documentações: arrastar ou as setas ajustam a
 * largura da primeira coluna, o duplo clique volta ao padrão, e a largura fica guardada no navegador sob `chave`. Fica **dentro** da área
 * (um `display: flex` com `gap: 1rem`), entre as duas colunas, e escreve a largura na propriedade `--largura-primeira` da própria área; quem
 * hospeda lê essa propriedade na primeira coluna (`flex-basis: var(--largura-primeira, ...)`). Enquanto arrasta, `--transicao-primeira`
 * vale `none` para a coluna acompanhar o ponteiro sem atraso.
 */
@Component({
  selector: 'app-alca-divisao',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './alca-divisao.component.html',
  styleUrl: './alca-divisao.component.scss',
})
export class AlcaDivisaoComponent implements OnInit, OnDestroy {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Onde a largura fica guardada no navegador (por usuário, escolhida por quem hospeda). */
  readonly chave = input.required<string>();
  readonly rotulo = input<string>('Largura da lista');
  readonly minima = input<number>(DIVISAO.minima);
  readonly minimaDoOutro = input<number>(DIVISAO.minimaDoOutro);

  readonly largura = signal<number>(DIVISAO.padrao);
  readonly arrastando = signal<boolean>(false);

  ngOnInit(): void {
    this.largura.set(this.lerGuardada());
    this.aplicar();
  }

  ngOnDestroy(): void {
    this.area()?.style.removeProperty('--largura-primeira');
    this.area()?.style.removeProperty('--transicao-primeira');
  }

  iniciarArrasto(evento: PointerEvent): void {
    evento.preventDefault();
    (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
    this.arrastando.set(true);
    this.area()?.style.setProperty('--transicao-primeira', 'none');
  }

  aoArrastar(evento: PointerEvent): void {
    const area = this.area()?.getBoundingClientRect();
    if (!this.arrastando() || !area) return;
    this.largura.set(larguraDaPrimeiraPeloPonteiro(evento.clientX, area.left, area.width, this.limites()));
    this.aplicar();
  }

  finalizarArrasto(): void {
    if (!this.arrastando()) return;
    this.arrastando.set(false);
    this.area()?.style.removeProperty('--transicao-primeira');
    this.guardar();
  }

  /** Setas ajustam pelo teclado: ← diminui a primeira coluna, → aumenta. */
  aoTeclar(evento: KeyboardEvent): void {
    const passo = evento.key === 'ArrowRight' ? DIVISAO.passoDoTeclado : evento.key === 'ArrowLeft' ? -DIVISAO.passoDoTeclado : 0;
    if (passo === 0) return;
    evento.preventDefault();
    this.largura.set(limitarLarguraDaPrimeira(this.largura() + passo, this.larguraDaArea(), this.limites()));
    this.aplicar();
    this.guardar();
  }

  restaurar(): void {
    this.largura.set(limitarLarguraDaPrimeira(DIVISAO.padrao, this.larguraDaArea(), this.limites()));
    this.aplicar();
    this.guardar();
  }

  maxima(): number {
    return larguraMaximaDaPrimeira(this.larguraDaArea(), this.limites());
  }

  private area(): HTMLElement | null {
    return this.elemento.nativeElement.parentElement;
  }

  private larguraDaArea(): number {
    return this.area()?.getBoundingClientRect().width ?? 0;
  }

  private limites() {
    return { minima: this.minima(), minimaDoOutro: this.minimaDoOutro() };
  }

  private aplicar(): void {
    this.area()?.style.setProperty('--largura-primeira', `${this.largura()}px`);
  }

  private lerGuardada(): number {
    try {
      const guardada = localStorage.getItem(this.chave());
      // Só o mínimo: a largura preferida não se perde porque a janela estava estreita; a coluna encolhe sozinha (flex-shrink) quando falta espaço.
      return limitarLarguraDaPrimeira(guardada === null ? DIVISAO.padrao : Number(guardada), 0, this.limites());
    } catch {
      return DIVISAO.padrao;
    }
  }

  private guardar(): void {
    try {
      localStorage.setItem(this.chave(), String(this.largura()));
    } catch {
      // Sem armazenamento (janela privada, dados bloqueados): a largura vale só até fechar a demanda.
    }
  }
}
