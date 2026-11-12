import { describe, it, expect } from 'vitest';
import { TipoGrupoEnum } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { AvatarGrupoComponent } from './avatar-grupo.component';

describe('AvatarGrupoComponent', () => {
    const circulo = (elemento: HTMLElement) => elemento.querySelector<HTMLElement>('.avatar-grupo')!;

    it('sem emoji mostra as iniciais do nome (primeira e última palavra)', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Time do backend' } });
        expect(circulo(tela.elemento).textContent?.trim()).toBe('TB');
        expect(circulo(tela.elemento).classList.contains('avatar-grupo--emoji')).toBe(false);
    });

    it('com emoji ele substitui as iniciais', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Time do backend', emoji: '🚀' } });
        expect(circulo(tela.elemento).textContent?.trim()).toBe('🚀');
        expect(circulo(tela.elemento).classList.contains('avatar-grupo--emoji')).toBe(true);
    });

    it('sem cor do grupo nem cores de membros usa a cor de acento do tema (nenhum estilo próprio)', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Time' } });
        expect(circulo(tela.elemento).style.background).toBe('');
        expect(circulo(tela.elemento).style.color).toBe('');
    });

    it('a cor do grupo pinta o fundo e põe o texto claro sobre fundo escuro', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Time', cor: '#1E3A8A', coresDosMembros: ['#FF0000'] } });
        expect(circulo(tela.elemento).style.background).toBe('rgb(30, 58, 138)');
        expect(circulo(tela.elemento).style.color).toBe('rgb(255, 255, 255)');
    });

    it('sem cor do grupo, as cores dos membros viram um degradê', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Time', coresDosMembros: ['#DB2777', '#2563EB', '#059669'] } });
        expect(circulo(tela.elemento).style.background).toContain('radial-gradient');
        expect(circulo(tela.elemento).style.background).toContain('rgb(219, 39, 119)');
    });

    it('o canal da demanda mostra o ícone # no lugar das iniciais e do emoji, e nunca usa o degradê dos membros', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Cadastro de clientes', emoji: '🚀', tipo: TipoGrupoEnum.DEMANDA, coresDosMembros: ['#DB2777', '#2563EB'] } });
        expect(tela.elemento.querySelector('.pi-hashtag')).not.toBeNull();
        expect(circulo(tela.elemento).textContent?.trim()).toBe('');
        expect(circulo(tela.elemento).classList.contains('avatar-grupo--icone')).toBe(true);
        expect(circulo(tela.elemento).classList.contains('avatar-grupo--emoji')).toBe(false);
        expect(circulo(tela.elemento).style.background).toBe('');
    });

    it('o canal do projeto mostra a pasta', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Portal', tipo: TipoGrupoEnum.PROJETO } });
        expect(tela.elemento.querySelector('.pi-folder')).not.toBeNull();
    });

    it('o grupo livre continua com iniciais e sem ícone', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Time do backend', tipo: TipoGrupoEnum.LIVRE } });
        expect(tela.elemento.querySelector('.pi')).toBeNull();
        expect(circulo(tela.elemento).textContent?.trim()).toBe('TB');
    });

    it('o tamanho da tela vira a variável do diâmetro', async () => {
        const tela = await montarComponente(AvatarGrupoComponent, { entradas: { nome: 'Time', tamanho: '3.5rem' } });
        expect(circulo(tela.elemento).style.getPropertyValue('--avatar-tamanho')).toBe('3.5rem');
    });
});
