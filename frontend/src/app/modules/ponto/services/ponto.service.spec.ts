import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PontoService } from './ponto.service';
import { PontoJustificativaService } from './ponto-justificativa.service';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';

let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
});

const pedido = (metodo: string, sufixo: string) =>
  http.expectOne((r) => r.method === metodo && r.url.endsWith(sufixo));

describe('PontoService (frontend)', () => {
  it('consultarDiario faz GET em /ponto/diario com a data e, se houver, o usuário', () => {
    TestBed.inject(PontoService).consultarDiario({ data: '2026-03-02', usuarioId: 4 }).subscribe();
    const requisicao = pedido('GET', '/ponto/diario');
    expect(requisicao.request.params.get('data')).toBe('2026-03-02');
    expect(requisicao.request.params.get('usuarioId')).toBe('4');
  });

  it('consultarDiario sem usuário não manda usuarioId (o servidor usa o do token)', () => {
    TestBed.inject(PontoService).consultarDiario({ data: '2026-03-02' }).subscribe();
    expect(pedido('GET', '/ponto/diario').request.params.has('usuarioId')).toBe(false);
  });

  it('consultarTodos faz GET em /ponto/todos só com a data', () => {
    TestBed.inject(PontoService).consultarTodos('2026-03-02').subscribe();
    const requisicao = pedido('GET', '/ponto/todos');
    expect(requisicao.request.params.get('data')).toBe('2026-03-02');
    expect(requisicao.request.params.keys()).toEqual(['data']);
  });

  it('consultarMensal faz GET em /ponto/mensal com ano e mês, e usuário só quando informado', () => {
    const servico = TestBed.inject(PontoService);
    servico.consultarMensal({ ano: 2026, mes: 3 }).subscribe();
    const sem = pedido('GET', '/ponto/mensal');
    expect(sem.request.params.get('ano')).toBe('2026');
    expect(sem.request.params.get('mes')).toBe('3');
    expect(sem.request.params.has('usuarioId')).toBe(false);

    servico.consultarMensal({ ano: 2026, mes: 3, usuarioId: 9 }).subscribe();
    expect(pedido('GET', '/ponto/mensal').request.params.get('usuarioId')).toBe('9');
  });

  it('as três consultas têm feedback próprio: não acionam o overlay global de carregamento', () => {
    const servico = TestBed.inject(PontoService);
    servico.consultarDiario({ data: '2026-03-02' }).subscribe();
    servico.consultarTodos('2026-03-02').subscribe();
    servico.consultarMensal({ ano: 2026, mes: 3 }).subscribe();
    for (const requisicao of http.match(() => true)) {
      expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
    }
  });
});

describe('PontoJustificativaService (frontend)', () => {
  it('criar faz POST em /ponto-justificativa com o DTO no corpo', () => {
    const dto = { usuarioId: 3, diaData: '2026-03-02', nome: 'Consulta', descricao: 'Médica', horasCobertas: 4 };
    TestBed.inject(PontoJustificativaService).criar(dto).subscribe();
    const requisicao = pedido('POST', '/ponto-justificativa');
    expect(requisicao.request.body).toEqual(dto);
  });

  it('listar faz GET com usuário, ano e mês', () => {
    TestBed.inject(PontoJustificativaService).listar(3, 2026, 3).subscribe();
    const requisicao = pedido('GET', '/ponto-justificativa');
    expect(requisicao.request.params.get('usuarioId')).toBe('3');
    expect(requisicao.request.params.get('ano')).toBe('2026');
    expect(requisicao.request.params.get('mes')).toBe('3');
  });

  it('excluir faz DELETE em /ponto-justificativa/:id', () => {
    TestBed.inject(PontoJustificativaService).excluir(8).subscribe();
    pedido('DELETE', '/ponto-justificativa/8');
  });
});
