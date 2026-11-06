import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { MensagemDiretaAvatarComponent } from './mensagem-direta-avatar.component';

describe('MensagemDiretaAvatarComponent', () => {
    const circulo = (elemento: HTMLElement) => elemento.querySelector<HTMLElement>('.avatar-direto')!;

    it('sem cor escolhida usa a cor de acento do tema (nenhum estilo próprio)', async () => {
        const tela = await montarComponente(MensagemDiretaAvatarComponent, { entradas: { nome: 'Camila Duarte' } });
        expect(circulo(tela.elemento).textContent?.trim()).toBe('CD');
        expect(circulo(tela.elemento).style.background).toBe('');
        expect(circulo(tela.elemento).style.color).toBe('');
    });

    it('com cor escolhida pinta o fundo e põe o texto claro sobre fundo escuro', async () => {
        const tela = await montarComponente(MensagemDiretaAvatarComponent, { entradas: { nome: 'Camila Duarte', cor: '#1E3A8A' } });
        expect(circulo(tela.elemento).style.background).toBe('rgb(30, 58, 138)');
        expect(circulo(tela.elemento).style.color).toBe('rgb(255, 255, 255)');
    });

    it('com cor clara o texto das iniciais fica escuro', async () => {
        const tela = await montarComponente(MensagemDiretaAvatarComponent, { entradas: { nome: 'Camila Duarte', cor: '#FDE047' } });
        expect(circulo(tela.elemento).style.color).toBe('rgb(17, 24, 39)');
    });
});
