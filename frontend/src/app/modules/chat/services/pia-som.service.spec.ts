import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DURACAO_DO_SOM_DA_PIA, PiaSomService } from './pia-som.service';

/** Um AudioContext de mentira que só conta o que foi ligado e tocado. */
class ContextoFalso {
    static osciladores = 0;
    static fontes = 0;
    readonly currentTime = 0;
    readonly sampleRate = 8000;
    readonly destination = {};
    state = 'running';
    private no() {
        return { connect: (destino: unknown) => destino ?? {}, gain: this.parametro(), frequency: this.parametro(), Q: this.parametro(), type: '' };
    }
    private parametro() {
        return { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    }
    createGain() {
        return this.no();
    }
    createBiquadFilter() {
        return this.no();
    }
    createOscillator() {
        ContextoFalso.osciladores++;
        return { ...this.no(), start: vi.fn(), stop: vi.fn() };
    }
    createBuffer(_canais: number, amostras: number) {
        return { getChannelData: () => new Float32Array(amostras) };
    }
    createBufferSource() {
        ContextoFalso.fontes++;
        return { ...this.no(), buffer: null, start: vi.fn() };
    }
    resume() {
        return Promise.resolve();
    }
}

describe('PiaSomService', () => {
    const original = window.AudioContext;
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        ContextoFalso.osciladores = 0;
        ContextoFalso.fontes = 0;
    });
    afterEach(() => {
        vi.useRealTimers();
        (window as unknown as { AudioContext: unknown }).AudioContext = original;
    });

    it('toca as três partes (quatro vozes) e os dois sopros, e devolve a duração', () => {
        (window as unknown as { AudioContext: unknown }).AudioContext = ContextoFalso;
        const duracao = new PiaSomService().tocar();
        expect(duracao).toBe(Math.round(DURACAO_DO_SOM_DA_PIA * 1000));
        expect(ContextoFalso.osciladores).toBe(4);
        expect(ContextoFalso.fontes).toBe(2);
    });

    it('um por vez: enquanto toca, outro pedido é ignorado; depois volta a tocar', () => {
        (window as unknown as { AudioContext: unknown }).AudioContext = ContextoFalso;
        const som = new PiaSomService();
        const duracao = som.tocar();
        expect(som.tocar()).toBe(0);
        vi.advanceTimersByTime(duracao);
        expect(som.tocar()).toBe(duracao);
        expect(ContextoFalso.osciladores).toBe(8);
    });

    it('sem áudio no navegador não faz nada', () => {
        (window as unknown as { AudioContext: unknown }).AudioContext = undefined;
        expect(new PiaSomService().tocar()).toBe(0);
    });
});
