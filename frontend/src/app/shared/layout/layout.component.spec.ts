import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { EstadoIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../testes/montar-componente';
import { responderSucesso } from '../../../testes/http-teste';
import { carregamento } from '../../core/signals/carregamento.signal';
import { DesfazerService } from '../../core/services/desfazer.service';
import { LayoutComponent } from './layout.component';

// Casca autenticada: barra lateral, topbar, aviso de retorno da IA, área da rota, janelinha do check-in, spinner global e toasts.

@Component({ standalone: true, template: '<h1>Página de teste</h1>' })
class PaginaFalsaComponent {}

type Montado = ComponenteMontado<LayoutComponent>;

/** Monta o layout e responde as leituras de abertura (IA, execução ativa, situação do check-in). */
async function montarLayout(usuario = TipoUsuarioEnum.DESENVOLVEDOR): Promise<Montado> {
  // A janelinha do check-in carrega a página num `@defer`: os metadados precisam estar resolvidos antes de criar o componente.
  TestBed.configureTestingModule({ imports: [LayoutComponent] });
  await TestBed.compileComponents();
  // Sidebar (60 s), janelinha (20 s) e topbar (minuto seguinte) deixam temporizadores pendentes: simulados desde o início.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  const montado = await montarComponente(LayoutComponent, { usuario, rotas: [{ path: 'pagina', component: PaginaFalsaComponent }] });
  await TestBed.inject(Router).navigateByUrl('/pagina');
  await responderAbertura(montado);
  return montado;
}

async function responderAbertura(montado: Montado): Promise<void> {
  for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/ia/disponibilidade'))) responderSucesso(pedido, { estado: EstadoIaEnum.DESLIGADA });
  for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/execucao/ativa'))) responderSucesso(pedido, null);
  for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/checkin/situacao'))) pedido.flush({ sucesso: false, dados: null, mensagem: '' });
  await montado.atualizar();
}

afterEach(() => {
  carregamento.set(false);
  TestBed.inject(DesfazerService).dispensarSemEncerrar();
  vi.useRealTimers();
});

describe('LayoutComponent', () => {
  it('compõe a barra lateral, a topbar e a área da rota ativa', async () => {
    const montado = await montarLayout();
    expect(montado.elemento.querySelector('aside nav[aria-label="Navegação principal"]')).not.toBeNull();
    expect(montado.elemento.querySelector('header.topbar')).not.toBeNull();
    expect(montado.elemento.querySelector('main h1')?.textContent).toBe('Página de teste');
  });

  it('a página roteada fica dentro de <main>, não na barra nem na topbar', async () => {
    const montado = await montarLayout();
    const pagina = montado.elemento.querySelector('h1')!;
    expect(pagina.closest('main')).not.toBeNull();
    expect(pagina.closest('aside')).toBeNull();
    expect(pagina.closest('header')).toBeNull();
  });

  it('a barra lateral do desenvolvedor não tem "Usuários"', async () => {
    const montado = await montarLayout(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(montado.elemento.querySelector('nav [aria-label="Usuários"]')).toBeNull();
  });

  it('a barra lateral do gestor tem "Usuários"', async () => {
    const montado = await montarLayout(TipoUsuarioEnum.GESTOR);
    expect(montado.elemento.querySelector('nav [aria-label="Usuários"]')).not.toBeNull();
  });

  it('o spinner global só aparece enquanto há carregamento', async () => {
    const montado = await montarLayout();
    expect(montado.elemento.querySelector('.loading-spinner')).toBeNull();

    carregamento.set(true);
    await montado.atualizar();
    expect(montado.elemento.querySelector('.loading-spinner')).not.toBeNull();

    carregamento.set(false);
    await montado.atualizar();
    expect(montado.elemento.querySelector('.loading-spinner')).toBeNull();
  });

  it('o toast de desfazer aparece no layout quando uma tela oferece "Desfazer"', async () => {
    const montado = await montarLayout();
    TestBed.inject(DesfazerService).oferecer({ mensagem: 'Projeto excluído', desfazer: () => of(null) });
    montado.fixture.detectChanges();
    expect(montado.elemento.querySelector('[role="status"]')?.textContent).toContain('Projeto excluído');
  });
});
