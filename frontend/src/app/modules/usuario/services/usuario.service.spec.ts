import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoUsuarioEnum } from '@project20/shared';
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
        servico.listar({ tipo: TipoUsuarioEnum.GESTOR, ativo: true, busca: 'ana', pagina: 2, itensPorPagina: 10, allRows: true }).subscribe();
        const requisicao = http.expectOne((resultado) => resultado.url.endsWith('/usuario'));      expect(requisicao.request.method).toBe('GET');      expect(requisicao.request.params.get('tipo')).toBe('GESTOR');      expect(requisicao.request.params.get('ativo')).toBe('true');      expect(requisicao.request.params.get('busca')).toBe('ana');      expect(requisicao.request.params.get('pagina')).toBe('2');      expect(requisicao.request.params.get('itensPorPagina')).toBe('10');      expect(requisicao.request.params.get('allRows')).toBe('true');
    });

    it('listar sem filtros não manda parâmetro nenhum', () => {
        servico.listar({}).subscribe();
        expect(http.expectOne((registroParcial) => registroParcial.url.endsWith('/usuario')).request.params.keys()).toEqual([]);
    });

    it('criar, recuperar, alterar, excluir, restaurar e alterarSenha usam verbo, URL e corpo certos', () => {
        servico.criar({ login: 'a', senhaNaoEncriptada: 'b', nomeCompleto: 'c', cargoTitulo: 'd', tipo: TipoUsuarioEnum.GESTOR, horasDiariasNecessarias: 8 }).subscribe();
        expect(http.expectOne((registroLocal) => registroLocal.method === 'POST' && registroLocal.url.endsWith('/usuario')).request.body.login).toBe('a');

        servico.recuperar(5).subscribe();
        http.expectOne((registroSelecionado) => registroSelecionado.method === 'GET' && registroSelecionado.url.endsWith('/usuario/5'));

        servico.alterar(5, { nomeCompleto: 'Novo' }).subscribe();
        expect(http.expectOne((registroPrincipal) => registroPrincipal.method === 'PUT' && registroPrincipal.url.endsWith('/usuario/5')).request.body).toEqual({ nomeCompleto: 'Novo' });

        servico.excluir(5).subscribe();
        http.expectOne((registroSeguinte) => registroSeguinte.method === 'DELETE' && registroSeguinte.url.endsWith('/usuario/5'));

        servico.restaurar(5).subscribe();
        expect(http.expectOne((registroAtual) => registroAtual.method === 'PATCH' && registroAtual.url.endsWith('/usuario/5/restaurar')).request.body).toEqual({});

        servico.alterarSenha(5, { senhaNova: 'Nova#12345' }).subscribe();
        expect(http.expectOne((registro) => registro.method === 'PATCH' && registro.url.endsWith('/usuario/5/senha')).request.body).toEqual({ senhaNova: 'Nova#12345' });
    });
});
