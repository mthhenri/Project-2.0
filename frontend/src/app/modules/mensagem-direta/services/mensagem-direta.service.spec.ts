import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { ERRO_TRATADO_PELA_TELA } from '../../../core/interceptors/error-handler.interceptor';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { MensagemDiretaService } from './mensagem-direta.service';

// Chat entre colaboradores (task 210), a parte HTTP: verbo, URL, corpo e query de cada chamada. O popup mostra os próprios erros e estados de carga,
// por isso nenhuma chamada aciona o overlay global nem o aviso global de erro.

describe('MensagemDiretaService', () => {
  let servico: MensagemDiretaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(MensagemDiretaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listarConversas é um GET em /mensagem-direta/conversas', () => {
    servico.listarConversas().subscribe();
    responderSucesso(esperarRequisicao(http, 'GET', '/mensagem-direta/conversas'), { conversas: [] });
  });

  it('listarConversa é um GET em /conversa/:usuarioId, com o cursor só quando há', () => {
    servico.listarConversa(9).subscribe();
    const primeira = esperarRequisicao(http, 'GET', '/mensagem-direta/conversa/9');
    expect(primeira.request.params.has('cursor')).toBe(false);
    responderSucesso(primeira, {});

    servico.listarConversa(9, 'abc').subscribe();
    const segunda = esperarRequisicao(http, 'GET', '/mensagem-direta/conversa/9');
    expect(segunda.request.params.get('cursor')).toBe('abc');
    responderSucesso(segunda, {});
  });

  it('enviarMensagem é um POST em /mensagem com o corpo do envio', () => {
    servico.enviarMensagem({ destinatarioId: 9, mensagemId: 'uuid', texto: 'oi' }).subscribe();
    const requisicao = esperarRequisicao(http, 'POST', '/mensagem-direta/mensagem');
    expect(requisicao.request.body).toEqual({ destinatarioId: 9, mensagemId: 'uuid', texto: 'oi' });
    responderSucesso(requisicao, {});
  });

  it('alterarLeitura é um PUT em /conversa/:usuarioId/leitura com a data em ISO', () => {
    servico.alterarLeitura(9, new Date('2026-10-21T14:05:11.482Z')).subscribe();
    const requisicao = esperarRequisicao(http, 'PUT', '/mensagem-direta/conversa/9/leitura');
    expect(requisicao.request.body).toEqual({ lidaAteDate: '2026-10-21T14:05:11.482Z' });
    responderSucesso(requisicao, {});
  });

  it('avisarDigitacao é um POST em /conversa/:usuarioId/digitando', () => {
    servico.avisarDigitacao(9).subscribe();
    responderSucesso(esperarRequisicao(http, 'POST', '/mensagem-direta/conversa/9/digitando'), null);
  });

  it('buscar é um GET em /busca com o texto na query', () => {
    servico.buscar('filtro de tags').subscribe();
    const requisicao = esperarRequisicao(http, 'GET', '/mensagem-direta/busca');
    expect(requisicao.request.params.get('texto')).toBe('filtro de tags');
    responderSucesso(requisicao, { mensagens: [] });
  });

  it('listarPessoas é um GET em /pessoas', () => {
    servico.listarPessoas().subscribe();
    responderSucesso(esperarRequisicao(http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [] });
  });

  it('nenhuma chamada aciona o overlay global nem o aviso global de erro', () => {
    servico.listarConversas().subscribe();
    servico.enviarMensagem({ destinatarioId: 1, mensagemId: 'x', texto: 'y' }).subscribe();
    for (const requisicao of http.match(() => true)) {
      expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
      expect(requisicao.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(true);
      responderSucesso(requisicao, {});
    }
  });
});
