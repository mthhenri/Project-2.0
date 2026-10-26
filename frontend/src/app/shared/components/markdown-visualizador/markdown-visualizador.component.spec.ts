import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { montarComponente } from '../../../../testes/montar-componente';
import { MarkdownVisualizadorComponent } from './markdown-visualizador.component';

// O visualizador cria elementos nativos a partir da árvore do interpretador: nada do texto chega à página como HTML
// (CONVENTIONS.md "Texto rico"). O interpretador em si é testado no `shared`; aqui, o que o template faz com cada nó.

async function renderizar(texto: string | null | undefined) {
  return montarComponente(MarkdownVisualizadorComponent, { entradas: { texto } });
}

describe('MarkdownVisualizadorComponent', () => {
  it.each([['vazio', ''], ['nulo', null], ['indefinido', undefined]])('texto %s não renderiza nada', async (_descricao, vazio) => {
    const montado = await renderizar(vazio);
    expect(montado.elemento.querySelector('.markdown')).toBeNull();
  });

  it('herdaCor liga o modificador que deixa o texto herdar a cor do entorno (só quando pedido)', async () => {
    const padrao = await renderizar('texto');
    expect(padrao.elemento.querySelector('.markdown--herda-cor')).toBeNull();
    TestBed.resetTestingModule();
    const herdando = await montarComponente(MarkdownVisualizadorComponent, { entradas: { texto: 'texto', herdaCor: true } });
    expect(herdando.elemento.querySelector('.markdown--herda-cor')).not.toBeNull();
  });

  it('títulos viram h1 a h4 e níveis acima de 4 caem no h4', async () => {
    const montado = await renderizar('# Um\n\n## Dois\n\n### Três\n\n#### Quatro');
    expect(montado.elemento.querySelector('h1')?.textContent).toContain('Um');
    expect(montado.elemento.querySelector('h2')?.textContent).toContain('Dois');
    expect(montado.elemento.querySelector('h3')?.textContent).toContain('Três');
    expect(montado.elemento.querySelector('h4')?.textContent).toContain('Quatro');
  });

  it('parágrafo com negrito, itálico, tachado e código em linha usa os elementos nativos', async () => {
    const montado = await renderizar('Texto **forte** e *enfático* e ~~riscado~~ e `código`.');
    expect(montado.elemento.querySelector('p strong')?.textContent).toBe('forte');
    expect(montado.elemento.querySelector('p em')?.textContent).toBe('enfático');
    expect(montado.elemento.querySelector('p del')?.textContent).toBe('riscado');
    expect(montado.elemento.querySelector('p code')?.textContent).toBe('código');
  });

  it('listas com marcador, numeradas e de tarefas (caixa desabilitada com rótulo acessível)', async () => {
    const montado = await renderizar('- a\n- b\n\n3. c\n4. d\n\n- [x] feita\n- [ ] pendente');
    expect(montado.elemento.querySelectorAll('ul').length).toBeGreaterThanOrEqual(1);
    const numerada = montado.elemento.querySelector('ol');
    expect(numerada?.getAttribute('start')).toBe('3');

    const feita = montado.elemento.querySelector<HTMLInputElement>('input[aria-label="Tarefa concluída"]');
    const pendente = montado.elemento.querySelector<HTMLInputElement>('input[aria-label="Tarefa pendente"]');
    expect(feita?.checked).toBe(true);
    expect(feita?.disabled).toBe(true);
    expect(pendente?.checked).toBe(false);
  });

  it('citação, bloco de código e régua viram blockquote, pre>code e hr', async () => {
    const montado = await renderizar('> citado\n\n```\nconst x = 1;\n```\n\n---');
    expect(montado.elemento.querySelector('blockquote')?.textContent).toContain('citado');
    expect(montado.elemento.querySelector('pre code')?.textContent).toContain('const x = 1;');
    expect(montado.elemento.querySelector('hr')).not.toBeNull();
  });

  it('link abre em outra aba com rel seguro', async () => {
    const montado = await renderizar('Veja [o site](https://exemplo.com/pagina).');
    const link = montado.elemento.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://exemplo.com/pagina');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link?.textContent).toBe('o site');
  });

  it('HTML perigoso no texto aparece como texto e nunca vira elemento', async () => {
    const montado = await renderizar('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<b>negrito html</b>');
    expect(montado.elemento.querySelector('script')).toBeNull();
    expect(montado.elemento.querySelector('img')).toBeNull();
    expect(montado.elemento.querySelector('b')).toBeNull();
    expect(montado.elemento.textContent).toContain('<script>alert(1)</script>');
    expect(montado.elemento.textContent).toContain('<b>negrito html</b>');
  });

  it('link com esquema javascript: não vira link clicável executável', async () => {
    const montado = await renderizar('[clique](javascript:alert(1))');
    const href = montado.elemento.querySelector('a')?.getAttribute('href') ?? '';
    expect(href.toLowerCase()).not.toContain('javascript:');
  });

  it('trocar o texto de entrada re-renderiza o conteúdo', async () => {
    const montado = await renderizar('# Antes');
    montado.fixture.componentRef.setInput('texto', '## Depois');
    await montado.atualizar();
    expect(montado.elemento.querySelector('h1')).toBeNull();
    expect(montado.elemento.querySelector('h2')?.textContent).toContain('Depois');
  });

  it('destaca só as menções e referências conhecidas, em elemento nativo', async () => {
    const montado = await montarComponente(MarkdownVisualizadorComponent, {
      entradas: { texto: '@Gabriel Zimmermann teste #Relatório novo', destaques: ['@Gabriel Zimmermann', '#Relatório novo'] },
    });
    const destaques = Array.from(montado.elemento.querySelectorAll('.markdown__destaque')).map((el) => el.textContent);
    expect(destaques).toEqual(['@Gabriel Zimmermann', '#Relatório novo']);
    expect(montado.elemento.querySelector('p')?.textContent).toBe('@Gabriel Zimmermann teste #Relatório novo');
  });

  it('sem destaques informados nada ganha destaque', async () => {
    const montado = await renderizar('@Gabriel Zimmermann teste');
    expect(montado.elemento.querySelector('.markdown__destaque')).toBeNull();
  });
});
