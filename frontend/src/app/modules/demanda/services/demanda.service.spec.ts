import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoDemandaStatusEnum } from '@project20/shared';
import { DemandaService } from './demanda.service';
import { ERRO_TRATADO_PELA_TELA } from '../../../core/interceptors/error-handler.interceptor';

let servico: DemandaService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servico = TestBed.inject(DemandaService);
  http = TestBed.inject(HttpTestingController);
});

const pedido = (metodo: string, sufixo: string) => http.expectOne((r) => r.method === metodo && r.url.endsWith(sufixo));

describe('DemandaService (frontend)', () => {
  it('listar monta a query só com os filtros informados', () => {
    servico.listar({ projetoId: 7, pagina: 2, itensPorPagina: 50, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/demanda'));
    expect(req.request.method).toBe('GET');
    expect(Object.fromEntries(req.request.params.keys().map((chave) => [chave, req.request.params.get(chave)]))).toEqual({
      projetoId: '7', pagina: '2', itensPorPagina: '50', status: 'PLANEJADA', isEstrutural: 'false',
    });
  });

  it('listar sem filtros não manda parâmetro', () => {
    servico.listar({} as never).subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/demanda')).request.params.keys()).toEqual([]);
  });

  it('grafo e planejamento mandam o projetoId na query', () => {
    servico.recuperarGrafo(7).subscribe();
    expect(pedido('GET', '/demanda/grafo').request.params.get('projetoId')).toBe('7');
    servico.listarPlanejamento(7).subscribe();
    expect(pedido('GET', '/demanda/planejamento').request.params.get('projetoId')).toBe('7');
  });

  it('CRUD: verbo, URL e corpo certos', () => {
    servico.criar({ projetoId: 7, nome: 'N', horasEstimadas: 1, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false }).subscribe();
    expect(pedido('POST', '/demanda').request.body.nome).toBe('N');
    servico.recuperar(3).subscribe();
    pedido('GET', '/demanda/3');
    servico.alterar(3, { nome: 'Novo' }).subscribe();
    expect(pedido('PUT', '/demanda/3').request.body).toEqual({ nome: 'Novo' });
    servico.excluir(3).subscribe();
    pedido('DELETE', '/demanda/3');
    servico.restaurar(3).subscribe();
    expect(pedido('PATCH', '/demanda/3/restaurar').request.body).toEqual({});
  });

  it('leituras da árvore, do ancestral e das atribuídas usam as rotas certas', () => {
    servico.recuperarArvore(3).subscribe();
    pedido('GET', '/demanda/3/arvore');
    servico.recuperarAncestral(3).subscribe();
    pedido('GET', '/demanda/3/ancestral');
    servico.listarAtribuidas().subscribe();
    pedido('GET', '/demanda/atribuidas');
  });

  it('conexões: criar (com e sem erro tratado pela tela), listar e excluir', () => {
    servico.criarConexao(3, { demandaDestinoId: 4, ehBidirecional: true }).subscribe();
    const comum = pedido('POST', '/demanda/3/conexao');
    expect(comum.request.body).toEqual({ demandaDestinoId: 4, ehBidirecional: true });
    expect(comum.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(false);

    servico.criarConexao(3, { demandaDestinoId: 4, ehBidirecional: false }, true).subscribe();
    expect(pedido('POST', '/demanda/3/conexao').request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(true);

    servico.listarConexoes(3).subscribe();
    pedido('GET', '/demanda/3/conexao');
    servico.excluirConexao(3, 9).subscribe();
    pedido('DELETE', '/demanda/3/conexao/9');
  });

  it('tags e membros: listar, alterar, atribuir e remover', () => {
    servico.listarTags(3).subscribe();
    pedido('GET', '/demanda/3/tag');
    servico.alterarTags(3, { tagIds: [1, 2] }).subscribe();
    expect(pedido('PUT', '/demanda/3/tag').request.body).toEqual({ tagIds: [1, 2] });
    servico.listarMembros(3).subscribe();
    pedido('GET', '/demanda/3/membro');
    servico.atribuirMembro(3, { usuarioId: 8 }).subscribe();
    expect(pedido('POST', '/demanda/3/membro').request.body).toEqual({ usuarioId: 8 });
    servico.removerMembro(3, 8).subscribe();
    pedido('DELETE', '/demanda/3/membro/8');
  });
});
