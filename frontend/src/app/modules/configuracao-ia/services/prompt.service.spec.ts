import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoPromptEnum } from '@project20/shared';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { PromptService } from './prompt.service';

let http: HttpTestingController;
let servico: PromptService;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
  servico = TestBed.inject(PromptService);
});

const pedido = (metodo: string, sufixo: string) =>
  http.expectOne((r) => r.method === metodo && r.urlWithParams.endsWith(sufixo));

describe('PromptService (frontend)', () => {
  it('listarTipos faz GET em /prompt; leitura sem o scrim global', () => {
    servico.listarTipos().subscribe();
    expect(pedido('GET', '/prompt').request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
  });

  it('listarVersoes faz GET em /prompt/:tipo/versoes com 50 por página por padrão', () => {
    servico.listarVersoes(TipoPromptEnum.PAD).subscribe();
    const requisicao = pedido('GET', '/prompt/PAD/versoes?itensPorPagina=50');
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);

    servico.listarVersoes(TipoPromptEnum.CHECKIN, 5).subscribe();
    pedido('GET', '/prompt/CHECKIN/versoes?itensPorPagina=5');
  });

  it('salvarRascunho faz POST em /prompt/:tipo/rascunho com o conteúdo', () => {
    servico.salvarRascunho(TipoPromptEnum.CONVERSA, { conteudo: 'Texto novo' }).subscribe();
    const requisicao = pedido('POST', '/prompt/CONVERSA/rascunho');
    expect(requisicao.request.body).toEqual({ conteudo: 'Texto novo' });
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(false);
  });

  it('ativarRascunho faz POST em /prompt/:tipo/rascunho/ativar com corpo vazio', () => {
    servico.ativarRascunho(TipoPromptEnum.PRIORIDADE).subscribe();
    expect(pedido('POST', '/prompt/PRIORIDADE/rascunho/ativar').request.body).toEqual({});
  });

  it('restaurarPadrao faz POST em /prompt/:tipo/restaurar-padrao com corpo vazio', () => {
    servico.restaurarPadrao(TipoPromptEnum.ENTREVISTA_DEMANDA).subscribe();
    expect(pedido('POST', '/prompt/ENTREVISTA_DEMANDA/restaurar-padrao').request.body).toEqual({});
  });

  it('testar faz POST em /prompt/:tipo/testar com o texto e as narrativas; sem o scrim global (pode levar dezenas de segundos)', () => {
    servico.testar(TipoPromptEnum.CONEXAO_DEMANDA, { conteudo: 'Candidato', narrativas: ['a', 'b'] }).subscribe();
    const requisicao = pedido('POST', '/prompt/CONEXAO_DEMANDA/testar');
    expect(requisicao.request.body).toEqual({ conteudo: 'Candidato', narrativas: ['a', 'b'] });
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
  });

  it('descartarRascunho faz DELETE em /prompt/:tipo/rascunho', () => {
    servico.descartarRascunho(TipoPromptEnum.DESCRICAO_EXECUCAO).subscribe();
    pedido('DELETE', '/prompt/DESCRICAO_EXECUCAO/rascunho');
  });
});
