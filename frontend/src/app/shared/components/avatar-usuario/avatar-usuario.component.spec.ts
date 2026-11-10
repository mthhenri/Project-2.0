import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { AvatarUsuarioComponent, iniciaisDoNome } from './avatar-usuario.component';

describe('AvatarUsuarioComponent', () => {
    const circulo = (elemento: HTMLElement) => elemento.querySelector<HTMLElement>('.avatar-usuario')!;

    it('sem cor escolhida usa a cor de acento do tema (nenhum estilo próprio)', async () => {
        const tela = await montarComponente(AvatarUsuarioComponent, { entradas: { nome: 'Camila Duarte' } });
        expect(circulo(tela.elemento).textContent?.trim()).toBe('CD');
        expect(circulo(tela.elemento).style.background).toBe('');
        expect(circulo(tela.elemento).style.color).toBe('');
    });

    it('com cor escolhida pinta o fundo e põe o texto claro sobre fundo escuro', async () => {
        const tela = await montarComponente(AvatarUsuarioComponent, { entradas: { nome: 'Camila Duarte', cor: '#1E3A8A' } });
        expect(circulo(tela.elemento).style.background).toBe('rgb(30, 58, 138)');
        expect(circulo(tela.elemento).style.color).toBe('rgb(255, 255, 255)');
    });

    it('com cor clara o texto das iniciais fica escuro', async () => {
        const tela = await montarComponente(AvatarUsuarioComponent, { entradas: { nome: 'Camila Duarte', cor: '#FDE047' } });
        expect(circulo(tela.elemento).style.color).toBe('rgb(17, 24, 39)');
    });

    it('iniciais da tela têm precedência sobre as do nome', async () => {
        const tela = await montarComponente(AvatarUsuarioComponent, { entradas: { nome: 'Matheus Henrique Silva', iniciais: 'MH' } });
        expect(circulo(tela.elemento).textContent?.trim()).toBe('MH');
    });

    it('o tamanho da tela vira a variável do diâmetro', async () => {
        const tela = await montarComponente(AvatarUsuarioComponent, { entradas: { nome: 'Camila Duarte', tamanho: '1.75rem' } });
        expect(circulo(tela.elemento).style.getPropertyValue('--avatar-tamanho')).toBe('1.75rem');
    });

    it('iniciaisDoNome: primeira e última palavra, em maiúsculas', () => {
        expect(iniciaisDoNome('Camila Duarte')).toBe('CD');
        expect(iniciaisDoNome('  rafael   de souza lima ')).toBe('RL');
        expect(iniciaisDoNome('Madonna')).toBe('M');
        expect(iniciaisDoNome('   ')).toBe('?');
    });
});
