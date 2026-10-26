import { describe, it, expect } from 'vitest';
import { LIMITE_FONTES_POR_PLANO, TipoPlanoFonteOrigemEnum as Origem, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { PlanoFontesComponent } from './plano-fontes.component';

// Painel das fontes do plano (task 236, API em `/plano/:id/fonte`): lista, colar texto, anexar arquivo de texto, ver e remover.

type Montado = ComponenteMontado<PlanoFontesComponent>;

function fonte(id: number, sobrescrita: Record<string, unknown> = {}) {
  return { id, planoId: 7, titulo: `Fonte ${id}`, origem: Origem.COLADO, usuarioId: 1, usuarioNome: 'Gabi Gestora', tamanho: 20, createdDate: '2026-10-26T12:00:00.000Z', ...sobrescrita };
}

async function montar(fontes: unknown[] = []): Promise<Montado> {
  const montado = await montarComponente(PlanoFontesComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { planoId: 7 } });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/fonte'), fontes);
  await montado.atualizar();
  return montado;
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const porRotulo = (montado: Montado, rotulo: string) => montado.elemento.querySelector<HTMLButtonElement>(`button[aria-label="${rotulo}"]`);
const porTexto = (montado: Montado, rotulo: string) => Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.trim() === rotulo);
const campo = (montado: Montado, rotulo: string) => montado.elemento.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${rotulo}"]`)!;
function escrever(alvo: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  alvo.value = valor;
  alvo.dispatchEvent(new Event('input'));
}

/** Simula a escolha de um arquivo no campo de arquivo escondido. */
async function escolherArquivo(montado: Montado, arquivo: File) {
  const entrada = campo(montado, 'Arquivo de texto da fonte') as HTMLInputElement;
  Object.defineProperty(entrada, 'files', { value: [arquivo], configurable: true });
  entrada.dispatchEvent(new Event('change'));
  // `File.text()` resolve fora da fila de microtarefas do teste.
  await new Promise((resolver) => setTimeout(resolver, 20));
  await montado.atualizar();
}

describe('PlanoFontesComponent — listar', () => {
  it('sem fontes mostra o estado vazio e a contagem zero', async () => {
    const montado = await montar([]);
    expect(texto(montado)).toContain('Nenhuma fonte.');
    expect(montado.elemento.querySelector('.plano-fontes__contagem')?.textContent?.trim()).toBe('0');
  });

  it('mostra o título, quem trouxe e o tamanho de cada fonte', async () => {
    const montado = await montar([fonte(1, { titulo: 'E-mail do cliente' }), fonte(2, { titulo: 'briefing.md', origem: Origem.ARQUIVO })]);
    expect(texto(montado)).toContain('E-mail do cliente');
    expect(texto(montado)).toContain('Gabi Gestora · 20 caracteres');
    expect(montado.elemento.querySelector('.plano-fontes__contagem')?.textContent?.trim()).toBe('2');
    expect(montado.elemento.querySelector('.pi-file')).not.toBeNull();
  });

  it('recolher deixa só o trilho com a contagem, e o trilho reabre', async () => {
    const montado = await montar([fonte(1)]);
    porRotulo(montado, 'Recolher painel de fontes')!.click();
    await montado.atualizar();
    expect(texto(montado)).not.toContain('Fonte 1');
    expect(montado.elemento.querySelector('.plano-fontes--recolhido .plano-fontes__contagem')?.textContent?.trim()).toBe('1');

    porRotulo(montado, 'Expandir fontes do plano')!.click();
    await montado.atualizar();
    expect(texto(montado)).toContain('Fonte 1');
  });

  it('no teto de fontes os botões de trazer ficam desabilitados e o painel avisa', async () => {
    const montado = await montar(Array.from({ length: LIMITE_FONTES_POR_PLANO }, (_, indice) => fonte(indice + 1)));
    expect(porRotulo(montado, 'Colar texto')!.disabled).toBe(true);
    expect(porRotulo(montado, 'Anexar arquivo de texto')!.disabled).toBe(true);
    expect(texto(montado)).toContain('remova uma para trazer outra');
  });
});

describe('PlanoFontesComponent — trazer material', () => {
  it('cola o texto com o título e relê a lista', async () => {
    const montado = await montar([]);
    porRotulo(montado, 'Colar texto')!.click();
    await montado.atualizar();
    escrever(campo(montado, 'Título da fonte'), 'E-mail do cliente');
    escrever(campo(montado, 'Texto da fonte'), 'Precisamos exportar em PDF.');
    await montado.atualizar();

    porTexto(montado, 'Adicionar')!.click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/plano/7/fonte');
    expect(requisicao.request.body).toEqual({ titulo: 'E-mail do cliente', conteudo: 'Precisamos exportar em PDF.', origem: Origem.COLADO });
    responderSucesso(requisicao, { id: 1 });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/fonte'), [fonte(1, { titulo: 'E-mail do cliente' })]);
    await montado.atualizar();
    expect(texto(montado)).toContain('E-mail do cliente');
    expect(montado.elemento.querySelector('.plano-fontes__colagem')).toBeNull();
  });

  it('sem título o texto colado se chama "Texto colado"', async () => {
    const montado = await montar([]);
    porRotulo(montado, 'Colar texto')!.click();
    await montado.atualizar();
    escrever(campo(montado, 'Texto da fonte'), 'Algo');
    await montado.atualizar();
    porTexto(montado, 'Adicionar')!.click();
    expect(esperarRequisicao(montado.http, 'POST', '/plano/7/fonte').request.body.titulo).toBe('Texto colado');
  });

  it('anexa um .md lendo o texto e enviando como ARQUIVO, com o nome do arquivo como título', async () => {
    const montado = await montar([]);
    await escolherArquivo(montado, new File(['# Briefing'], 'briefing.md', { type: 'text/markdown' }));
    const requisicao = esperarRequisicao(montado.http, 'POST', '/plano/7/fonte');
    expect(requisicao.request.body).toEqual({ titulo: 'briefing.md', conteudo: '# Briefing', origem: Origem.ARQUIVO });
  });

  it('recusa arquivo que não é .txt/.md e arquivo grande, sem chamar a API', async () => {
    const montado = await montar([]);
    await escolherArquivo(montado, new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' }));
    await escolherArquivo(montado, new File(['a'.repeat(20_000)], 'enorme.txt', { type: 'text/plain' }));
    await escolherArquivo(montado, new File(['PK\u0000\u0001'], 'binario.txt', { type: 'text/plain' }));
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });
});

describe('PlanoFontesComponent — ver e remover', () => {
  it('ver traz o conteúdo e ocultar o esconde', async () => {
    const montado = await montar([fonte(1)]);
    porTexto(montado, 'Ver')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/fonte/1'), { ...fonte(1), conteudo: 'Conteúdo da fonte' });
    await montado.atualizar();
    expect(texto(montado)).toContain('Conteúdo da fonte');

    porTexto(montado, 'Ocultar')!.click();
    await montado.atualizar();
    expect(texto(montado)).not.toContain('Conteúdo da fonte');
  });

  it('remover pede confirmação, apaga e relê; "Não" desiste', async () => {
    const montado = await montar([fonte(1)]);
    porTexto(montado, 'Remover')!.click();
    await montado.atualizar();
    expect(texto(montado)).toContain('Remover esta fonte?');
    porTexto(montado, 'Não')!.click();
    await montado.atualizar();
    expect(texto(montado)).not.toContain('Remover esta fonte?');

    porTexto(montado, 'Remover')!.click();
    await montado.atualizar();
    porTexto(montado, 'Remover')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/plano/7/fonte/1'), { id: 1 });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/fonte'), []);
    await montado.atualizar();
    expect(texto(montado)).toContain('Nenhuma fonte.');
  });
});
