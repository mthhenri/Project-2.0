import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { LogoProjectComponent } from './logo-project.component';

describe('LogoProjectComponent', () => {
    it('sem rótulo é decorativo e não tem ladrilho', async () => {
        const tela = await montarComponente(LogoProjectComponent);
        expect(tela.elemento.getAttribute('aria-hidden')).toBe('true');
        expect(tela.elemento.getAttribute('role')).toBeNull();
        expect(tela.elemento.querySelector('.logo-project__ladrilho')).toBeNull();
        expect(tela.elemento.querySelectorAll('.logo-project__traco').length).toBe(2);
        expect(tela.elemento.querySelector('.logo-project__vivo')).not.toBeNull();
    });

    it('com rótulo vira imagem acessível', async () => {
        const tela = await montarComponente(LogoProjectComponent, { entradas: { rotulo: 'Project 2.0' } });
        expect(tela.elemento.getAttribute('role')).toBe('img');
        expect(tela.elemento.getAttribute('aria-label')).toBe('Project 2.0');
        expect(tela.elemento.getAttribute('aria-hidden')).toBeNull();
    });

    it('no ladrilho desenha o quadrado e reduz o símbolo', async () => {
        const tela = await montarComponente(LogoProjectComponent, { entradas: { ladrilho: true } });
        expect(tela.elemento.querySelector('.logo-project__ladrilho')).not.toBeNull();
        expect(tela.elemento.querySelector('.logo-project__simbolo--ladrilho')?.getAttribute('transform')).toContain('scale(0.66)');
    });

    it('o tamanho vira a variável do lado', async () => {
        const tela = await montarComponente(LogoProjectComponent, { entradas: { tamanho: '1.75rem' } });
        expect(tela.elemento.style.getPropertyValue('--logo-tamanho')).toBe('1.75rem');
    });
});
