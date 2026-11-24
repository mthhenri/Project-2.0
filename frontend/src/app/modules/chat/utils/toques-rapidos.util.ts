/** Quantos toques e em quanto tempo (do primeiro ao último) completam a sequência (task 491). */
export interface RegraDosToques {
    readonly quantidade: number;
    readonly janelaMs: number;
}

export const REGRA_DOS_TOQUES_RAPIDOS: RegraDosToques = { quantidade: 5, janelaMs: 2000 };

export interface ToquesRegistrados {
    /** Os instantes (ms) que continuam valendo para a próxima chamada. */
    readonly toques: number[];
    /** O toque de agora completou a sequência; a contagem recomeça do zero. */
    readonly completou: boolean;
}

/** Registra um toque no instante `agora` (ms): descarta os que saíram da janela e diz se a sequência completou. */
export function registrarToque(toques: readonly number[], agora: number, regra: RegraDosToques = REGRA_DOS_TOQUES_RAPIDOS): ToquesRegistrados {
    const valendo = [...toques.filter((instante) => agora - instante < regra.janelaMs), agora];
    if (valendo.length >= regra.quantidade) return { toques: [], completou: true };
    return { toques: valendo, completou: false };
}
