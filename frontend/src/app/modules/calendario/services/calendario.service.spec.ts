import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoDiaNaoUtilDuracaoEnum, TipoDiaNaoUtilEnum } from '@project20/shared';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { CalendarioService } from './calendario.service';

let http: HttpTestingController;
let servico: CalendarioService;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
  servico = TestBed.inject(CalendarioService);
});

const pedido = (metodo: string, sufixo: string) =>
  http.expectOne((r) => r.method === metodo && r.url.endsWith(sufixo));

describe('CalendarioService (frontend)', () => {
  it('listar faz GET em /calendario com feedback próprio da tela (sem o scrim global)', () => {
    servico.listar().subscribe();
    expect(pedido('GET', '/calendario').request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
  });

  it('criar faz POST em /calendario com o corpo inteiro do cadastro', () => {
    const dto = { diaData: '2026-12-25', descricao: 'Natal', tipo: TipoDiaNaoUtilEnum.FERIADO, duracao: TipoDiaNaoUtilDuracaoEnum.INTEGRAL, recorrente: true };
    servico.criar(dto).subscribe();
    const requisicao = pedido('POST', '/calendario');
    expect(requisicao.request.body).toEqual(dto);
  });

  it('recuperar faz GET em /calendario/:id', () => {
    servico.recuperar(4).subscribe();
    pedido('GET', '/calendario/4');
  });

  it('alterar faz PUT em /calendario/:id com o corpo (a data não faz parte)', () => {
    servico.alterar(4, { descricao: 'Novo', duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO }).subscribe();
    const requisicao = pedido('PUT', '/calendario/4');
    expect(requisicao.request.body).toEqual({ descricao: 'Novo', duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO });
  });

  it('excluir faz DELETE em /calendario/:id e restaurar faz PATCH em /calendario/:id/restaurar', () => {
    servico.excluir(4).subscribe();
    pedido('DELETE', '/calendario/4');
    servico.restaurar(4).subscribe();
    pedido('PATCH', '/calendario/4/restaurar');
  });

  it('verificarDiaUtil faz GET em /calendario/verificar com a data', () => {
    servico.verificarDiaUtil('2026-12-25').subscribe();
    const requisicao = pedido('GET', '/calendario/verificar');
    expect(requisicao.request.params.get('data')).toBe('2026-12-25');
  });
});
