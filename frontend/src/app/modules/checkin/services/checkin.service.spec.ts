import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../testes/http-teste';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { CheckinService } from './checkin.service';

// Check-in do desenvolvedor (SYSTEM.SPEC.md §12 "checkin"): o serviço só consulta a situação do próprio usuário; a conversa usa o ChatService.

describe('CheckinService', () => {
  let servico: CheckinService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(CheckinService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consultarSituacao é um GET em /checkin/situacao, sem corpo nem parâmetros, e devolve o envelope', () => {
    let recebido: unknown;
    servico.consultarSituacao().subscribe((resposta) => (recebido = resposta));

    const requisicao = esperarRequisicao(http, 'GET', '/checkin/situacao');
    expect(requisicao.request.params.keys()).toEqual([]);
    expect(requisicao.request.body).toBeNull();
    responderSucesso(requisicao, { haCheckin: false, disparado: false });

    expect(recebido).toMatchObject({ sucesso: true, dados: { haCheckin: false, disparado: false } });
  });

  it('a consulta cuida do próprio feedback (não liga o indicador global de carregamento)', () => {
    servico.consultarSituacao().subscribe();

    const requisicao = esperarRequisicao(http, 'GET', '/checkin/situacao');
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
    responderSucesso(requisicao, {});
  });

  it('a falha do backend chega ao assinante como erro HTTP', () => {
    let status = 0;
    servico.consultarSituacao().subscribe({ error: (erro) => (status = erro.status) });

    responderErro(esperarRequisicao(http, 'GET', '/checkin/situacao'), 500, 'falhou');

    expect(status).toBe(500);
  });
});
