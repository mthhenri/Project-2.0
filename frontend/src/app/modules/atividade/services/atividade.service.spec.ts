import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AtividadeService } from './atividade.service';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';

let servico: AtividadeService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servico = TestBed.inject(AtividadeService);
  http = TestBed.inject(HttpTestingController);
});

const pedido = (metodo: string, sufixo: string) => http.expectOne((r) => r.method === metodo && r.url.endsWith(sufixo));

describe('AtividadeService (frontend)', () => {
  it('listar monta a query com todos os filtros informados e repete o parâmetro status', () => {
    servico.listar({ demandaId: 4, usuarioId: 2, status: ['PENDENTE', 'EM_ANDAMENTO'], busca: 'x', dataInicio: '2026-01-01', dataFim: '2026-01-31', pagina: 2, itensPorPagina: 25 } as never).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/atividade'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.getAll('status')).toEqual(['PENDENTE', 'EM_ANDAMENTO']);
    expect(req.request.params.get('demandaId')).toBe('4');
    expect(req.request.params.get('usuarioId')).toBe('2');
    expect(req.request.params.get('busca')).toBe('x');
    expect(req.request.params.get('dataInicio')).toBe('2026-01-01');
    expect(req.request.params.get('dataFim')).toBe('2026-01-31');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('itensPorPagina')).toBe('25');
  });

  it('listar sem filtros não manda parâmetro e a leitura tem feedback próprio (sem overlay global)', () => {
    servico.listar({} as never).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/atividade'));
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
  });

  it('listar ignora status vazio, id zerado e busca vazia', () => {
    servico.listar({ status: [], demandaId: 0, busca: '' } as never).subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/atividade')).request.params.keys()).toEqual([]);
  });

  it('CRUD: verbo, URL e corpo certos', () => {
    servico.criar({ nome: 'N' } as never).subscribe();
    expect(pedido('POST', '/atividade').request.body).toEqual({ nome: 'N' });
    servico.recuperar(3).subscribe();
    pedido('GET', '/atividade/3');
    servico.alterar(3, { nome: 'Novo' } as never).subscribe();
    expect(pedido('PUT', '/atividade/3').request.body).toEqual({ nome: 'Novo' });
    servico.excluir(3).subscribe();
    pedido('DELETE', '/atividade/3');
    servico.restaurar(3).subscribe();
    expect(pedido('PATCH', '/atividade/3/restaurar').request.body).toEqual({});
  });

  it('tags: troca por PUT e leitura por GET em /atividade/:id/tag', () => {
    servico.alterarTags(3, { tagIds: [1, 2] } as never).subscribe();
    expect(pedido('PUT', '/atividade/3/tag').request.body).toEqual({ tagIds: [1, 2] });
    servico.listarTags(3).subscribe();
    pedido('GET', '/atividade/3/tag');
  });

  it('execução: ativa, iniciar e encerrar usam /execucao', () => {
    servico.recuperarExecucaoAtiva().subscribe();
    pedido('GET', '/execucao/ativa');
    servico.iniciarExecucao({ atividadeId: 3 } as never).subscribe();
    expect(pedido('POST', '/execucao').request.body).toEqual({ atividadeId: 3 });
    servico.encerrarExecucao(9, { descricao: 'feito' } as never).subscribe();
    expect(pedido('PATCH', '/execucao/9/encerrar').request.body).toEqual({ descricao: 'feito' });
  });

  it('listar execuções da atividade pede até 200 itens daquela atividade', () => {
    servico.listarExecucoesPorAtividade(3).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/execucao'));
    expect(req.request.params.get('atividadeId')).toBe('3');
    expect(req.request.params.get('itensPorPagina')).toBe('200');
  });
});
