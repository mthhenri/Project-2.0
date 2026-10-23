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
    { id: 'dom', titulo: 'Domínio', rotulo: 'Domínio' },
    { id: 'chat', titulo: 'Chat', rotulo: 'Chat' },
  ],
  tabelas: [
    { nome: 'projeto', grupo: 'dom', x: 0, y: 0, largura: 200, colunas: [{ nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null }, { nome: 'nome', tipo: 'varchar', marca: '', tabelaReferenciada: null }] },
    {
      nome: 'demanda', grupo: 'dom', x: 400, y: 0, largura: 200,
      colunas: [
        { nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null },
        { nome: 'projeto_id', tipo: 'int', marca: 'fk', tabelaReferenciada: 'projeto' },
      ],
    },
    {
      nome: 'chat_mensagem', grupo: 'chat', x: 400, y: 400, largura: 220,
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
    entradas: { diagrama: DIAGRAMA, gruposVisiveis: new Set(['dom', 'chat']), ...extras },
  });
}

const tabelas = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll<SVGGElement>('.modelagem-diagrama__tabela'));
const nomes = (elemento: HTMLElement) => tabelas(elemento).map((tabela) => tabela.querySelector('.modelagem-diagrama__tabela-nome')?.textContent);
const ponteiro = (tipo: string, clienteX = 0, clienteY = 0) => new MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: clienteX, clientY: clienteY });

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
    const { elemento } = await montar({ gruposVisiveis: new Set(['dom']) });
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
});
