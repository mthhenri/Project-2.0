import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { LogoPiaComponent } from './logo-pia.component';

describe('LogoPiaComponent', () => {
    it('sem rótulo é decorativa', async () => {
        const tela = await montarComponente(LogoPiaComponent);
        expect(tela.elemento.getAttribute('aria-hidden')).toBe('true');
        expect(tela.elemento.getAttribute('role')).toBeNull();
    });

    it('com rótulo vira imagem acessível', async () => {
        const tela = await montarComponente(LogoPiaComponent, { entradas: { rotulo: 'Piá' } });
        expect(tela.elemento.getAttribute('role')).toBe('img');
        expect(tela.elemento.getAttribute('aria-label')).toBe('Piá');
        expect(tela.elemento.getAttribute('aria-hidden')).toBeNull();
    });

    it('tem uma altura padrão para usar solta', async () => {
        const tela = await montarComponente(LogoPiaComponent);
        expect(tela.elemento.style.getPropertyValue('--logo-tamanho')).toBe('1.25rem');
    });

    it('o tamanho vira a variável da altura', async () => {
        const tela = await montarComponente(LogoPiaComponent, { entradas: { tamanho: '52%' } });
        expect(tela.elemento.style.getPropertyValue('--logo-tamanho')).toBe('52%');
    });
});
