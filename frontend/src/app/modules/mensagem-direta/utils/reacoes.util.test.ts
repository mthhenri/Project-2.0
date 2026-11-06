import { describe, it, expect } from 'vitest';
import { agruparReacoes, aplicarReacoesNaMensagem, minhaReacao, textoDoAvisoDeReacao } from './reacoes.util';
import { MensagemNaConversa } from './mensagem-direta.util';

const nomeDe = (usuarioId: number) => (usuarioId === 9 ? 'Bruno' : 'Pessoa removida');
const mensagem = (mensagemId: string, reacoes: MensagemNaConversa['reacoes'] = []) => ({ mensagemId, reacoes }) as MensagemNaConversa;

describe('agruparReacoes', () => {
    it('uma pílula por emoji, "Você" primeiro e o total de pessoas', () => {
        const pilulas = agruparReacoes([{ usuarioId: 9, reacao: '👍' }, { usuarioId: 4, reacao: '👍' }, { usuarioId: 12, reacao: '🎉' }], 4, nomeDe);
        expect(pilulas).toEqual([
            { reacao: '👍', total: 2, minha: true, nomes: ['Você', 'Bruno'] },
            { reacao: '🎉', total: 1, minha: false, nomes: ['Pessoa removida'] },
        ]);
    });

    it('sem reações não há pílulas, e o usuário desconhecido nunca marca "minha"', () => {
        expect(agruparReacoes([], 4, nomeDe)).toEqual([]);
        expect(agruparReacoes([{ usuarioId: 9, reacao: '❤️' }], undefined, nomeDe)[0].minha).toBe(false);
    });

    it('um emoji composto (família, bandeira) é uma pílula só', () => {
        const pilulas = agruparReacoes([{ usuarioId: 9, reacao: '👨‍👩‍👧' }, { usuarioId: 4, reacao: '🇧🇷' }], 4, nomeDe);
        expect(pilulas.map((pilula) => pilula.reacao)).toEqual(['👨‍👩‍👧', '🇧🇷']);
    });
});

describe('minhaReacao e aplicarReacoesNaMensagem', () => {
    it('acha a reação do usuário, ou null', () => {
        expect(minhaReacao([{ usuarioId: 9, reacao: '👍' }, { usuarioId: 4, reacao: '🙏' }], 4)).toBe('🙏');
        expect(minhaReacao([{ usuarioId: 9, reacao: '👍' }], 4)).toBeNull();
    });

    it('troca só as reações da mensagem pedida; mensagem que não está na tela não muda a lista', () => {
        const lista = [mensagem('a'), mensagem('b', [{ usuarioId: 9, reacao: '👍' }])];
        const nova = aplicarReacoesNaMensagem(lista, 'a', [{ usuarioId: 4, reacao: '❤️' }]);
        expect(nova[0].reacoes).toEqual([{ usuarioId: 4, reacao: '❤️' }]);
        expect(nova[1]).toBe(lista[1]);
        expect(aplicarReacoesNaMensagem(lista, 'x', [])).toBe(lista);
    });
});

describe('textoDoAvisoDeReacao', () => {
    it('diz o que aconteceu com o emoji, sem o nome (que vai à parte)', () => {
        expect(textoDoAvisoDeReacao('👍')).toBe('reagiu à sua mensagem com 👍');
    });
});
