import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoAnotacaoEnum } from '@project20/shared';
import { ERRO_TRATADO_PELA_TELA } from '../../../core/interceptors/error-handler.interceptor';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { AnotacaoService } from './anotacao.service';

let http: HttpTestingController;
let servico: AnotacaoService;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
  servico = TestBed.inject(AnotacaoService);
});

const pedido = (metodo: string, sufixo: string) =>
  http.expectOne((r) => r.method === metodo && r.urlWithParams.endsWith(sufixo));

describe('AnotacaoService (frontend)', () => {
  it('listar faz GET em /anotacao com o usuário; o erro fica com o drawer (que sabe o que fazer)', () => {
    servico.listar(7).subscribe();
    const requisicao = pedido('GET', '/anotacao?usuarioId=7');
    expect(requisicao.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(true);
  });

  it('listar com tipos manda os códigos separados por vírgula; lista vazia não manda o filtro', () => {
    servico.listar(7, [TipoAnotacaoEnum.FEITO, TipoAnotacaoEnum.PESSOAL]).subscribe();
    expect(pedido('GET', '/anotacao?usuarioId=7&tipos=FEITO,PESSOAL').request.params.get('tipos')).toBe('FEITO,PESSOAL');

    servico.listar(7, []).subscribe();
    expect(pedido('GET', '/anotacao?usuarioId=7').request.params.has('tipos')).toBe(false);
  });

  it('alterar faz PUT em /anotacao/:usuarioId/:tipo com o texto e a versão lida', () => {
    const lida = new Date('2026-01-15T12:00:00Z');
    servico.alterar(7, TipoAnotacaoEnum.LEMBRETE, { texto: 'avisar', updatedDateLido: lida }).subscribe();
    const requisicao = pedido('PUT', '/anotacao/7/LEMBRETE');
    expect(requisicao.request.body).toEqual({ texto: 'avisar', updatedDateLido: lida });
    expect(requisicao.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(true);
    // O pad salva sozinho em segundo plano: o overlay que trava a tela toda fica de fora.
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
  });

  it('moverTrecho faz POST em /anotacao/:usuarioId/mover com as duas versões lidas', () => {
    const lida = new Date('2026-01-15T12:00:00Z');
    const dto = {
      tipoOrigem: TipoAnotacaoEnum.EM_ANDAMENTO, tipoDestino: TipoAnotacaoEnum.PENDENCIA,
      trecho: 'Validar senha.', updatedDateOrigemLido: lida, updatedDateDestinoLido: lida,
    };
    servico.moverTrecho(7, dto).subscribe();
    const requisicao = pedido('POST', '/anotacao/7/mover');
    expect(requisicao.request.body).toEqual(dto);
    expect(requisicao.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(true);
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
  });
});
