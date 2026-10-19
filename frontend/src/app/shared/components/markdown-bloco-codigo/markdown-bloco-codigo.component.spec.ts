import { afterEach, describe, it, expect, vi } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { MarkdownBlocoCodigoComponent, TEMPO_DO_COPIADO_MS } from './markdown-bloco-codigo.component';

// Bloco de código do Markdown (task 189): cabeçalho com a linguagem e o botão Copiar, realce só com linguagem conhecida, e o código
// sempre como texto (nada do conteúdo vira HTML).

const CODIGO = 'function soma(a, b) {\n\treturn a + b; // soma\n}\n';

function instalarAreaDeTransferencia(escrever: (texto: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
}

async function montar(linguagem: string | null, valor = CODIGO) {
  const montado = await montarComponente(MarkdownBlocoCodigoComponent, { entradas: { linguagem, valor } });
  return montado;
}

/** O realce chega por `import()` e promessas: espera o componente terminar de carregar e redesenha. */
async function esperarRealce(montado: Awaited<ReturnType<typeof montar>>) {
  await vi.waitFor(() => expect(montado.componente.trechos()).not.toBeNull(), { timeout: 5000 });
  await montado.atualizar();
}

const botao = (montado: Awaited<ReturnType<typeof montar>>) => montado.elemento.querySelector<HTMLButtonElement>('p-button button')!;
const codigoNaTela = (montado: Awaited<ReturnType<typeof montar>>) => montado.elemento.querySelector('pre code')!;

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('MarkdownBlocoCodigoComponent', () => {
  it('sem linguagem: só o código, sem rótulo no cabeçalho, e o botão de copiar continua', async () => {
    const montado = await montar(null);
    expect(codigoNaTela(montado).textContent).toBe(CODIGO);
    expect(montado.elemento.querySelector('.bloco-codigo__linguagem')?.textContent?.trim()).toBe('');
    expect(botao(montado)).not.toBeNull();
    expect(montado.elemento.querySelector('[class*="bloco-codigo__token"]')).toBeNull();
  });

  it('linguagem desconhecida mostra o que veio na cerca, sem realce e sem baixar o tokenizador', async () => {
    const montado = await montar('cobol');
    expect(montado.elemento.querySelector('.bloco-codigo__linguagem')?.textContent?.trim()).toBe('cobol');
    expect(montado.componente.trechos()).toBeNull();
    expect(codigoNaTela(montado).textContent).toBe(CODIGO);
    expect(montado.elemento.querySelector('[class*="bloco-codigo__token"]')).toBeNull();
  });

  it('linguagem conhecida mostra o rótulo, realça com spans por tipo e o texto continua idêntico', async () => {
    const montado = await montar('ts');
    await esperarRealce(montado);
    expect(montado.elemento.querySelector('.bloco-codigo__linguagem')?.textContent?.trim()).toBe('TypeScript');
    expect(montado.elemento.querySelector('.bloco-codigo__token--keyword')?.textContent).toBe('function');
    expect(montado.elemento.querySelector('.bloco-codigo__token--comment')?.textContent).toBe('// soma');
    expect(codigoNaTela(montado).textContent).toBe(CODIGO);
  });

  it('troca a linguagem sem recarregar: o realce acompanha a entrada', async () => {
    const montado = await montar('ts');
    await esperarRealce(montado);
    montado.fixture.componentRef.setInput('linguagem', 'cobol');
    await montado.atualizar();
    expect(montado.componente.trechos()).toBeNull();
    expect(montado.elemento.querySelector('[class*="bloco-codigo__token"]')).toBeNull();
    expect(codigoNaTela(montado).textContent).toBe(CODIGO);
  });

  it.each([[null], ['html']])('texto com <b>, ** e & aparece literal (linguagem %s)', async (linguagem) => {
    const perigoso = '<b>**forte**</b> &amp; <script>alert(1)</script>';
    const montado = await montar(linguagem, perigoso);
    if (linguagem) await esperarRealce(montado);
    expect(codigoNaTela(montado).textContent).toBe(perigoso);
    expect(montado.elemento.querySelector('pre b, pre script')).toBeNull();
  });

  it('copiar entrega o texto exato, com recuo e quebras de linha', async () => {
    const escrito: string[] = [];
    instalarAreaDeTransferencia(async (texto) => { escrito.push(texto); });
    const montado = await montar(null);
    botao(montado).click();
    await montado.atualizar();
    expect(escrito).toEqual([CODIGO]);
  });

  it('copiar mostra "Copiado" e volta a "Copiar" depois de alguns segundos', async () => {
    instalarAreaDeTransferencia(async () => undefined);
    const montado = await montar(null);
    expect(botao(montado).textContent).toContain('Copiar');
    vi.useFakeTimers();
    botao(montado).click();
    await vi.advanceTimersByTimeAsync(0);
    await montado.atualizar();
    expect(botao(montado).textContent).toContain('Copiado');
    expect(botao(montado).getAttribute('aria-label')).toBe('Código copiado');
    await vi.advanceTimersByTimeAsync(TEMPO_DO_COPIADO_MS);
    await montado.atualizar();
    expect(botao(montado).textContent).toContain('Copiar');
    expect(botao(montado).textContent).not.toContain('Copiado');
    expect(botao(montado).getAttribute('aria-label')).toBe('Copiar o código');
  });

  it('falha da área de transferência mostra o aviso e não troca para "Copiado"', async () => {
    instalarAreaDeTransferencia(async () => { throw new Error('bloqueada'); });
    const montado = await montar(null);
    const avisos: unknown[] = [];
    const original = montado.mensagens.add.bind(montado.mensagens);
    montado.mensagens.add = (mensagem) => { avisos.push(mensagem); original(mensagem); };
    botao(montado).click();
    await montado.atualizar();
    expect(avisos).toEqual([expect.objectContaining({ severity: 'warn', detail: 'Não foi possível copiar o código' })]);
    expect(botao(montado).textContent).toContain('Copiar');
    expect(botao(montado).textContent).not.toContain('Copiado');
  });

  it('o botão é focável e tem rótulo acessível', async () => {
    const montado = await montar(null);
    expect(botao(montado).getAttribute('aria-label')).toBe('Copiar o código');
    expect(botao(montado).disabled).toBe(false);
    expect(botao(montado).tabIndex).toBeGreaterThanOrEqual(0);
  });
});
