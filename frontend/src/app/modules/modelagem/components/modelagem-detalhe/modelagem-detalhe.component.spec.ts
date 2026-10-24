import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import type { ModelagemDiagramaDto } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { ModelagemDetalheComponent } from './modelagem-detalhe.component';

const DIAGRAMA: ModelagemDiagramaDto = {
  origem: 'PostgreSQL · última migration: 0099 - Teste',
  colunasOcultas: ['created_date'],
  avisos: ['Sem grupo em tabelaGrupo: nova_tabela.'],
  grupos: [
    { id: 1, titulo: 'Domínio', rotulo: 'Domínio de teste', corIndice: 0 },
    { id: 2, titulo: 'Chat', rotulo: 'Chat de teste', corIndice: 4 },
  ],
  tabelas: [
    { nome: 'projeto', grupoId: 1, x: 0, y: 0, largura: 200, colunas: [{ nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null }] },
    {
      nome: 'demanda', grupoId: 1, x: 300, y: 0, largura: 200,
      colunas: [
        { nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null },
        { nome: 'projeto_id', tipo: 'int', marca: 'fk', tabelaReferenciada: 'projeto' },
      ],
    },
    {
      nome: 'chat', grupoId: 1, x: 0, y: 300, largura: 200,
      colunas: [
        { nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null },
        { nome: 'demanda_id', tipo: 'int?', marca: 'lg', tabelaReferenciada: 'demanda' },
      ],
    },
  ],
};

async function montar(selecionada: string | null, podeEditar = false) {
  TestBed.resetTestingModule();
  return montarComponente(ModelagemDetalheComponent, { entradas: { diagrama: DIAGRAMA, selecionada, podeEditar } });
}

describe('ModelagemDetalheComponent', () => {
  it('sem tabela escolhida mostra o resumo, a origem e os avisos da geração', async () => {
    const { elemento } = await montar(null);
    expect(elemento.textContent).toContain('PostgreSQL · última migration: 0099 - Teste');
    expect(elemento.querySelector('.modelagem-detalhe__resumo')?.textContent).toMatch(/3\s*tabelas/);
    expect(elemento.querySelector('.modelagem-detalhe__resumo')?.textContent).toMatch(/1\s*FKs/);
    expect(elemento.querySelector('[role="status"]')?.textContent).toContain('Sem grupo em tabelaGrupo: nova_tabela.');
  });

  it('com tabela escolhida lista as colunas e as relações nos dois sentidos', async () => {
    const { elemento } = await montar('demanda');
    expect(elemento.querySelector('h2')?.textContent).toContain('demanda');
    expect(elemento.textContent).toContain('Domínio de teste');
    const secoes = Array.from(elemento.querySelectorAll('h3')).map((titulo) => titulo.textContent?.trim());
    expect(secoes).toEqual(['Colunas (2)', 'Referencia (1)', 'Referenciada por (1)']);
    const relacoes = Array.from(elemento.querySelectorAll<HTMLButtonElement>('.modelagem-detalhe__relacao')).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim());
    expect(relacoes).toEqual(['projeto via projeto_id', 'chat via demanda_id (sem FK)']);
  });

  it('clicar em uma relação pede a tabela do outro lado', async () => {
    const { elemento, componente } = await montar('demanda');
    const escolhidas: string[] = [];
    componente.tabelaEscolhida.subscribe((nome) => escolhidas.push(nome));
    const botoes = elemento.querySelectorAll<HTMLButtonElement>('.modelagem-detalhe__relacao');
    botoes[0].click();
    botoes[1].click();
    expect(escolhidas).toEqual(['projeto', 'chat']);
  });

  it('tabela sem relações mostra "Nenhuma."', async () => {
    const { elemento } = await montar('projeto');
    expect(elemento.querySelectorAll('.modelagem-detalhe__vazio').length).toBe(1);
    expect(elemento.textContent).toContain('Referenciada por (1)');
  });

  it('quem só vê lê o grupo como texto, sem seletor', async () => {
    const { elemento } = await montar('demanda', false);
    expect(elemento.querySelector('p-select')).toBeNull();
    expect(elemento.textContent).toContain('Domínio de teste');
  });

  it('quem edita vê o seletor de grupo com o grupo atual; "Sem grupo" é uma das opções', async () => {
    const { elemento, componente } = await montar('demanda', true);
    expect(elemento.querySelector('p-select')).not.toBeNull();
    expect(componente.controleGrupo.value).toBe(1);
    expect(componente.opcoesDeGrupo().map((opcao) => opcao.rotulo)).toEqual(['Domínio de teste', 'Chat de teste', 'Sem grupo']);
  });

  it('trocar o grupo no seletor pede a mudança; trocar de tabela escolhida não pede nada', async () => {
    const { fixture, componente, atualizar } = await montar('demanda', true);
    const pedidos: { nome: string; grupoId: number | null }[] = [];
    componente.grupoEscolhido.subscribe((pedido) => pedidos.push(pedido));
    componente.controleGrupo.setValue(2);
    expect(pedidos).toEqual([{ nome: 'demanda', grupoId: 2 }]);
    fixture.componentRef.setInput('selecionada', 'projeto');
    await atualizar();
    expect(pedidos.length).toBe(1);
    expect(componente.controleGrupo.value).toBe(1);
  });

  it('escolher "Sem grupo" pede grupoId nulo, e a gravação que falha devolve o seletor ao grupo real', async () => {
    const { componente } = await montar('demanda', true);
    const pedidos: { nome: string; grupoId: number | null }[] = [];
    componente.grupoEscolhido.subscribe((pedido) => pedidos.push(pedido));
    componente.controleGrupo.setValue(null);
    expect(pedidos).toEqual([{ nome: 'demanda', grupoId: null }]);
    componente.redefinirGrupo();
    expect(componente.controleGrupo.value).toBe(1);
    expect(pedidos.length).toBe(1);
  });
});
