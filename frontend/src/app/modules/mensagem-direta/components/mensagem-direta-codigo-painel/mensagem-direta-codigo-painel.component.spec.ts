import { describe, expect, it } from 'vitest';
import { LIMITE_TEXTO_MENSAGEM_DIRETA } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { CodigoEscolhido, MensagemDiretaCodigoPainelComponent } from './mensagem-direta-codigo-painel.component';

// O mini editor de código do compositor (task 216): código inicial, linguagem, contador do limite, Inserir, Ctrl+Enter e Esc.

async function montar(entradas: { texto?: string; inicio?: number; fim?: number; codigoInicial?: string } = {}) {
  const montado = await montarComponente(MensagemDiretaCodigoPainelComponent, { entradas: { texto: '', inicio: 0, fim: 0, codigoInicial: '', ...entradas } });
  const inseridos: CodigoEscolhido[] = [];
  let cancelamentos = 0;
  montado.componente.inserir.subscribe((escolhido) => inseridos.push(escolhido));
  montado.componente.cancelar.subscribe(() => cancelamentos++);
  const editor = () => montado.elemento.querySelector<HTMLTextAreaElement>('textarea[aria-label="Código do bloco"]')!;
  const botao = (rotulo: string) => Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('p-button button')).find((item) => item.textContent?.includes(rotulo))!;
  const digitar = async (codigo: string) => {
    editor().value = codigo;
    editor().dispatchEvent(new Event('input'));
    await montado.atualizar();
  };
  const teclar = (tecla: string, opcoes: KeyboardEventInit = {}, alvo: Element = editor()) => {
    const evento = new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true, ...opcoes });
    alvo.dispatchEvent(evento);
    return evento;
  };
  return { ...montado, inseridos, cancelamentos: () => cancelamentos, editor, botao, digitar, teclar };
}

describe('MensagemDiretaCodigoPainelComponent', () => {
  it('abre com o código inicial no editor (o trecho que estava selecionado) e sem linguagem', async () => {
    const painel = await montar({ codigoInicial: 'const a = 1;' });
    expect(painel.editor().value).toBe('const a = 1;');
    expect(painel.elemento.textContent).toContain('Bloco de código');
    expect(painel.elemento.querySelector('p-select')).not.toBeNull();
  });

  it('Inserir fica desabilitado com o editor vazio ou só com espaços, e habilita com código', async () => {
    const painel = await montar();
    expect(painel.botao('Inserir').disabled).toBe(true);
    await painel.digitar('  \n ');
    expect(painel.botao('Inserir').disabled).toBe(true);
    await painel.digitar('x();');
    expect(painel.botao('Inserir').disabled).toBe(false);
  });

  it('Inserir devolve o código e a linguagem escolhida; sem escolher, linguagem nula', async () => {
    const painel = await montar();
    await painel.digitar('SELECT 1;');
    painel.botao('Inserir').click();
    expect(painel.inseridos).toEqual([{ codigo: 'SELECT 1;', linguagem: null }]);

    painel.componente['controleLinguagem'].setValue('sql');
    await painel.atualizar();
    painel.botao('Inserir').click();
    expect(painel.inseridos[1]).toEqual({ codigo: 'SELECT 1;', linguagem: 'sql' });
  });

  it('Ctrl+Enter insere; Enter simples não (é uma quebra de linha do código)', async () => {
    const painel = await montar();
    await painel.digitar('a();');
    expect(painel.teclar('Enter').defaultPrevented).toBe(true);
    expect(painel.inseridos).toEqual([]);
    expect(painel.editor().value).toBe('a();\n');

    painel.teclar('Enter', { ctrlKey: true });
    expect(painel.inseridos).toHaveLength(1);
    expect(painel.inseridos[0].codigo).toBe('a();\n');
  });

  it('Ctrl+Enter com o editor vazio não insere nada', async () => {
    const painel = await montar();
    painel.teclar('Enter', { ctrlKey: true });
    expect(painel.inseridos).toEqual([]);
  });

  it('Esc e Cancelar cancelam; o Esc não segue para o popup', async () => {
    const painel = await montar();
    const esc = painel.teclar('Escape');
    expect(esc.defaultPrevented).toBe(true);
    expect(painel.cancelamentos()).toBe(1);

    painel.botao('Cancelar').click();
    expect(painel.cancelamentos()).toBe(2);
    expect(painel.inseridos).toEqual([]);
  });

  it('o Esc dentro do seletor de linguagem não cancela o painel', async () => {
    const painel = await montar();
    painel.teclar('Escape', {}, painel.elemento.querySelector('p-select')!);
    expect(painel.cancelamentos()).toBe(0);
  });

  it('o contador mede a mensagem inteira, cerca e linguagem incluídas', async () => {
    const painel = await montar({ texto: 'oi', inicio: 2, fim: 2 });
    await painel.digitar('x');
    // "oi" + "\n```\nx\n```" = 2 + 1 + 3 + 1 + 1 + 1 + 3 = 12
    expect(painel.elemento.querySelector('.painel-codigo__contador')!.textContent).toContain('12 / 10.000');
    painel.componente['controleLinguagem'].setValue('ts');
    await painel.atualizar();
    expect(painel.elemento.querySelector('.painel-codigo__contador')!.textContent).toContain('14 / 10.000');
  });

  it('passando do limite da mensagem o contador avisa e Inserir fica desabilitado', async () => {
    const painel = await montar({ texto: 'a'.repeat(LIMITE_TEXTO_MENSAGEM_DIRETA - 20), inicio: 0, fim: 0 });
    await painel.digitar('b'.repeat(30));
    const contador = painel.elemento.querySelector('.painel-codigo__contador')!;
    expect(contador.classList.contains('painel-codigo__contador--excedeu')).toBe(true);
    expect(contador.textContent).toContain('Passou do limite');
    expect(painel.botao('Inserir').disabled).toBe(true);

    await painel.digitar('b'.repeat(5));
    expect(painel.elemento.querySelector('.painel-codigo__contador')!.classList.contains('painel-codigo__contador--excedeu')).toBe(false);
    expect(painel.botao('Inserir').disabled).toBe(false);
  });
});
