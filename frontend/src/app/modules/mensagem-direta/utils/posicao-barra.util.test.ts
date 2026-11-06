import { describe, it, expect } from 'vitest';
import { PosicaoBarraChatEnum } from '@project20/shared';
import { POSICOES_DA_BARRA, barraEhHorizontal, ladoDoTooltipDaBarra } from './posicao-barra.util';

describe('posição da barra de conversas', () => {
    it('a lista oferece cada posição do enum uma vez, com rótulo', () => {
        expect(POSICOES_DA_BARRA.map((item) => item.valor).sort()).toEqual(Object.values(PosicaoBarraChatEnum).sort());
        expect(POSICOES_DA_BARRA.every((item) => item.rotulo.length > 0)).toBe(true);
    });

    it('só acima e abaixo são horizontais', () => {
        expect(Object.values(PosicaoBarraChatEnum).filter(barraEhHorizontal).sort()).toEqual(['ABAIXO', 'ACIMA']);
    });

    it('o tooltip abre para o lado de dentro do popup', () => {
        expect(ladoDoTooltipDaBarra(PosicaoBarraChatEnum.ESQUERDA)).toBe('right');
        expect(ladoDoTooltipDaBarra(PosicaoBarraChatEnum.DIREITA)).toBe('left');
        expect(ladoDoTooltipDaBarra(PosicaoBarraChatEnum.ACIMA)).toBe('bottom');
        expect(ladoDoTooltipDaBarra(PosicaoBarraChatEnum.ABAIXO)).toBe('top');
    });
});
