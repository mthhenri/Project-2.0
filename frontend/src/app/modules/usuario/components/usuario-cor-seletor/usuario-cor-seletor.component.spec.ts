import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { UsuarioCorSeletorComponent } from './usuario-cor-seletor.component';

describe('UsuarioCorSeletorComponent', () => {
    const botaoPadrao = (elemento: HTMLElement) => elemento.querySelector<HTMLButtonElement>('.cor-seletor__padrao')!;

    it('mostra a prévia com as iniciais e "Cor padrão" quando não há cor', async () => {
        const tela = await montarComponente(UsuarioCorSeletorComponent, { entradas: { nome: 'Camila Duarte' } });
        expect(tela.elemento.querySelector('.avatar-usuario')?.textContent?.trim()).toBe('CD');
        expect(tela.elemento.querySelector('.cor-seletor__dica')?.textContent?.trim()).toBe('Cor padrão');
        expect(botaoPadrao(tela.elemento).disabled).toBe(true);
    });

    it('com cor mostra o código na prévia e "Voltar à cor padrão" a limpa', async () => {
        const tela = await montarComponente(UsuarioCorSeletorComponent, { entradas: { nome: 'Camila Duarte', cor: '#1E3A8A' } });
        expect(tela.elemento.querySelector('.cor-seletor__dica')?.textContent?.trim()).toBe('#1E3A8A');
        botaoPadrao(tela.elemento).click();
        await tela.atualizar();
        expect(tela.componente.cor()).toBeNull();
        expect(tela.elemento.querySelector('.cor-seletor__dica')?.textContent?.trim()).toBe('Cor padrão');
    });

    it('a escolha da paleta vira #RRGGBB maiúsculo; valor que não é cor completa é ignorado', async () => {
        const tela = await montarComponente(UsuarioCorSeletorComponent, { entradas: { nome: 'Camila Duarte' } });
        const componente = tela.componente as unknown as { aoEscolher(valor: string | null): void };
        componente.aoEscolher('#1e3a8a');
        expect(tela.componente.cor()).toBe('#1E3A8A');
        componente.aoEscolher('#1e3');
        componente.aoEscolher(null);
        expect(tela.componente.cor()).toBe('#1E3A8A');
    });

    it('usa a paleta das tags: clicar numa amostra escolhe a cor, e sem cor nenhuma amostra vem marcada', async () => {
        const tela = await montarComponente(UsuarioCorSeletorComponent, { entradas: { nome: 'Camila Duarte' } });
        const amostras = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.seletor-cor__amostra'));
        expect(amostras().length).toBeGreaterThan(20);
        expect(tela.elemento.querySelector('.seletor-cor__amostra--ativa')).toBeNull();
        amostras()[0].click();
        await tela.atualizar();
        expect(tela.componente.cor()).toBe('#EF4444');
        expect(tela.elemento.querySelector('.seletor-cor__amostra--ativa')).not.toBeNull();
    });
});
