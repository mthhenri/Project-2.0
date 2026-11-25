import { DestroyRef, Directive, HostListener, inject, signal } from '@angular/core';
import { PiaSomService } from '../services/pia-som.service';
import { registrarToque } from '../utils/toques-rapidos.util';

/**
 * Detalhe do avatar da Piá no chat da IA (task 491): tocar o avatar várias vezes seguidas (a regra está em
 * `registrarToque`) faz a Piá responder com um som curto e um leve balanço, pela classe global `app-pia-cantando`
 * enquanto o som dura. Nada é mostrado em texto.
 */
@Directive({
    selector: '[appAvatarDaPia]',
    standalone: true,
    host: { '[class.app-pia-cantando]': 'cantando()' },
})
export class AvatarDaPiaDirective {
    private readonly som = inject(PiaSomService);
    private toques: number[] = [];
    private espera: ReturnType<typeof setTimeout> | null = null;
    protected readonly cantando = signal(false);

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            if (this.espera) clearTimeout(this.espera);
        });
    }

    @HostListener('pointerup')
    aoTocar(): void {
        const resultado = registrarToque(this.toques, Date.now());
        this.toques = resultado.toques;
        if (!resultado.completou) return;
        const duracaoMs = this.som.tocar();
        if (duracaoMs > 0) this.balancar(duracaoMs);
    }

    /** O balanço enquanto o som dura; também chamado pela página quando o som parte de outro lugar (task 492). */
    balancar(duracaoMs: number): void {
        this.cantando.set(true);
        if (this.espera) clearTimeout(this.espera);
        this.espera = setTimeout(() => this.cantando.set(false), duracaoMs);
    }
}
