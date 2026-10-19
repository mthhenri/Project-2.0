import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { UsuarioService } from './usuario.service';

let servico: UsuarioService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servico = TestBed.inject(UsuarioService);
  http = TestBed.inject(HttpTestingController);
});

describe('UsuarioService (frontend)', () => {
  it('listar monta a query só com os filtros informados', () => {
    servico.listar({ tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO, busca: 'ana', pagina: 2, itensPorPagina: 10, allRows: true }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/usuario'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('tipo')).toBe('GESTOR');
    expect(req.request.params.get('status')).toBe('ATIVO');
    expect(req.request.params.get('busca')).toBe('ana');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('itensPorPagina')).toBe('10');
    expect(req.request.params.get('allRows')).toBe('true');
  });

  it('listar sem filtros não manda parâmetro nenhum', () => {
    servico.listar({}).subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/usuario')).request.params.keys()).toEqual([]);
  });

  it('criar, recuperar, alterar, excluir, restaurar e alterarSenha usam verbo, URL e corpo certos', () => {
    servico.criar({ login: 'a', senhaNaoEncriptada: 'b', nomeCompleto: 'c', cargoTitulo: 'd', tipo: TipoUsuarioEnum.GESTOR, horasDiariasNecessarias: 8 }).subscribe();
    expect(http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/usuario')).request.body.login).toBe('a');

    servico.recuperar(5).subscribe();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/usuario/5'));

    servico.alterar(5, { nomeCompleto: 'Novo' }).subscribe();
    expect(http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/usuario/5')).request.body).toEqual({ nomeCompleto: 'Novo' });

    servico.excluir(5).subscribe();
    http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/usuario/5'));

    servico.restaurar(5).subscribe();
    expect(http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/usuario/5/restaurar')).request.body).toEqual({});

    servico.alterarSenha(5, { senhaNova: 'Nova#12345' }).subscribe();
    expect(http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/usuario/5/senha')).request.body).toEqual({ senhaNova: 'Nova#12345' });
  });
});
