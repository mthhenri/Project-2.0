import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { EstadoIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { SidebarComponent } from './sidebar.component';

// Barra lateral (SYSTEM.SPEC.md §8, navegação por tipo de usuário): o desenvolvedor vê os itens dele, o gestor os de gestão e só o
// administrador vê "IA". Com a IA no ar, "Atividades" (que o chat substitui) fica desabilitada; sem ela, o "Chat" ganha o selo de
// proibido. O atalho `g` + letra navega (task 96). A barra entra recolhida em tela estreita e lembra a escolha.

@Component({ standalone: true, template: '' })
class PaginaFalsaComponent {}

const ROTAS = ['/ponto', '/calendario', '/projeto', '/demanda', '/chat', '/atividade', '/execucao', '/tag', '/usuario', '/configuracao-ia']
  .map((caminho) => ({ path: caminho.slice(1), component: PaginaFalsaComponent }));

const ITENS_DESENVOLVEDOR = ['Ponto', 'Demandas', 'Chat', 'Atividades', 'Execuções'];
const ITENS_GESTOR = ['Ponto', 'Calendário', 'Projetos', 'Demandas', 'Chat', 'Atividades', 'Execuções', 'Tags', 'Usuários'];
const ITENS_ADMINISTRADOR = [...ITENS_GESTOR, 'IA'];

type Montado = ComponenteMontado<SidebarComponent>;

/** O `setInterval` de 60 s da barra é tarefa pendente do zone.js: temporizadores simulados desde o início. */
async function montarBarra(usuario: TipoUsuarioEnum, ia: EstadoIaEnum | null = null, armazenamento?: Record<string, string>): Promise<Montado> {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  const montado = await montarComponente(SidebarComponent, { usuario, rotas: ROTAS, armazenamento });
  if (ia) {
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: ia });
    await montado.atualizar();
  }
  return montado;
}

const rotulosNavegacao = (montado: Montado) =>
  Array.from(montado.elemento.querySelectorAll('nav [aria-label]')).map((item) => (item.getAttribute('aria-label') ?? '').replace(/ \(.*\)$/, ''));
const item = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLElement>('nav [aria-label]')).find((candidato) => (candidato.getAttribute('aria-label') ?? '').startsWith(rotulo));
const alternar = (montado: Montado) =>
  montado.elemento.querySelector<HTMLButtonElement>('button[aria-label="Recolher barra lateral"], button[aria-label="Expandir barra lateral"]')!;

function teclar(tecla: string, alvo: EventTarget = document.body, init: KeyboardEventInit = {}): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true, ...init });
  alvo.dispatchEvent(evento);
  return evento;
}

afterEach(() => vi.useRealTimers());

describe('SidebarComponent — itens por tipo de usuário', () => {
  it('desenvolvedor vê só Ponto, Demandas, Chat, Atividades e Execuções', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(rotulosNavegacao(montado)).toEqual(ITENS_DESENVOLVEDOR);
  });

  it('gestor vê também Calendário, Projetos, Tags e Usuários, mas não a IA', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.GESTOR);
    expect(rotulosNavegacao(montado)).toEqual(ITENS_GESTOR);
    expect(item(montado, 'IA')).toBeUndefined();
  });

  it('administrador vê todos os itens, inclusive a IA', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.ADMINISTRADOR);
    expect(rotulosNavegacao(montado)).toEqual(ITENS_ADMINISTRADOR);
  });

  it('cada item leva à rota certa', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.ADMINISTRADOR);
    expect(item(montado, 'Projetos')?.getAttribute('href')).toBe('/projeto');
    expect(item(montado, 'Execuções')?.getAttribute('href')).toBe('/execucao');
    expect(item(montado, 'IA')?.getAttribute('href')).toBe('/configuracao-ia');
  });
});

describe('SidebarComponent — IA e telas substituídas pelo chat', () => {
  it('ao abrir confere o estado da IA e repete a conferência a cada 60 s', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, EstadoIaEnum.NO_AR);
    vi.advanceTimersByTime(60_000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
  });

  it('com a IA no ar "Atividades" segue com link e todos os itens ficam ativos', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, EstadoIaEnum.NO_AR);
    const atividades = item(montado, 'Atividades')!;
    expect(atividades.getAttribute('aria-disabled')).toBeNull();
    expect(atividades.getAttribute('href')).toBe('/atividade');
    expect(item(montado, 'Execuções')?.getAttribute('href')).toBe('/execucao');
    expect(item(montado, 'Chat')?.getAttribute('href')).toBe('/chat');
  });

  it('com a IA desligada "Atividades" volta e o "Chat" ganha o selo de proibido', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, EstadoIaEnum.DESLIGADA);
    expect(item(montado, 'Atividades')?.getAttribute('href')).toBe('/atividade');
    expect(item(montado, 'Chat')?.querySelector('.pi-ban')).not.toBeNull();
  });

  it('com a IA fora do ar "Atividades" volta e o "Chat" ganha o selo de proibido', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, EstadoIaEnum.FORA_DO_AR);
    expect(item(montado, 'Atividades')?.getAttribute('href')).toBe('/atividade');
    expect(item(montado, 'Chat')?.querySelector('.pi-ban')).not.toBeNull();
  });

  it('com a IA no ar o "Chat" não tem selo de proibido', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, EstadoIaEnum.NO_AR);
    expect(item(montado, 'Chat')?.querySelector('.pi-ban')).toBeNull();
  });

  it('antes da primeira resposta da IA nada fica desabilitado nem marcado', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(item(montado, 'Atividades')?.getAttribute('href')).toBe('/atividade');
    expect(item(montado, 'Chat')?.querySelector('.pi-ban')).toBeNull();
  });
});

describe('SidebarComponent — recolher e expandir', () => {
  it('em tela estreita (menos de 1280 px) entra recolhida, sem rótulos de texto', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(alternar(montado).getAttribute('aria-label')).toBe('Expandir barra lateral');
    expect(montado.elemento.querySelector('.sidebar__rotulo')).toBeNull();
  });

  it('a escolha salva vence a largura da tela: expandida mostra os rótulos', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, null, { 'sidebar.recolhida': 'false' });
    expect(alternar(montado).getAttribute('aria-label')).toBe('Recolher barra lateral');
    expect(montado.elemento.querySelector('nav')?.textContent).toContain('Demandas');
  });

  it('alternar troca o estado e grava a escolha no navegador', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, null, { 'sidebar.recolhida': 'false' });
    alternar(montado).click();
    await montado.atualizar();

    expect(localStorage.getItem('sidebar.recolhida')).toBe('true');
    expect(alternar(montado).getAttribute('aria-label')).toBe('Expandir barra lateral');
    expect(alternar(montado).getAttribute('aria-expanded')).toBe('false');

    alternar(montado).click();
    await montado.atualizar();
    expect(localStorage.getItem('sidebar.recolhida')).toBe('false');
  });
});

describe('SidebarComponent — atalho g + letra (task 96)', () => {
  it('"g" seguido da letra do item navega até ele', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR);
    teclar('g');
    const segunda = teclar('d');
    await montado.fixture.whenStable();

    expect(segunda.defaultPrevented).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/demanda');
  });

  it('letra de um item que o usuário não vê (desenvolvedor + "t" de Tags) não navega', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR);
    teclar('g');
    teclar('t');
    await montado.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('gestor chega a Tags com "g" + "t"', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.GESTOR);
    teclar('g');
    teclar('t');
    await montado.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/tag');
  });

  it('a sequência expira em 1,5 s: a segunda tecla depois disso é ignorada', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR);
    teclar('g');
    vi.advanceTimersByTime(1500);
    teclar('d');
    await montado.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('com o foco num campo de texto o atalho fica quieto', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR);
    const campo = document.createElement('input');
    document.body.appendChild(campo);
    teclar('g', campo);
    teclar('d', campo);
    await montado.fixture.whenStable();
    campo.remove();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('com Ctrl pressionado o atalho não dispara', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR);
    teclar('g', document.body, { ctrlKey: true });
    teclar('d');
    await montado.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
