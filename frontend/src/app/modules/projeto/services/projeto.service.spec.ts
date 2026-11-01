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
        const requisicaoSeguinte = http.expectOne((resultadoAtual) => resultadoAtual.url.endsWith('/projeto'));
        expect(requisicaoSeguinte.request.method).toBe('GET');
        expect(requisicaoSeguinte.request.params.get('status')).toBe('PAUSADO');
        expect(requisicaoSeguinte.request.params.get('pagina')).toBe('2');
        expect(requisicaoSeguinte.request.params.get('itensPorPagina')).toBe('100');
        expect(requisicaoSeguinte.request.params.get('allRows')).toBe('true');
    });

    it('listar sem filtros não manda parâmetro', () => {
        servico.listar({}).subscribe();
        expect(http.expectOne((resultado) => resultado.url.endsWith('/projeto')).request.params.keys()).toEqual([]);
    });

    it('listarVolume pede /projeto/volume com ano e mês', () => {
        servico.listarVolume({ ano: 2026, mes: 10 }).subscribe();
        const requisicaoAtual = http.expectOne((registroParcial) => registroParcial.url.endsWith('/projeto/volume'));
        expect(requisicaoAtual.request.method).toBe('GET');
        expect(requisicaoAtual.request.params.get('ano')).toBe('2026');
        expect(requisicaoAtual.request.params.get('mes')).toBe('10');
    });

    it('listarVolumeAnual pede /projeto/volume/anual com o ano', () => {
        servico.listarVolumeAnual({ ano: 2026 }).subscribe();
        const requisicao = http.expectOne((registroLocal) => registroLocal.url.endsWith('/projeto/volume/anual'));
        expect(requisicao.request.method).toBe('GET');
        expect(requisicao.request.params.get('ano')).toBe('2026');
    });

    it('criar, recuperar, alterar, excluir e restaurar usam verbo, URL e corpo certos', () => {
        const dto = { nome: 'A', codigo: 'A', cor: '#112233', status: TipoProjetoStatusEnum.ATIVO };
        servico.criar(dto).subscribe();
        expect(http.expectOne((registroSelecionado) => registroSelecionado.method === 'POST' && registroSelecionado.url.endsWith('/projeto')).request.body).toEqual(dto);

        servico.recuperar(4).subscribe();
        http.expectOne((registroPrincipal) => registroPrincipal.method === 'GET' && registroPrincipal.url.endsWith('/projeto/4'));

        servico.alterar(4, { nome: 'B' }).subscribe();
        expect(http.expectOne((registroSeguinte) => registroSeguinte.method === 'PUT' && registroSeguinte.url.endsWith('/projeto/4')).request.body).toEqual({ nome: 'B' });

        servico.excluir(4).subscribe();
        http.expectOne((registroAtual) => registroAtual.method === 'DELETE' && registroAtual.url.endsWith('/projeto/4'));

        servico.restaurar(4).subscribe();
        expect(http.expectOne((registro) => registro.method === 'PATCH' && registro.url.endsWith('/projeto/4/restaurar')).request.body).toEqual({});
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
