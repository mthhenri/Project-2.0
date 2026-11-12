import { TipoGrupoEnum, corDoTextoSobre } from '@project20/shared';

/** O ícone do canal no lugar das iniciais (task 248): `#` na demanda e pasta no projeto; o grupo livre não tem (usa emoji ou iniciais). */
export function iconeDoCanal(tipo: TipoGrupoEnum): string | null {
    if (tipo === TipoGrupoEnum.DEMANDA) return 'pi-hashtag';
    if (tipo === TipoGrupoEnum.PROJETO) return 'pi-folder';
    return null;
}

/** Quantas cores de membros entram na malha (mais que isso vira uma mancha pequena demais para o círculo). */
export const MAXIMO_DE_CORES_NO_DEGRADE = 6;

/** O ângulo da primeira mancha da malha (canto superior esquerdo); as outras seguem em passos iguais ao redor do círculo. */
const ANGULO_INICIAL_DA_MALHA = -135;
/** A distância das manchas ao centro, em % do círculo, e o raio de cada uma (igual para todas, para ninguém pesar mais). */
const DISTANCIA_DA_MANCHA = 38;
const RAIO_DA_MANCHA = 62;

/**
 * A malha (mesh): uma mancha de cada cor, todas com o **mesmo tamanho** e em ângulos igualmente espaçados, sobre a cor média como base, então cada
 * membro ocupa a mesma parte do círculo. A ordem é a de entrada no grupo.
 */
export function malhaDeCores(cores: string[]): string {
    const manchas = cores.map((cor, indice) => {
        const angulo = ((ANGULO_INICIAL_DA_MALHA + (indice * 360) / cores.length) * Math.PI) / 180;
        const horizontal = (50 + DISTANCIA_DA_MANCHA * Math.cos(angulo)).toFixed(1);
        const vertical = (50 + DISTANCIA_DA_MANCHA * Math.sin(angulo)).toFixed(1);
        return `radial-gradient(circle at ${horizontal}% ${vertical}%, ${cor} 0, transparent ${RAIO_DA_MANCHA}%)`;
    });
    return [...manchas, corMedia(cores)].join(', ');
}

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
 * O fundo do avatar do grupo. Com cor escolhida pelo grupo vale ela. Sem cor, vale a malha das cores de bolinha dos membros que escolheram uma
 * (`malhaDeCores`; uma só cor vira cor lisa; nenhuma, a cor do tema). A malha acompanha os membros: muda sozinha quando entra ou sai alguém.
 */
export function fundoDoGrupo(corDoGrupo: string | null, coresDosMembros: string[]): FundoDoGrupo {
    if (corDoGrupo) return { fundo: corDoGrupo, corDoTexto: corDoTextoSobre(corDoGrupo) };
    const cores = coresDosMembros.slice(0, MAXIMO_DE_CORES_NO_DEGRADE);
    if (cores.length === 0) return { fundo: null, corDoTexto: null };
    if (cores.length === 1) return { fundo: cores[0], corDoTexto: corDoTextoSobre(cores[0]) };
    return { fundo: malhaDeCores(cores), corDoTexto: corDoTextoSobre(corMedia(cores)) };
}
