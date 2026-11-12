import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { MensagemDiretaGrupoAparenciaComponent } from './mensagem-direta-grupo-aparencia.component';

// Os campos de aparência do grupo (task 247): nome, cor (sugerida, outra ou automática) e emoji no lugar das iniciais, com prévia do avatar.

describe('MensagemDiretaGrupoAparenciaComponent', () => {
    async function montar() {
        const tela = await montarComponente(MensagemDiretaGrupoAparenciaComponent, { entradas: { nome: 'Time do backend', coresDosMembros: ['#DB2777', '#2563EB'] } });
        const componente = tela.fixture.componentInstance;
        return { tela, componente };
    }
    const botao = (tela: Awaited<ReturnType<typeof montar>>['tela'], rotulo: string) =>
        Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.includes(rotulo) || candidato.getAttribute('aria-label') === rotulo)!;

    it('mostra o nome recebido e uma prévia do avatar com o degradê dos membros quando a cor é automática', async () => {
        const { tela, componente } = await montar();
        expect(tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Nome do grupo"]')!.value).toBe('Time do backend');
        expect(componente.cor()).toBeNull();
        expect(botao(tela, 'Automática').getAttribute('aria-pressed')).toBe('true');
        expect(tela.elemento.querySelector<HTMLElement>('.avatar-grupo')!.style.background).toContain('radial-gradient');
    });

    it('digitar o nome atualiza o valor ligado e a prévia mostra as iniciais', async () => {
        const { tela, componente } = await montar();
        const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Nome do grupo"]')!;
        campo.value = 'Revisão de código';
        campo.dispatchEvent(new Event('input'));
        await tela.atualizar();
        expect(componente.nome()).toBe('Revisão de código');
        expect(tela.elemento.querySelector('.avatar-grupo')!.textContent?.trim()).toBe('RC');
    });

    it('escolher uma cor sugerida pinta a prévia e voltar à automática devolve o degradê', async () => {
        const { tela, componente } = await montar();
        botao(tela, 'Cor #1E3A8A').click();
        await tela.atualizar();
        expect(componente.cor()).toBe('#1E3A8A');
        expect(tela.elemento.querySelector<HTMLElement>('.avatar-grupo')!.style.background).toBe('rgb(30, 58, 138)');
        botao(tela, 'Automática').click();
        await tela.atualizar();
        expect(componente.cor()).toBeNull();
    });

    it('o seletor de outra cor grava a cor em maiúsculas', async () => {
        const { tela, componente } = await montar();
        const seletor = tela.elemento.querySelector<HTMLInputElement>('input[type="color"]')!;
        seletor.value = '#3366ff';
        seletor.dispatchEvent(new Event('input'));
        await tela.atualizar();
        expect(componente.cor()).toBe('#3366FF');
    });

    it('escolher um emoji o põe no lugar das iniciais e "Aa" volta às iniciais', async () => {
        const { tela, componente } = await montar();
        botao(tela, 'Emoji 🚀').click();
        await tela.atualizar();
        expect(componente.emoji()).toBe('🚀');
        expect(tela.elemento.querySelector('.avatar-grupo')!.textContent?.trim()).toBe('🚀');
        botao(tela, 'Aa').click();
        await tela.atualizar();
        expect(componente.emoji()).toBeNull();
        expect(tela.elemento.querySelector('.avatar-grupo')!.textContent?.trim()).toBe('TB');
    });

    it('o botão "+" abre o seletor completo de emojis e escolher nele fecha o seletor', async () => {
        const { tela, componente } = await montar();
        const mais = Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.aparencia-grupo__emoji--mais'))[0];
        mais.click();
        await tela.atualizar();
        expect(tela.elemento.querySelector('app-mensagem-direta-emoji-seletor')).not.toBeNull();
        const primeiroDaGrade = tela.elemento.querySelector<HTMLButtonElement>('app-mensagem-direta-emoji-seletor .emoji-seletor__emoji')!;
        const escolhido = primeiroDaGrade.textContent!.trim();
        primeiroDaGrade.click();
        await tela.atualizar();
        expect(componente.emoji()).toBe(escolhido);
        expect(tela.elemento.querySelector('app-mensagem-direta-emoji-seletor')).toBeNull();
    });
});
