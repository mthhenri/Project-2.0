import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ehCedo, ehDiaDoAniversario, ehMensagemDoCanto, reservarVezDoDia } from './detalhes-da-pia.util';

const FUSO = 'America/Sao_Paulo';

describe('detalhes da Piá', () => {
    beforeEach(() => localStorage.clear());

    it('reconhece o texto em qualquer grafia', () => {
        for (const texto of ['bem-te-vi', 'bem te vi', 'bemtevi', 'Bem-te-vi!', '  BEM-TE-VÍ?? ']) expect(ehMensagemDoCanto(texto), texto).toBe(true);
    });

    it('não reconhece o texto dentro de uma frase', () => {
        for (const texto of ['', 'bem te vi ontem', 'que bem-te-vi', 'bem te vi 2', 'bemtevis']) expect(ehMensagemDoCanto(texto), texto).toBe(false);
    });

    it('29/03 é contado no fuso do sistema', () => {
        expect(ehDiaDoAniversario(new Date('2027-03-29T03:00:00Z'), FUSO)).toBe(true);
        expect(ehDiaDoAniversario(new Date('2027-03-30T02:59:00Z'), FUSO)).toBe(true);
        expect(ehDiaDoAniversario(new Date('2027-03-29T02:59:00Z'), FUSO)).toBe(false);
    });

    it('cedo vai das 05:00 às 08:00, inclusive', () => {
        expect(ehCedo(new Date('2027-05-10T07:59:59Z'), FUSO)).toBe(false);
        expect(ehCedo(new Date('2027-05-10T08:00:00Z'), FUSO)).toBe(true);
        expect(ehCedo(new Date('2027-05-10T11:00:59Z'), FUSO)).toBe(true);
        expect(ehCedo(new Date('2027-05-10T11:01:00Z'), FUSO)).toBe(false);
    });

    it('uma vez por dia, por chave', () => {
        const manha = new Date('2027-05-10T10:00:00Z');
        expect(reservarVezDoDia('a', manha, FUSO)).toBe(true);
        expect(reservarVezDoDia('a', manha, FUSO)).toBe(false);
        expect(reservarVezDoDia('b', manha, FUSO)).toBe(true);
        expect(reservarVezDoDia('a', new Date('2027-05-11T10:00:00Z'), FUSO)).toBe(true);
    });

    it('sem armazenamento não toca', () => {
        const espiao = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('bloqueado');
        });
        expect(reservarVezDoDia('a', new Date(), FUSO)).toBe(false);
        espiao.mockRestore();
    });
});
