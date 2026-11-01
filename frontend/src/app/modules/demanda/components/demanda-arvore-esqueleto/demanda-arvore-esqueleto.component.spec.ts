import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { DemandaArvoreEsqueletoComponent } from './demanda-arvore-esqueleto.component';

// Esqueleto da Árvore (task 300): as três colunas da tela real, a faixa da barra de filtros e o aviso de carregamento.

describe('DemandaArvoreEsqueletoComponent', () => {
    it('anuncia "Carregando…" como status ocupado para leitores de tela', async () => {
        const montado = await montarComponente(DemandaArvoreEsqueletoComponent);
        const status = montado.elemento.querySelector('[role="status"]');
        expect(status?.getAttribute('aria-busy')).toBe('true');
        expect(status?.textContent).toContain('Carregando…');
    });

    it('desenha as três colunas: pastas, lista e demanda aberta', async () => {
        const montado = await montarComponente(DemandaArvoreEsqueletoComponent);
        expect(montado.elemento.querySelectorAll('.arvore-esqueleto__coluna').length).toBe(3);
        expect(montado.elemento.querySelectorAll('.arvore-esqueleto__demanda').length).toBeGreaterThan(0);
    });

    it('reserva a faixa da barra de filtros', async () => {
        const montado = await montarComponente(DemandaArvoreEsqueletoComponent);
        expect(montado.elemento.querySelector('.arvore-esqueleto__barra')).not.toBeNull();
    });

    it('dispensa a faixa da barra quando a página a desenha à parte', async () => {
        const montado = await montarComponente(DemandaArvoreEsqueletoComponent, { entradas: { comBarra: false } });
        expect(montado.elemento.querySelector('.arvore-esqueleto__barra')).toBeNull();
    });
});
