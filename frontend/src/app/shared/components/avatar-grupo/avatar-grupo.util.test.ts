import { describe, expect, it } from 'vitest';
import { TipoGrupoEnum } from '@project20/shared';
import { corMedia, fundoDoGrupo, iconeDoCanal, MAXIMO_DE_CORES_NO_DEGRADE } from './avatar-grupo.util';

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

    it('com várias cores de membros, vira degradê na ordem de entrada', () => {
        const fundo = fundoDoGrupo(null, ['#112233', '#445566', '#778899']);
        expect(fundo.fundo).toBe('linear-gradient(135deg, #112233, #445566, #778899)');
        expect(fundo.corDoTexto).toBe('#FFFFFF');
    });

    it('o degradê tem no máximo seis cores', () => {
        const cores = Array.from({ length: 10 }, (_, indice) => `#${String(indice).repeat(6)}`);
        const fundo = fundoDoGrupo(null, cores).fundo as string;
        expect(fundo.split('#').length - 1).toBe(MAXIMO_DE_CORES_NO_DEGRADE);
    });

    it('o texto sobre um degradê claro é escuro', () => {
        expect(fundoDoGrupo(null, ['#FFFF99', '#FFFFCC']).corDoTexto).toBe('#111827');
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
