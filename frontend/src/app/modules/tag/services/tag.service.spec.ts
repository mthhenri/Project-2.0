import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { ERRO_TRATADO_PELA_TELA } from '../../../core/interceptors/error-handler.interceptor';
import { TagService } from './tag.service';

let http: HttpTestingController;
let servico: TagService;

beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    servico = TestBed.inject(TagService);
});

const pedido = (metodo: string, sufixo: string) =>
    http.expectOne((registro) => registro.method === metodo && registro.url.endsWith(sufixo));

describe('TagService (frontend)', () => {
    it('listar faz GET em /tag com feedback próprio da tela (sem o scrim global)', () => {
        servico.listar().subscribe();
        expect(pedido('GET', '/tag').request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
    });

    it('criar faz POST em /tag com nome e cor; por padrão o erro fica com o toast genérico', () => {
        servico.criar({ nome: 'Infra', cor: '#abcdef' }).subscribe();
        const requisicao = pedido('POST', '/tag');
        expect(requisicao.request.body).toEqual({ nome: 'Infra', cor: '#abcdef' });
        expect(requisicao.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(false);
    });

    it('criar com erroNaTela marca a requisição como tratada pela tela (hint do quick-add)', () => {
        servico.criar({ nome: 'Infra', cor: '#abcdef' }, true).subscribe();
        expect(pedido('POST', '/tag').request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(true);
    });

    it('recuperar faz GET em /tag/:id', () => {
        servico.recuperar(4).subscribe();
        pedido('GET', '/tag/4');
    });

    it('alterar faz PUT em /tag/:id só com os campos informados', () => {
        servico.alterar(4, { cor: '#ffffff' }).subscribe();
        const requisicao = pedido('PUT', '/tag/4');
        expect(requisicao.request.body).toEqual({ cor: '#ffffff' });
        expect(requisicao.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(false);
    });

    it('excluir faz DELETE em /tag/:id e restaurar faz PATCH em /tag/:id/restaurar', () => {
        servico.excluir(4).subscribe();
        pedido('DELETE', '/tag/4');
        servico.restaurar(4).subscribe();
        pedido('PATCH', '/tag/4/restaurar');
    });

    describe('listarCatalogo (P-080)', () => {
        it('lê da memória na segunda vez, sem nova requisição', () => {
            let resposta: unknown;
            servico.listarCatalogo().subscribe();
            pedido('GET', '/tag').flush({ sucesso: true, dados: [{ id: 1, nome: 'Infra', cor: '#abcdef' }], mensagem: 'ok' });

            servico.listarCatalogo().subscribe((retorno) => (resposta = retorno));
            http.expectNone((registro) => registro.url.endsWith('/tag'));
            expect((resposta as { dados: unknown[] }).dados).toHaveLength(1);
        });

        it('listar continua indo ao servidor sempre (é a tela de manutenção)', () => {
            servico.listarCatalogo().subscribe();
            pedido('GET', '/tag').flush({ sucesso: true, dados: [], mensagem: 'ok' });
            servico.listar().subscribe();
            pedido('GET', '/tag');
        });

        it.each<[string, () => Observable<unknown>, string, string]>([
            ['criar', () => servico.criar({ nome: 'Nova', cor: '#111111' }), 'POST', '/tag'],
            ['alterar', () => servico.alterar(3, { nome: 'Outra' }), 'PUT', '/tag/3'],
            ['excluir', () => servico.excluir(3), 'DELETE', '/tag/3'],
            ['restaurar', () => servico.restaurar(3), 'PATCH', '/tag/3/restaurar'],
        ])('%s invalida a cópia: a leitura seguinte vai ao servidor', (_nome, gravar, metodo, sufixo) => {
            servico.listarCatalogo().subscribe();
            pedido('GET', '/tag').flush({ sucesso: true, dados: [], mensagem: 'ok' });

            gravar().subscribe();
            pedido(metodo, sufixo).flush({ sucesso: true, dados: null, mensagem: 'ok' });

            servico.listarCatalogo().subscribe();
            pedido('GET', '/tag');
        });
    });
});
