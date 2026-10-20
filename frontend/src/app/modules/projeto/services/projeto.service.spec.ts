import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoProjetoStatusEnum } from '@project20/shared';
import { ProjetoService } from './projeto.service';
import { gerarCodigoDoNome } from '../models/projeto.model';

let servico: ProjetoService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servico = TestBed.inject(ProjetoService);
  http = TestBed.inject(HttpTestingController);
});

describe('ProjetoService (frontend)', () => {
  it('listar monta a query só com o que foi informado', () => {
    servico.listar({ status: TipoProjetoStatusEnum.PAUSADO, pagina: 2, itensPorPagina: 100, allRows: true }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/projeto'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('PAUSADO');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('itensPorPagina')).toBe('100');
    expect(req.request.params.get('allRows')).toBe('true');
  });

  it('listar sem filtros não manda parâmetro', () => {
    servico.listar({}).subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/projeto')).request.params.keys()).toEqual([]);
  });

  it('listarVolume pede /projeto/volume com ano e mês', () => {
    servico.listarVolume({ ano: 2026, mes: 10 }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/projeto/volume'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('ano')).toBe('2026');
    expect(req.request.params.get('mes')).toBe('10');
  });

  it('criar, recuperar, alterar, excluir e restaurar usam verbo, URL e corpo certos', () => {
    const dto = { nome: 'A', codigo: 'A', cor: '#112233', status: TipoProjetoStatusEnum.ATIVO };
    servico.criar(dto).subscribe();
    expect(http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/projeto')).request.body).toEqual(dto);

    servico.recuperar(4).subscribe();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/projeto/4'));

    servico.alterar(4, { nome: 'B' }).subscribe();
    expect(http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/projeto/4')).request.body).toEqual({ nome: 'B' });

    servico.excluir(4).subscribe();
    http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/projeto/4'));

    servico.restaurar(4).subscribe();
    expect(http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/projeto/4/restaurar')).request.body).toEqual({});
  });
});

describe('gerarCodigoDoNome', () => {
  it('maiúsculas, sem acento, símbolos viram hífen', () => {
    expect(gerarCodigoDoNome('Sistema de Gestão')).toBe('SISTEMA-DE-GESTAO');
    expect(gerarCodigoDoNome('  App #1 (beta) ')).toBe('APP-1-BETA');
  });

  it('vazio ou só símbolos viram vazio', () => {
    expect(gerarCodigoDoNome('')).toBe('');
    expect(gerarCodigoDoNome('!!! ???')).toBe('');
  });

  it('respeita o limite de 50 caracteres sem deixar hífen na ponta', () => {
    const codigo = gerarCodigoDoNome('palavra '.repeat(20));
    expect(codigo.length).toBeLessThanOrEqual(50);
    expect(codigo.endsWith('-')).toBe(false);
  });
});
