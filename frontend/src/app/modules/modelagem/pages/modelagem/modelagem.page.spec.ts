import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ModelagemColunaDto, ModelagemDiagramaDto, ModelagemTabelaDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ModelagemPage } from './modelagem.page';

const pk: ModelagemColunaDto = { nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null };
const simples = (nome: string): ModelagemColunaDto => ({ nome, tipo: 'varchar', marca: '', tabelaReferenciada: null });
const fk = (nome: string, tabela: string): ModelagemColunaDto => ({ nome, tipo: 'int', marca: 'fk', tabelaReferenciada: tabela });
const tabela = (nome: string, grupo: string, x: number, colunas: ModelagemColunaDto[]): ModelagemTabelaDto => ({ nome, grupo, x, y: 0, largura: 220, colunas });

const DIAGRAMA: ModelagemDiagramaDto = {
  origem: 'PostgreSQL · última migration: 0099 - Teste',
  colunasOcultas: ['created_date'],
  avisos: [],
  grupos: [
    { id: 'dom', titulo: 'Domínio', rotulo: 'Domínio' },
    { id: 'usr', titulo: 'Usuários', rotulo: 'Usuários' },
  ],
  tabelas: [
    tabela('demanda', 'dom', 0, [pk, simples('nome')]),
    tabela('atividade', 'dom', 400, [pk, fk('demanda_id', 'demanda'), fk('usuario_id', 'usuario')]),
    tabela('execucao', 'dom', 800, [pk, fk('atividade_id', 'atividade')]),
    tabela('usuario', 'usr', 1200, [pk, simples('login'), simples('senha_encriptada')]),
  ],
};

// A tela busca o diagrama no backend: o teste responde a requisição com o diagrama de teste.
async function montar(usuario = TipoUsuarioEnum.DESENVOLVEDOR, diagrama: ModelagemDiagramaDto | null = DIAGRAMA) {
  TestBed.resetTestingModule();
  const montado = await montarComponente(ModelagemPage, { usuario });
  const requisicao = esperarRequisicao(montado.http, 'GET', '/modelagem');
  if (diagrama) responderSucesso(requisicao, diagrama);
  else responderErro(requisicao, 500, 'Falha');
  await montado.atualizar();
  return montado;
}

const tabelas = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll<SVGGElement>('.modelagem-diagrama__tabela'));
const nome = (tabelaSvg: SVGGElement) => tabelaSvg.getAttribute('aria-label')?.replace('Tabela ', '');
const clicar = (alvo: Element) => {
  alvo.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
  alvo.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0 }));
};

describe('ModelagemPage', () => {
  it('mostra o carregando até o diagrama chegar', async () => {
    TestBed.resetTestingModule();
    const montado = await montarComponente(ModelagemPage, { usuario: TipoUsuarioEnum.GESTOR });
    expect(montado.elemento.textContent).toContain('Carregando o diagrama');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/modelagem'), DIAGRAMA);
    await montado.atualizar();
    expect(montado.elemento.textContent).not.toContain('Carregando o diagrama');
  });

  it('mostra o diagrama inteiro, com o total de tabelas, para qualquer tipo de usuário', async () => {
    for (const usuario of [TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR]) {
      const { elemento } = await montar(usuario);
      expect(elemento.querySelector('h1')?.textContent).toContain('Modelagem do banco');
      expect(elemento.querySelector('.modelagem__contador')?.textContent).toContain('4 tabelas');
      expect(tabelas(elemento).map(nome)).toEqual(['demanda', 'atividade', 'execucao', 'usuario']);
    }
  });

  it('tem um botão de filtro por grupo e o painel de resumo no começo', async () => {
    const { elemento } = await montar();
    expect(Array.from(elemento.querySelectorAll('.modelagem__grupo')).map((botao) => botao.textContent?.trim())).toEqual(['Domínio', 'Usuários']);
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('Banco de dados');
    expect(elemento.textContent).toContain('0099 - Teste');
  });

  it('desligar um grupo some com as tabelas dele; ligar de novo devolve', async () => {
    const { elemento, atualizar } = await montar();
    const botao = elemento.querySelector<HTMLButtonElement>('.modelagem__grupo')!;
    botao.click();
    await atualizar();
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(tabelas(elemento).map(nome)).toEqual(['usuario']);
    botao.click();
    await atualizar();
    expect(tabelas(elemento).length).toBe(4);
  });

  it('clicar em uma tabela abre as colunas e as relações dela no painel', async () => {
    const { elemento, atualizar } = await montar();
    clicar(tabelas(elemento).find((candidata) => nome(candidata) === 'atividade')!);
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('atividade');
    const relacoes = Array.from(elemento.querySelectorAll('.modelagem-detalhe__relacao')).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim());
    expect(relacoes).toEqual(['demanda via demanda_id', 'usuario via usuario_id', 'execucao via atividade_id']);
  });

  it('escolher uma relação no painel passa para a outra tabela', async () => {
    const { elemento, atualizar } = await montar();
    clicar(tabelas(elemento).find((candidata) => nome(candidata) === 'atividade')!);
    await atualizar();
    const paraDemanda = Array.from(elemento.querySelectorAll<HTMLButtonElement>('.modelagem-detalhe__relacao')).find((botao) => botao.textContent?.includes('demanda via demanda_id'))!;
    paraDemanda.click();
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('demanda');
  });

  it('a busca apaga as tabelas sem o termo e Enter escolhe a primeira que casa', async () => {
    const { elemento, atualizar } = await montar();
    const campo = elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar tabela ou coluna"]')!;
    campo.value = 'senha_encriptada';
    campo.dispatchEvent(new Event('input'));
    await atualizar();
    const claras = tabelas(elemento).filter((candidata) => !candidata.classList.contains('modelagem-diagrama__tabela--apagada'));
    expect(claras.map(nome)).toEqual(['usuario']);
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('usuario');
  });

  it('Esc limpa a busca', async () => {
    const { elemento, atualizar } = await montar();
    const campo = elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar tabela ou coluna"]')!;
    campo.value = 'usuario';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await atualizar();
    expect(campo.value).toBe('');
  });

  it('com falha ao buscar o diagrama mostra o erro e "Tentar de novo" busca outra vez', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR, null);
    expect(montado.elemento.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar o diagrama');
    const botao = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.includes('Tentar de novo'))!;
    botao.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/modelagem'), DIAGRAMA);
    await montado.atualizar();
    expect(tabelas(montado.elemento).length).toBe(4);
  });
});
