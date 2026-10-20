import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { ERRO_TRATADO_PELA_TELA } from '../../../core/interceptors/error-handler.interceptor';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { PropostaIaService } from './proposta-ia.service';

// Resolução das propostas da IA: verbo, URL e corpo de cada chamada (só as próprias propostas do usuário, no backend).

describe('PropostaIaService', () => {
  let servico: PropostaIaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(PropostaIaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recuperarPorId é um GET em /proposta-ia/:id', () => {
    servico.recuperarPorId(5).subscribe();
    responderSucesso(esperarRequisicao(http, 'GET', '/proposta-ia/5'), {});
  });

  it('confirmar é um POST em /proposta-ia/:id/confirmar com corpo vazio', () => {
    servico.confirmar(5).subscribe();
    const requisicao = esperarRequisicao(http, 'POST', '/proposta-ia/5/confirmar');
    expect(requisicao.request.body).toEqual({});
    responderSucesso(requisicao, {});
  });

  it('ajustar é um POST em /proposta-ia/:id/ajustar levando os dados corrigidos', () => {
    servico.ajustar(5, { dados: { nome: 'Novo nome' } }).subscribe();
    const requisicao = esperarRequisicao(http, 'POST', '/proposta-ia/5/ajustar');
    expect(requisicao.request.body).toEqual({ dados: { nome: 'Novo nome' } });
    responderSucesso(requisicao, {});
  });

  it('recusar e desfazer são POST nos seus caminhos, com corpo vazio', () => {
    servico.recusar(5).subscribe();
    const recusa = esperarRequisicao(http, 'POST', '/proposta-ia/5/recusar');
    expect(recusa.request.body).toEqual({});
    responderSucesso(recusa, {});

    servico.desfazer(5).subscribe();
    const desfeito = esperarRequisicao(http, 'POST', '/proposta-ia/5/desfazer');
    expect(desfeito.request.body).toEqual({});
    responderSucesso(desfeito, {});
  });

  it('confirmar, ajustar, recusar e desfazer não ligam o overlay global (o cartão esmaece sozinho) e deixam o erro para o cartão', () => {
    servico.confirmar(5).subscribe();
    servico.ajustar(5, { dados: {} }).subscribe();
    servico.recusar(5).subscribe();
    servico.desfazer(5).subscribe();
    for (const caminho of ['confirmar', 'ajustar', 'recusar', 'desfazer']) {
      const requisicao = esperarRequisicao(http, 'POST', `/proposta-ia/5/${caminho}`);
      expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
      expect(requisicao.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(true);
      responderSucesso(requisicao, {});
    }
  });
});
