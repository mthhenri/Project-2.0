import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '@angular/core';
import { montarComponente } from '../../../../testes/montar-componente';
import { PiaSomService } from '../services/pia-som.service';
import { AvatarDaPiaDirective } from './avatar-da-pia.directive';

@Component({
    selector: 'app-host-avatar-da-pia',
    imports: [AvatarDaPiaDirective],
    templateUrl: './avatar-da-pia.directive.spec.html',
    styleUrl: './avatar-da-pia.directive.spec.scss',
})
class HostAvatarDaPiaComponent {}

describe('AvatarDaPiaDirective', () => {
    const tocar = vi.fn(() => 800);
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
        tocar.mockClear();
    });
    afterEach(() => vi.useRealTimers());

    async function montar() {
        const tela = await montarComponente(HostAvatarDaPiaComponent, { provedores: [{ provide: PiaSomService, useValue: { tocar } }] });
        const avatar = tela.elemento.querySelector<HTMLElement>('.chat__avatar')!;
        const tocarAvatar = async (vezes: number, intervaloMs: number) => {
            for (let indice = 0; indice < vezes; indice++) {
                avatar.dispatchEvent(new Event('pointerup'));
                vi.advanceTimersByTime(intervaloMs);
            }
            tela.fixture.detectChanges();
        };
        return { tela, avatar, tocarAvatar };
    }

    it('cinco toques rápidos tocam o som e balançam o avatar enquanto ele dura', async () => {
        const { tela, avatar, tocarAvatar } = await montar();
        await tocarAvatar(5, 100);
        expect(tocar).toHaveBeenCalledTimes(1);
        expect(avatar.classList.contains('app-pia-cantando')).toBe(true);
        vi.advanceTimersByTime(800);
        tela.fixture.detectChanges();
        expect(avatar.classList.contains('app-pia-cantando')).toBe(false);
    });

    it('quatro toques, ou cinco devagar, não fazem nada', async () => {
        const { avatar, tocarAvatar } = await montar();
        await tocarAvatar(4, 100);
        vi.advanceTimersByTime(3000);
        await tocarAvatar(5, 600);
        expect(tocar).not.toHaveBeenCalled();
        expect(avatar.classList.contains('app-pia-cantando')).toBe(false);
    });

    it('sem áudio (o som devolve 0) o avatar não balança', async () => {
        tocar.mockReturnValueOnce(0);
        const { avatar, tocarAvatar } = await montar();
        await tocarAvatar(5, 100);
        expect(tocar).toHaveBeenCalledTimes(1);
        expect(avatar.classList.contains('app-pia-cantando')).toBe(false);
    });
});
