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

const pedido = (metodo: string, sufixo: string) => http.expectOne((registroSelecionado) => registroSelecionado.method === metodo && registroSelecionado.url.endsWith(sufixo));

describe('AtividadeService (frontend)', () => {
    it('listar monta a query com todos os filtros informados e repete o parâmetro status', () => {
        servico.listar({ demandaId: 4, usuarioId: 2, status: ['PENDENTE', 'EM_ANDAMENTO'], busca: 'x', dataInicio: '2026-01-01', dataFim: '2026-01-31', pagina: 2, itensPorPagina: 25 } as never).subscribe();
        const requisicaoSeguinte = http.expectOne((registroPrincipal) => registroPrincipal.url.endsWith('/atividade'));
        expect(requisicaoSeguinte.request.method).toBe('GET');
        expect(requisicaoSeguinte.request.params.getAll('status')).toEqual(['PENDENTE', 'EM_ANDAMENTO']);
        expect(requisicaoSeguinte.request.params.get('demandaId')).toBe('4');
        expect(requisicaoSeguinte.request.params.get('usuarioId')).toBe('2');
        expect(requisicaoSeguinte.request.params.get('busca')).toBe('x');
        expect(requisicaoSeguinte.request.params.get('dataInicio')).toBe('2026-01-01');
        expect(requisicaoSeguinte.request.params.get('dataFim')).toBe('2026-01-31');
        expect(requisicaoSeguinte.request.params.get('pagina')).toBe('2');
        expect(requisicaoSeguinte.request.params.get('itensPorPagina')).toBe('25');
    });

    it('listar sem filtros não manda parâmetro e a leitura tem feedback próprio (sem overlay global)', () => {
        servico.listar({} as never).subscribe();
        const requisicaoAtual = http.expectOne((registroSeguinte) => registroSeguinte.url.endsWith('/atividade'));
        expect(requisicaoAtual.request.params.keys()).toEqual([]);
        expect(requisicaoAtual.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
    });

    it('listar com allRows pede a lista inteira e sem allRows não manda o parâmetro (P-083)', () => {
        servico.listar({ demandaId: 5, allRows: true }).subscribe();
        const inteira = http.expectOne((registro) => registro.url.endsWith('/atividade'));
        expect(inteira.request.params.get('allRows')).toBe('true');
        inteira.flush({ sucesso: true, dados: null, mensagem: '' });

        servico.listar({ demandaId: 5 }).subscribe();
        const paginada = http.expectOne((registro) => registro.url.endsWith('/atividade'));
        expect(paginada.request.params.has('allRows')).toBe(false);
        paginada.flush({ sucesso: true, dados: null, mensagem: '' });
    });

    it('listar ignora status vazio, id zerado e busca vazia', () => {
        servico.listar({ status: [], demandaId: 0, busca: '' } as never).subscribe();
        expect(http.expectOne((registroAtual) => registroAtual.url.endsWith('/atividade')).request.params.keys()).toEqual([]);
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
        const requisicao = http.expectOne((registro) => registro.url.endsWith('/execucao'));
        expect(requisicao.request.params.get('atividadeId')).toBe('3');
        expect(requisicao.request.params.get('itensPorPagina')).toBe('200');
    });
});
