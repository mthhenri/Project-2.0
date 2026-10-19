import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExecucaoAtivaService } from './execucao-ativa.service';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../testes/http-teste';

let servico: ExecucaoAtivaService;
let http: HttpTestingController;

const ativa = { id: 9, atividadeId: 4 } as never;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servico = TestBed.inject(ExecucaoAtivaService);
  http = TestBed.inject(HttpTestingController);
});

describe('ExecucaoAtivaService (frontend)', () => {
  it('começa sem execução ativa, sem carga em andamento e sem pausas do chip', () => {
    expect(servico.ativa()).toBeNull();
    expect(servico.primeiraCarga()).toBe(false);
    expect(servico.pausasDoChip()).toBe(0);
  });

  it('carregar busca GET /execucao/ativa e guarda a execução devolvida', () => {
    servico.carregar();
    const requisicao = esperarRequisicao(http, 'GET', '/execucao/ativa');
    expect(servico.primeiraCarga()).toBe(true);
    responderSucesso(requisicao, ativa);
    expect(servico.ativa()).toEqual(ativa);
    expect(servico.primeiraCarga()).toBe(false);
  });

  it('carregar com dados nulos deixa a execução ativa vazia', () => {
    servico.definir(ativa);
    servico.carregar();
    responderSucesso(esperarRequisicao(http, 'GET', '/execucao/ativa'), null);
    expect(servico.ativa()).toBeNull();
  });

  it('carregar com sucesso falso zera a execução ativa', () => {
    servico.definir(ativa);
    servico.carregar();
    esperarRequisicao(http, 'GET', '/execucao/ativa').flush({ sucesso: false, dados: ativa, mensagem: 'x' });
    expect(servico.ativa()).toBeNull();
  });

  it('carregar com erro mantém a execução anterior e solta o indicador de carga', () => {
    servico.definir(ativa);
    servico.carregar();
    responderErro(esperarRequisicao(http, 'GET', '/execucao/ativa'), 500, 'falha');
    expect(servico.ativa()).toEqual(ativa);
    expect(servico.primeiraCarga()).toBe(false);
  });

  it('só a primeira carga é "primeiraCarga"; as seguintes são silenciosas', () => {
    servico.carregar();
    responderSucesso(esperarRequisicao(http, 'GET', '/execucao/ativa'), ativa);
    servico.carregar();
    expect(servico.primeiraCarga()).toBe(false);
    responderSucesso(esperarRequisicao(http, 'GET', '/execucao/ativa'), null);
  });

  it('depois de um erro na primeira carga, a tentativa seguinte ainda é primeiraCarga', () => {
    servico.carregar();
    responderErro(esperarRequisicao(http, 'GET', '/execucao/ativa'), 500, 'falha');
    servico.carregar();
    expect(servico.primeiraCarga()).toBe(true);
    http.match(() => true);
  });

  it('definir troca a execução ativa na hora (atualização otimista) e aceita null', () => {
    servico.definir(ativa);
    expect(servico.ativa()).toEqual(ativa);
    servico.definir(null);
    expect(servico.ativa()).toBeNull();
  });

  it('registrarPausaDoChip incrementa o contador a cada pausa', () => {
    servico.registrarPausaDoChip();
    servico.registrarPausaDoChip();
    expect(servico.pausasDoChip()).toBe(2);
  });

  it('limpar zera a execução e volta a tratar a próxima carga como primeira', () => {
    servico.carregar();
    responderSucesso(esperarRequisicao(http, 'GET', '/execucao/ativa'), ativa);
    servico.limpar();
    expect(servico.ativa()).toBeNull();
    servico.carregar();
    expect(servico.primeiraCarga()).toBe(true);
    http.match(() => true);
  });
});
