import { TipoGrupoEnum, corDoTextoSobre } from '@project20/shared';

/** O ícone do canal no lugar das iniciais (task 248): `#` na demanda e pasta no projeto; o grupo livre não tem (usa emoji ou iniciais). */
export function iconeDoCanal(tipo: TipoGrupoEnum): string | null {
    if (tipo === TipoGrupoEnum.DEMANDA) return 'pi-hashtag';
    if (tipo === TipoGrupoEnum.PROJETO) return 'pi-folder';
    return null;
}

/** Quantas cores de membros entram no degradê (mais que isso vira uma faixa estreita demais para o círculo). */
export const MAXIMO_DE_CORES_NO_DEGRADE = 6;

export interface FundoDoGrupo {
    /** O valor de `background`; `null` = a cor de acento do tema (ninguém no grupo escolheu cor). */
    fundo: string | null;
    /** A cor das iniciais (ou do emoji) com contraste sobre o fundo; `null` = a do tema. */
    corDoTexto: string | null;
}

function canais(cor: string): [number, number, number] {
    return [1, 3, 5].map((inicio) => parseInt(cor.slice(inicio, inicio + 2), 16)) as [number, number, number];
}

/** A cor média das cores (`#RRGGBB`), para escolher o texto claro ou escuro sobre o degradê. */
export function corMedia(cores: string[]): string {
    const soma = cores.map(canais).reduce((total, rgb) => [total[0] + rgb[0], total[1] + rgb[1], total[2] + rgb[2]], [0, 0, 0]);
    return `#${soma.map((valor) => Math.round(valor / cores.length).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * O fundo do avatar do grupo. Com cor escolhida pelo grupo vale ela. Sem cor, vale o degradê das cores de bolinha dos membros que escolheram uma
 * (uma só cor vira cor lisa; nenhuma, a cor do tema). O degradê acompanha os membros: muda sozinho quando entra ou sai alguém.
 */
export function fundoDoGrupo(corDoGrupo: string | null, coresDosMembros: string[]): FundoDoGrupo {
    if (corDoGrupo) return { fundo: corDoGrupo, corDoTexto: corDoTextoSobre(corDoGrupo) };
    const cores = coresDosMembros.slice(0, MAXIMO_DE_CORES_NO_DEGRADE);
    if (cores.length === 0) return { fundo: null, corDoTexto: null };
    if (cores.length === 1) return { fundo: cores[0], corDoTexto: corDoTextoSobre(cores[0]) };
    return { fundo: `linear-gradient(135deg, ${cores.join(', ')})`, corDoTexto: corDoTextoSobre(corMedia(cores)) };
}
