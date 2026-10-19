import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RelatorioFormatoEnum, RelatorioPeriodoTipoEnum } from '@project20/shared';
import { RelatorioService } from './relatorio.service';

let http: HttpTestingController;
let servico: RelatorioService;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
  servico = TestBed.inject(RelatorioService);
});

const MENSAL = { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano: 2026, mes: 10 };
const ANUAL = { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.ANUAL, ano: 2026 };
const CUSTOM = { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, dataInicio: '2026-09-01', dataFim: '2026-09-15' };

describe('RelatorioService (frontend)', () => {
  it('gerarRelatorio faz GET em /relatorio/execucao com projeto, tipo, ano e mês', () => {
    servico.gerarRelatorio(MENSAL).subscribe();
    const requisicao = http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/relatorio/execucao'));
    expect(requisicao.request.params.get('projetoId')).toBe('3');
    expect(requisicao.request.params.get('periodoTipo')).toBe('MENSAL');
    expect(requisicao.request.params.get('ano')).toBe('2026');
    expect(requisicao.request.params.get('mes')).toBe('10');
    expect(requisicao.request.params.has('dataInicio')).toBe(false);
  });

  it('gerarRelatorio anual só manda o ano; personalizado só manda o intervalo', () => {
    servico.gerarRelatorio(ANUAL).subscribe();
    const anual = http.expectOne((r) => r.url.endsWith('/relatorio/execucao'));
    expect(anual.request.params.keys().sort()).toEqual(['ano', 'periodoTipo', 'projetoId']);

    servico.gerarRelatorio(CUSTOM).subscribe();
    const personalizado = http.expectOne((r) => r.url.endsWith('/relatorio/execucao'));
    expect(personalizado.request.params.keys().sort()).toEqual(['dataFim', 'dataInicio', 'periodoTipo', 'projetoId']);
    expect(personalizado.request.params.get('dataInicio')).toBe('2026-09-01');
  });

  it('baixarRelatorio faz GET em /relatorio/execucao/download pedindo o blob com o formato, e devolve a resposta inteira (cabeçalhos)', () => {
    servico.baixarRelatorio(MENSAL, RelatorioFormatoEnum.CSV).subscribe();
    const requisicao = http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/relatorio/execucao/download'));
    expect(requisicao.request.params.get('formato')).toBe('CSV');
    expect(requisicao.request.params.get('projetoId')).toBe('3');
    expect(requisicao.request.responseType).toBe('blob');
  });

  it('revisarRelatorio faz POST em /relatorio/execucao/revisar com o projeto na query e o período no corpo', () => {
    servico.revisarRelatorio(MENSAL).subscribe();
    const requisicao = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/relatorio/execucao/revisar'));
    expect(requisicao.request.params.get('projetoId')).toBe('3');
    expect(requisicao.request.params.keys()).toEqual(['projetoId']);
    expect(requisicao.request.body).toEqual({ periodoTipo: 'MENSAL', ano: 2026, mes: 10 });
  });

  it('o corpo da revisão personalizada leva só o intervalo', () => {
    servico.revisarRelatorio(CUSTOM).subscribe();
    const requisicao = http.expectOne((r) => r.url.endsWith('/relatorio/execucao/revisar'));
    expect(requisicao.request.body).toEqual({ periodoTipo: 'CUSTOM', dataInicio: '2026-09-01', dataFim: '2026-09-15' });
  });
});
