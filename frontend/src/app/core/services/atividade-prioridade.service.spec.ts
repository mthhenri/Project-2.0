import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoAtividadePrioridadeEnum } from '@project20/shared';
import { AtividadePrioridadeService } from './atividade-prioridade.service';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../testes/http-teste';

let servico: AtividadePrioridadeService;
let http: HttpTestingController;

const alta = { codigo: TipoAtividadePrioridadeEnum.ALTA, cor: '#ff0000' } as never;
const baixa = { codigo: TipoAtividadePrioridadeEnum.BAIXA, cor: '#00ff00' } as never;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servico = TestBed.inject(AtividadePrioridadeService);
  http = TestBed.inject(HttpTestingController);
});

describe('AtividadePrioridadeService (frontend)', () => {
  it('carregar busca uma vez só e guarda a lista no sinal', () => {
    servico.carregar();
    responderSucesso(esperarRequisicao(http, 'GET', '/atividade-prioridade'), [alta, baixa]);
    expect(servico.prioridades()).toEqual([alta, baixa]);
    servico.carregar();
    http.expectNone((r) => r.url.endsWith('/atividade-prioridade'));
  });

  it('depois de um erro, carregar tenta de novo', () => {
    servico.carregar();
    responderErro(esperarRequisicao(http, 'GET', '/atividade-prioridade'), 500, 'falhou');
    expect(servico.prioridades()).toEqual([]);
    servico.carregar();
    responderSucesso(esperarRequisicao(http, 'GET', '/atividade-prioridade'), [alta]);
    expect(servico.prioridades()).toEqual([alta]);
  });

  it('carregar com forçar busca de novo mesmo já carregada', () => {
    servico.carregar();
    responderSucesso(esperarRequisicao(http, 'GET', '/atividade-prioridade'), [alta]);
    servico.carregar(true);
    responderSucesso(esperarRequisicao(http, 'GET', '/atividade-prioridade'), [alta, baixa]);
    expect(servico.prioridades().length).toBe(2);
  });

  it('alterarCor faz PATCH no código e troca só a prioridade alterada no cache', () => {
    servico.prioridades.set([alta, baixa]);
    servico.alterarCor(TipoAtividadePrioridadeEnum.ALTA, { cor: '#123456' } as never).subscribe();
    const req = esperarRequisicao(http, 'PATCH', '/atividade-prioridade/ALTA');
    expect(req.request.body).toEqual({ cor: '#123456' });
    responderSucesso(req, { codigo: TipoAtividadePrioridadeEnum.ALTA, cor: '#123456' });
    expect(servico.prioridades()).toEqual([{ codigo: 'ALTA', cor: '#123456' }, baixa]);
  });
});
