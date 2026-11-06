import { describe, it, expect } from 'vitest';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { MensagemDiretaEmojiSeletorComponent } from './mensagem-direta-emoji-seletor.component';

// O seletor de emoji (task 314): as categorias, a busca pelo nome em português e o emoji escolhido.

describe('MensagemDiretaEmojiSeletorComponent', () => {
    let tela: ComponenteMontado<MensagemDiretaEmojiSeletorComponent>;
    const emojis = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.emoji-seletor__emoji'));
    const abas = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.emoji-seletor__aba'));
    const buscar = async (texto: string) => {
        const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar emoji"]')!;
        campo.value = texto;
        campo.dispatchEvent(new Event('input'));
        await tela.atualizar();
    };

    async function montar() {
        tela = await montarComponente(MensagemDiretaEmojiSeletorComponent);
        await tela.atualizar();
    }

    it('abre na primeira categoria, com as nove abas, e a busca recebe o foco', async () => {
        await montar();
        expect(abas().map((aba) => aba.getAttribute('aria-label'))).toEqual([
            'Rostos e emoções', 'Pessoas e corpo', 'Animais e natureza', 'Comidas e bebidas', 'Viagens e lugares', 'Atividades', 'Objetos', 'Símbolos', 'Bandeiras',
        ]);
        expect(abas()[0].getAttribute('aria-selected')).toBe('true');
        expect(emojis().length).toBeGreaterThan(100);
        expect(emojis().some((botao) => botao.textContent?.trim() === '😀')).toBe(true);
    });

    it('trocar de aba mostra os emojis daquela categoria', async () => {
        await montar();
        abas()[8].click();
        await tela.atualizar();
        expect(abas()[8].getAttribute('aria-selected')).toBe('true');
        expect(emojis().some((botao) => botao.textContent?.trim() === '🇧🇷')).toBe(true);
        expect(emojis().some((botao) => botao.textContent?.trim() === '😀')).toBe(false);
    });

    it('a busca ignora acento e caixa, esconde as abas e avisa quando nada é achado', async () => {
        await montar();
        await buscar('CORAÇÃO');
        expect(emojis().length).toBeGreaterThan(5);
        expect(emojis().some((botao) => botao.textContent?.trim() === '❤️')).toBe(true);
        expect(tela.elemento.querySelector('.emoji-seletor__abas')).toBeNull();

        await buscar('zzzxxyy');
        expect(emojis().length).toBe(0);
        expect(tela.elemento.textContent).toContain('Nenhum emoji encontrado.');

        await buscar('');
        expect(tela.elemento.querySelector('.emoji-seletor__abas')).not.toBeNull();
    });

    it('clicar num emoji emite o caractere; Esc emite fechar e não deixa o evento seguir', async () => {
        await montar();
        const escolhidos: string[] = [];
        tela.componente.escolher.subscribe((emoji) => escolhidos.push(emoji));
        let fechou = 0;
        tela.componente.fechar.subscribe(() => fechou++);

        emojis().find((botao) => botao.textContent?.trim() === '😀')!.click();
        expect(escolhidos).toEqual(['😀']);

        let chegouAoPai = false;
        tela.elemento.parentElement!.addEventListener('keydown', () => { chegouAoPai = true; });
        tela.elemento.querySelector('.emoji-seletor')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(fechou).toBe(1);
        expect(chegouAoPai).toBe(false);
    });
});
