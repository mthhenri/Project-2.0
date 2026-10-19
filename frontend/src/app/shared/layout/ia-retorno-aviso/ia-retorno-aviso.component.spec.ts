import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { EstadoIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { IaDisponibilidadeService } from '../../../core/services/ia-disponibilidade.service';
import { IaRetornoAvisoComponent } from './ia-retorno-aviso.component';

// Task 158: quando a IA volta de uma queda, uma faixa pergunta se o usuário quer voltar ao chat.

@Component({ standalone: true, template: '' })
class ChatFalsoComponent {}

const ROTAS = [{ path: 'chat', component: ChatFalsoComponent }];

const botao = (elemento: HTMLElement, rotulo: string) =>
  Array.from(elemento.querySelectorAll('button')).find((candidato) => candidato.textContent?.includes(rotulo)) as HTMLButtonElement;

function responderEstado(montado: Awaited<ReturnType<typeof montarComponente>>, estado: EstadoIaEnum): void {
  TestBed.inject(IaDisponibilidadeService).carregar();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado });
}

describe('IaRetornoAvisoComponent', () => {
  it('sem retorno pendente a faixa não aparece', async () => {
    const montado = await montarComponente(IaRetornoAvisoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, rotas: ROTAS });
    expect(montado.elemento.textContent).not.toContain('A IA voltou');
    expect(montado.elemento.querySelector('[role="status"]')).toBeNull();
  });

  it('quando a IA volta de uma queda mostra a pergunta com "Voltar para a IA" e "Agora não"', async () => {
    const montado = await montarComponente(IaRetornoAvisoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, rotas: ROTAS });
    responderEstado(montado, EstadoIaEnum.FORA_DO_AR);
    responderEstado(montado, EstadoIaEnum.NO_AR);
    await montado.atualizar();

    expect(montado.elemento.querySelector('[role="status"]')?.textContent).toContain('A IA voltou. Quer voltar a usar o chat?');
    expect(botao(montado.elemento, 'Voltar para a IA')).toBeTruthy();
    expect(botao(montado.elemento, 'Agora não')).toBeTruthy();
  });

  it('"Voltar para a IA" leva ao chat, pede a retomada da conversa e some com a faixa', async () => {
    const montado = await montarComponente(IaRetornoAvisoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, rotas: ROTAS });
    responderEstado(montado, EstadoIaEnum.DESLIGADA);
    responderEstado(montado, EstadoIaEnum.NO_AR);
    await montado.atualizar();

    botao(montado.elemento, 'Voltar para a IA').click();
    await montado.fixture.whenStable();
    await montado.atualizar();

    const disponibilidade = TestBed.inject(IaDisponibilidadeService);
    expect(TestBed.inject(Router).url).toBe('/chat');
    expect(disponibilidade.retomadaPendente()).toBe(true);
    expect(montado.elemento.querySelector('[role="status"]')).toBeNull();
  });

  it('"Agora não" some com a faixa, mantém o modo convencional e não sai da tela', async () => {
    const montado = await montarComponente(IaRetornoAvisoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, rotas: ROTAS });
    responderEstado(montado, EstadoIaEnum.FORA_DO_AR);
    responderEstado(montado, EstadoIaEnum.NO_AR);
    await montado.atualizar();

    botao(montado.elemento, 'Agora não').click();
    await montado.atualizar();

    const disponibilidade = TestBed.inject(IaDisponibilidadeService);
    expect(disponibilidade.modoConvencional()).toBe(true);
    expect(disponibilidade.retomadaPendente()).toBe(false);
    expect(TestBed.inject(Router).url).not.toBe('/chat');
    expect(montado.elemento.querySelector('[role="status"]')).toBeNull();
  });
});
