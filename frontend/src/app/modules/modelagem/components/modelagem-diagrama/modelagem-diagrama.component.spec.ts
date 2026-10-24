import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import type { ModelagemDiagramaDto } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { ModelagemDiagramaComponent } from './modelagem-diagrama.component';

const DIAGRAMA: ModelagemDiagramaDto = {
  origem: 'teste',
  colunasOcultas: [],
  avisos: [],
  grupos: [
    { id: 1, titulo: 'Domínio', rotulo: 'Domínio', corIndice: 0 },
    { id: 2, titulo: 'Chat', rotulo: 'Chat', corIndice: 4 },
  ],
  tabelas: [
    { nome: 'projeto', grupoId: 1, x: 0, y: 0, largura: 200, colunas: [{ nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null }, { nome: 'nome', tipo: 'varchar', marca: '', tabelaReferenciada: null }] },
    {
      nome: 'demanda', grupoId: 1, x: 400, y: 0, largura: 200,
      colunas: [
        { nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null },
        { nome: 'projeto_id', tipo: 'int', marca: 'fk', tabelaReferenciada: 'projeto' },
      ],
    },
    {
      nome: 'chat_mensagem', grupoId: 2, x: 400, y: 400, largura: 220,
      colunas: [
        { nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null },
        { nome: 'demanda_id', tipo: 'int?', marca: 'lg', tabelaReferenciada: 'demanda' },
      ],
    },
  ],
};

async function montar(extras: Record<string, unknown> = {}) {
  TestBed.resetTestingModule();
  return montarComponente(ModelagemDiagramaComponent, {
    entradas: { diagrama: DIAGRAMA, gruposVisiveis: new Set([0, 1, 2]), ...extras },
  });
}

const tabelas = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll<SVGGElement>('.modelagem-diagrama__tabela'));
const nomes = (elemento: HTMLElement) => tabelas(elemento).map((tabela) => tabela.querySelector('.modelagem-diagrama__tabela-nome')?.textContent);
const ponteiro = (tipo: string, clienteX = 0, clienteY = 0) => new MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: clienteX, clientY: clienteY });
const clicarSemArrastar = (alvo: Element) => {
  alvo.dispatchEvent(ponteiro('pointerdown'));
  alvo.dispatchEvent(ponteiro('pointerup'));
};
const arrastar = (alvo: Element, deslocamentoX: number, deslocamentoY: number) => {
  alvo.dispatchEvent(ponteiro('pointerdown', 10, 10));
  alvo.dispatchEvent(ponteiro('pointermove', 10 + deslocamentoX, 10 + deslocamentoY));
  alvo.dispatchEvent(ponteiro('pointerup', 10 + deslocamentoX, 10 + deslocamentoY));
};

describe('ModelagemDiagramaComponent', () => {
  it('desenha uma caixa por tabela, uma ligação por referência e as marcas PK, FK e sem FK', async () => {
    const { elemento } = await montar();
    expect(nomes(elemento)).toEqual(['projeto', 'demanda', 'chat_mensagem']);
    expect(elemento.querySelectorAll('.modelagem-diagrama__ligacao').length).toBe(2);
    expect(elemento.querySelectorAll('.modelagem-diagrama__ligacao--logica').length).toBe(1);
    const marcas = Array.from(elemento.querySelectorAll('.modelagem-diagrama__tabela .modelagem-diagrama__marca')).map((marca) => marca.textContent?.trim());
    expect(marcas).toEqual(['PK', 'PK', 'FK', 'PK', '··']);
    expect(elemento.querySelectorAll('.modelagem-diagrama__grupo').length).toBe(2);
  });

  it('esconder um grupo tira as tabelas dele, a caixa e as ligações que chegam a ele', async () => {
    const { elemento } = await montar({ gruposVisiveis: new Set([1]) });
    expect(nomes(elemento)).toEqual(['projeto', 'demanda']);
    expect(elemento.querySelectorAll('.modelagem-diagrama__grupo').length).toBe(1);
    expect(elemento.querySelectorAll('.modelagem-diagrama__ligacao').length).toBe(1);
  });

  it('clicar em uma tabela a seleciona e apaga as que não são vizinhas; clicar de novo desfaz', async () => {
    const { elemento, componente, atualizar } = await montar();
    const alvo = tabelas(elemento)[0];
    alvo.dispatchEvent(ponteiro('pointerdown'));
    alvo.dispatchEvent(ponteiro('pointerup'));
    await atualizar();
    expect(componente.selecionada()).toBe('projeto');
    const apagadas = tabelas(elemento).filter((tabela) => tabela.classList.contains('modelagem-diagrama__tabela--apagada')).map((tabela) => tabela.getAttribute('aria-label'));
    expect(apagadas).toEqual(['Tabela chat_mensagem']);

    alvo.dispatchEvent(ponteiro('pointerdown'));
    alvo.dispatchEvent(ponteiro('pointerup'));
    await atualizar();
    expect(componente.selecionada()).toBeNull();
  });

  it('passar o mouse destaca as ligações da tabela e sair devolve tudo', async () => {
    const { elemento, atualizar } = await montar();
    const demanda = tabelas(elemento)[1];
    demanda.dispatchEvent(new Event('pointerenter'));
    await atualizar();
    expect(elemento.querySelectorAll('.modelagem-diagrama__ligacao--foco').length).toBe(2);
    demanda.dispatchEvent(new Event('pointerleave'));
    await atualizar();
    expect(elemento.querySelectorAll('.modelagem-diagrama__ligacao--foco').length).toBe(0);
  });

  it('arrastar uma tabela a move (e não a seleciona); as ligações acompanham', async () => {
    const { elemento, componente, atualizar } = await montar();
    const alvo = tabelas(elemento)[0];
    const caminhoAntes = elemento.querySelector('.modelagem-diagrama__linha')?.getAttribute('d');
    alvo.dispatchEvent(ponteiro('pointerdown', 10, 10));
    alvo.dispatchEvent(ponteiro('pointermove', 60, 40));
    alvo.dispatchEvent(ponteiro('pointerup', 60, 40));
    await atualizar();
    // O deslocamento do mouse (50, 30 px) vale 1/escala no desenho: a vista abre enquadrada, não em 100%.
    const escala = componente.camera().escala;
    expect(alvo.getAttribute('transform')).toBe(`translate(${Math.round(50 / escala)},${Math.round(30 / escala)})`);
    expect(componente.selecionada()).toBeNull();
    expect(elemento.querySelector('.modelagem-diagrama__linha')?.getAttribute('d')).not.toBe(caminhoAntes);
  });

  it('"Restaurar posições" devolve a tabela ao lugar do arquivo', async () => {
    const { elemento, componente, atualizar } = await montar();
    const alvo = tabelas(elemento)[0];
    alvo.dispatchEvent(ponteiro('pointerdown', 10, 10));
    alvo.dispatchEvent(ponteiro('pointermove', 60, 40));
    alvo.dispatchEvent(ponteiro('pointerup', 60, 40));
    componente.restaurarPosicoes();
    await atualizar();
    expect(alvo.getAttribute('transform')).toBe('translate(0,0)');
  });

  it('a busca apaga as tabelas sem o termo e realça a coluna encontrada', async () => {
    const { elemento } = await montar({ busca: 'projeto_id' });
    const apagadas = tabelas(elemento).filter((tabela) => tabela.classList.contains('modelagem-diagrama__tabela--apagada')).length;
    expect(apagadas).toBe(2);
    expect(elemento.querySelectorAll('.modelagem-diagrama__linha-achada').length).toBe(1);
  });

  it('tabela tem rótulo e responde ao teclado (Enter seleciona)', async () => {
    const { elemento, componente, atualizar } = await montar();
    const alvo = tabelas(elemento)[2];
    expect(alvo.getAttribute('aria-label')).toBe('Tabela chat_mensagem');
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await atualizar();
    expect(componente.selecionada()).toBe('chat_mensagem');
  });

  it('a tabela sem grupo ganha a caixa "Sem grupo", com a cor reservada', async () => {
    const semGrupo: ModelagemDiagramaDto = { ...DIAGRAMA, tabelas: [...DIAGRAMA.tabelas, { nome: 'solta', grupoId: null, x: 800, y: 0, largura: 200, colunas: [DIAGRAMA.tabelas[0].colunas[0]] }] };
    const { elemento } = await montar({ diagrama: semGrupo });
    const titulos = Array.from(elemento.querySelectorAll('.modelagem-diagrama__grupo-titulo')).map((titulo) => titulo.textContent?.trim());
    expect(titulos).toEqual(['Domínio', 'Chat', 'Sem grupo']);
    const solta = tabelas(elemento).find((tabela) => tabela.getAttribute('aria-label') === 'Tabela solta')!;
    expect(solta.classList.contains('modelagem-diagrama--cor-7')).toBe(true);
  });

  it('a cor da tabela é a do grupo (corIndice), não a posição do grupo na lista', async () => {
    const { elemento } = await montar();
    const chat = tabelas(elemento).find((tabela) => tabela.getAttribute('aria-label') === 'Tabela chat_mensagem')!;
    expect(chat.classList.contains('modelagem-diagrama--cor-4')).toBe(true);
  });

  it('quem edita grava a posição ao soltar a tabela arrastada; clicar sem arrastar não grava', async () => {
    const { elemento, componente, atualizar } = await montar({ podeEditar: true });
    const salvas: { nome: string; x: number; y: number }[] = [];
    componente.posicaoSalva.subscribe((posicao) => salvas.push(posicao));
    const alvo = tabelas(elemento)[0];
    clicarSemArrastar(alvo);
    expect(salvas).toEqual([]);
    arrastar(alvo, 50, 30);
    await atualizar();
    const escala = componente.camera().escala;
    expect(salvas).toEqual([{ nome: 'projeto', x: Math.round(50 / escala), y: Math.round(30 / escala) }]);
  });

  it('quem só vê arrasta a tabela na própria vista, sem gravar nada', async () => {
    const { elemento, componente, atualizar } = await montar({ podeEditar: false });
    const salvas: unknown[] = [];
    componente.posicaoSalva.subscribe((posicao) => salvas.push(posicao));
    arrastar(tabelas(elemento)[0], 50, 30);
    await atualizar();
    expect(salvas).toEqual([]);
    expect(tabelas(elemento)[0].getAttribute('transform')).not.toBe('translate(0,0)');
  });

  it('descartarPosicao devolve a tabela ao lugar do diagrama (a gravação falhou)', async () => {
    const { elemento, componente, atualizar } = await montar({ podeEditar: true });
    arrastar(tabelas(elemento)[0], 50, 30);
    componente.descartarPosicao('projeto');
    await atualizar();
    expect(tabelas(elemento)[0].getAttribute('transform')).toBe('translate(0,0)');
  });

  it('quando a posição chega gravada no diagrama, o deslocamento local sai de cena e o diagrama manda', async () => {
    const { elemento, fixture, atualizar } = await montar({ podeEditar: true });
    arrastar(tabelas(elemento)[0], 50, 30);
    await atualizar();
    const escala = fixture.componentInstance.camera().escala;
    const x = Math.round(50 / escala);
    const y = Math.round(30 / escala);
    fixture.componentRef.setInput('diagrama', { ...DIAGRAMA, tabelas: DIAGRAMA.tabelas.map((tabela) => (tabela.nome === 'projeto' ? { ...tabela, x, y } : tabela)) });
    await atualizar();
    fixture.componentRef.setInput('diagrama', { ...DIAGRAMA, tabelas: DIAGRAMA.tabelas.map((tabela) => (tabela.nome === 'projeto' ? { ...tabela, x: 7, y: 9 } : tabela)) });
    await atualizar();
    expect(tabelas(elemento)[0].getAttribute('transform')).toBe('translate(7,9)');
  });

  it('os botões flutuantes têm o fundo sempre opaco (classe própria, sem depender do hover)', async () => {
    const { elemento } = await montar();
    const botoes = elemento.querySelectorAll('.modelagem-diagrama__controles button.modelagem-diagrama__botao');
    expect(botoes.length).toBe(5);
  });
});
