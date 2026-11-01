import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { DemandaControleHorasEsqueletoComponent } from './demanda-controle-horas-esqueleto.component';

// Esqueleto do Controle de horas (task 300): resumo, barra de ação, tabela em árvore e dois cartões.

describe('DemandaControleHorasEsqueletoComponent', () => {
    it('anuncia "Carregando…" como status ocupado para leitores de tela', async () => {
        const montado = await montarComponente(DemandaControleHorasEsqueletoComponent);
        const status = montado.elemento.querySelector('[role="status"]');
        expect(status?.getAttribute('aria-busy')).toBe('true');
        expect(status?.textContent).toContain('Carregando…');
    });

    it('desenha os quatro números do resumo, a tabela com cabeçalho e linhas e os dois cartões', async () => {
        const montado = await montarComponente(DemandaControleHorasEsqueletoComponent);
        expect(montado.elemento.querySelectorAll('.horas-esqueleto__numero').length).toBe(4);
        expect(montado.elemento.querySelector('.horas-esqueleto__cabecalho')).not.toBeNull();
        expect(montado.elemento.querySelectorAll('.horas-esqueleto__linha').length).toBe(7);
        expect(montado.elemento.querySelectorAll('.horas-esqueleto__cartao').length).toBe(2);
    });
});
