import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExecucaoService } from './execucao.service';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';

let servico: ExecucaoService;
let http: HttpTestingController;

beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(ExecucaoService);
    http = TestBed.inject(HttpTestingController);
});

const pedido = (metodo: string, sufixo: string) =>
    http.expectOne((registroLocal) => registroLocal.method === metodo && registroLocal.url.endsWith(sufixo));

describe('ExecucaoService (frontend)', () => {
    it('iniciar faz POST em /execucao com o DTO no corpo', () => {
        servico.iniciar({ atividadeId: 4, descricao: 'x' } as never).subscribe();
        const requisicaoSeguinte = http.expectOne((registroSelecionado) => registroSelecionado.url.endsWith('/execucao'));
        expect(requisicaoSeguinte.request.method).toBe('POST');
        expect(requisicaoSeguinte.request.body).toEqual({ atividadeId: 4, descricao: 'x' });
    });

    it('registrar (gestor) faz POST em /execucao/registro', () => {
        const dto = { atividadeId: 4, inicioData: 'a', fimData: 'b', descricao: 'x' };
        servico.registrar(dto as never).subscribe();
        expect(pedido('POST', '/execucao/registro').request.body).toEqual(dto);
    });

    it('encerrar faz PATCH em /execucao/:id/encerrar com o DTO', () => {
        servico.encerrar(7, { descricao: 'fim' } as never).subscribe();
        expect(pedido('PATCH', '/execucao/7/encerrar').request.body).toEqual({ descricao: 'fim' });
    });

    it('recuperar faz GET em /execucao/:id', () => {
        servico.recuperar(7).subscribe();
        pedido('GET', '/execucao/7');
    });

    it('alterar faz PUT em /execucao/:id com descrição, início e fim', () => {
        const dto = { descricao: 'novo', inicioData: 'a', fimData: null };
        servico.alterar(7, dto as never).subscribe();
        expect(pedido('PUT', '/execucao/7').request.body).toEqual(dto);
    });

    it('buscarAtiva faz GET em /execucao/ativa', () => {
        servico.buscarAtiva().subscribe();
        pedido('GET', '/execucao/ativa');
    });

    it('listar manda só os filtros preenchidos como query', () => {
        servico.listar({ atividadeId: 3, usuarioId: 2, data: '2026-07-10', pagina: 2, itensPorPagina: 50 }).subscribe();
        const requisicaoAtual = http.expectOne((registroPrincipal) => registroPrincipal.url.endsWith('/execucao'));
        expect(requisicaoAtual.request.method).toBe('GET');
        expect(requisicaoAtual.request.params.get('atividadeId')).toBe('3');
        expect(requisicaoAtual.request.params.get('usuarioId')).toBe('2');
        expect(requisicaoAtual.request.params.get('data')).toBe('2026-07-10');
        expect(requisicaoAtual.request.params.get('pagina')).toBe('2');
        expect(requisicaoAtual.request.params.get('itensPorPagina')).toBe('50');
    });

    it('listar sem filtros não manda parâmetro e a leitura tem feedback próprio (sem overlay global)', () => {
        servico.listar({}).subscribe();
        const requisicao = http.expectOne((registroSeguinte) => registroSeguinte.url.endsWith('/execucao'));
        expect(requisicao.request.params.keys()).toEqual([]);
        expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
    });

    it('listar ignora filtros vazios ou zerados', () => {
        servico.listar({ usuarioId: 0, data: '', atividadeId: undefined }).subscribe();
        expect(http.expectOne((registroAtual) => registroAtual.url.endsWith('/execucao')).request.params.keys()).toEqual([]);
    });
});
