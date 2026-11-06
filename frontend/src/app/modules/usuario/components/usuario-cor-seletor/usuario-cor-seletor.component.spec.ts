import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { UsuarioCorSeletorComponent } from './usuario-cor-seletor.component';

describe('UsuarioCorSeletorComponent', () => {
    const botaoPadrao = (elemento: HTMLElement) => elemento.querySelector<HTMLButtonElement>('.cor-seletor__padrao')!;

    it('mostra a prévia com as iniciais e "Cor padrão" quando não há cor', async () => {
        const tela = await montarComponente(UsuarioCorSeletorComponent, { entradas: { nome: 'Camila Duarte' } });
        expect(tela.elemento.querySelector('.avatar-direto')?.textContent?.trim()).toBe('CD');
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

    it('sem pedido do dono não há botão de aplicar', async () => {
        const sem = await montarComponente(UsuarioCorSeletorComponent, { entradas: { nome: 'Camila Duarte' } });
        expect(sem.elemento.querySelector('p-button')).toBeNull();
    });

    it('quando o dono do seletor pede, o botão de aplicar aparece e avisa', async () => {
        const com = await montarComponente(UsuarioCorSeletorComponent, { entradas: { nome: 'Camila Duarte', rotuloAplicar: 'Aplicar' } });
        let avisos = 0;
        com.componente.aplicada.subscribe(() => avisos++);
        com.elemento.querySelector<HTMLButtonElement>('p-button button')!.click();
        expect(avisos).toBe(1);
    });

    it('a escolha do seletor vira #RRGGBB maiúsculo; valor que não é cor completa é ignorado', async () => {
        const tela = await montarComponente(UsuarioCorSeletorComponent, { entradas: { nome: 'Camila Duarte' } });
        const componente = tela.componente as unknown as { aoEscolher(valor: string | object): void };
        componente.aoEscolher('1e3a8a');
        expect(tela.componente.cor()).toBe('#1E3A8A');
        componente.aoEscolher('1e3');
        componente.aoEscolher({});
        expect(tela.componente.cor()).toBe('#1E3A8A');
    });
});
