import { Injectable, TemplateRef, signal } from '@angular/core';

/**
 * Ponto de extensão do lado esquerdo da barra superior (task 496): a página aberta registra um `TemplateRef` e a
 * `app-topbar` o desenha com `ngTemplateOutlet`. O template continua pertencendo à página (contexto, ligações e
 * eventos são dela); a página retira o que registrou ao ser destruída. Sem registro, a barra fica como sempre.
 */
@Injectable({ providedIn: 'root' })
export class TopbarConteudoService {
    private readonly _modelo = signal<TemplateRef<unknown> | null>(null);

    readonly modelo = this._modelo.asReadonly();

    exibir(modelo: TemplateRef<unknown>): void {
        this._modelo.set(modelo);
    }

    /** Só retira se o que está na barra ainda é o mesmo template: a página seguinte pode já ter registrado o dela. */
    retirar(modelo: TemplateRef<unknown>): void {
        if (this._modelo() === modelo) this._modelo.set(null);
    }
}
