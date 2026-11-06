import { PosicaoBarraChatEnum } from '@project20/shared';

// Posição da barra de conversas da conversa aberta (task 318). Lógica pura: nada aqui conhece Angular nem o DOM.

export const POSICOES_DA_BARRA: { valor: PosicaoBarraChatEnum; rotulo: string }[] = [
    { valor: PosicaoBarraChatEnum.ESQUERDA, rotulo: 'À esquerda' },
    { valor: PosicaoBarraChatEnum.DIREITA, rotulo: 'À direita' },
    { valor: PosicaoBarraChatEnum.ACIMA, rotulo: 'Acima' },
    { valor: PosicaoBarraChatEnum.ABAIXO, rotulo: 'Abaixo' },
];

/** Acima e abaixo viram uma fileira; esquerda e direita, uma coluna. */
export function barraEhHorizontal(posicao: PosicaoBarraChatEnum): boolean {
    return posicao === PosicaoBarraChatEnum.ACIMA || posicao === PosicaoBarraChatEnum.ABAIXO;
}

/** O lado do tooltip da bolinha: o oposto do lado em que a barra encosta, para não cair fora do popup. */
export function ladoDoTooltipDaBarra(posicao: PosicaoBarraChatEnum): 'right' | 'left' | 'bottom' | 'top' {
    switch (posicao) {
        case PosicaoBarraChatEnum.DIREITA:
            return 'left';
        case PosicaoBarraChatEnum.ACIMA:
            return 'bottom';
        case PosicaoBarraChatEnum.ABAIXO:
            return 'top';
        default:
            return 'right';
    }
}
