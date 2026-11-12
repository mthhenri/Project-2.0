import { describe, expect, it } from 'vitest';
import { TipoGrupoEnum } from '@project20/shared';
import { corMedia, fundoDoGrupo, iconeDoCanal, malhaDeCores, MAXIMO_DE_CORES_NO_DEGRADE } from './avatar-grupo.util';

describe('fundoDoGrupo', () => {
    it('a cor escolhida pelo grupo vence qualquer cor dos membros', () => {
        const fundo = fundoDoGrupo('#3366FF', ['#FF0000', '#00FF00']);
        expect(fundo.fundo).toBe('#3366FF');
        expect(fundo.corDoTexto).toBe('#FFFFFF');
    });

    it('sem cor e sem cor de membro, vale a cor do tema', () => {
        expect(fundoDoGrupo(null, [])).toEqual({ fundo: null, corDoTexto: null });
    });

    it('com uma cor de membro só, a cor é lisa', () => {
        expect(fundoDoGrupo(null, ['#FFEE00'])).toEqual({ fundo: '#FFEE00', corDoTexto: '#111827' });
    });

    it('com várias cores de membros, vira malha na ordem de entrada, com a cor média por baixo', () => {
        const fundo = fundoDoGrupo(null, ['#112233', '#445566', '#778899']);
        expect(fundo.fundo).toBe(malhaDeCores(['#112233', '#445566', '#778899']));
        expect(fundo.fundo).toMatch(/^radial-gradient\(circle at .*#112233.*#445566.*#778899.*, #445566$/);
        expect(fundo.corDoTexto).toBe('#FFFFFF');
    });

    it('a malha tem no máximo seis cores', () => {
        const cores = Array.from({ length: 10 }, (_, indice) => `#${String(indice).repeat(6)}`);
        const fundo = fundoDoGrupo(null, cores).fundo as string;
        // Seis manchas mais a cor média da base.
        expect(fundo.split('radial-gradient').length - 1).toBe(MAXIMO_DE_CORES_NO_DEGRADE);
    });

    it('o texto sobre um degradê claro é escuro', () => {
        expect(fundoDoGrupo(null, ['#FFFF99', '#FFFFCC']).corDoTexto).toBe('#111827');
    });
});

describe('malhaDeCores', () => {
    const manchasDe = (cores: string[]) => [...malhaDeCores(cores).matchAll(/radial-gradient\(circle at ([\d.]+)% ([\d.]+)%, (#\w+) 0, transparent ([\d.]+)%\)/g)];

    it('cada cor tem uma mancha do mesmo tamanho, para ninguém pesar mais', () => {
        const manchas = manchasDe(['#A23FD4', '#F7931E', '#3F6FD0']);
        expect(manchas.map((mancha) => mancha[3])).toEqual(['#A23FD4', '#F7931E', '#3F6FD0']);
        expect(new Set(manchas.map((mancha) => mancha[4])).size).toBe(1);
    });

    it('as manchas ficam à mesma distância do centro e em ângulos igualmente espaçados', () => {
        for (const total of [2, 3, 4, 6]) {
            const manchas = manchasDe(Array.from({ length: total }, () => '#123456'));
            const angulos = manchas.map((mancha) => Math.atan2(Number(mancha[2]) - 50, Number(mancha[1]) - 50));
            for (const mancha of manchas) expect(Math.hypot(Number(mancha[1]) - 50, Number(mancha[2]) - 50)).toBeCloseTo(38, 0);
            for (let indice = 1; indice < total; indice++) {
                const passo = (((angulos[indice] - angulos[indice - 1]) * 180) / Math.PI + 360) % 360;
                expect(passo).toBeCloseTo(360 / total, 0);
            }
        }
    });
});

describe('corMedia', () => {
    it('é a média canal a canal', () => {
        expect(corMedia(['#000000', '#FFFFFF'])).toBe('#808080');
        expect(corMedia(['#FF0000', '#0000FF'])).toBe('#800080');
    });
});

describe('iconeDoCanal', () => {
    it('a demanda tem o #, o projeto a pasta e o grupo livre nenhum ícone', () => {
        expect(iconeDoCanal(TipoGrupoEnum.DEMANDA)).toBe('pi-hashtag');
        expect(iconeDoCanal(TipoGrupoEnum.PROJETO)).toBe('pi-folder');
        expect(iconeDoCanal(TipoGrupoEnum.LIVRE)).toBeNull();
    });
});
