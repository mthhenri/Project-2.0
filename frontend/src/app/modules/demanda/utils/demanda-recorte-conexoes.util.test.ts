import { describe, expect, it } from 'vitest';
import { DemandaGrafoArestaDto, DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { montarRecorteDeConexoes, sentidoDaConexao, textoDaConexao } from './demanda-recorte-conexoes.util';

function no(id: number, status = TipoDemandaStatusEnum.PENDENTE): DemandaGrafoNoDto {
    return { id, nome: `D${id}`, status } as DemandaGrafoNoDto;
}
function conexao(id: number, origemId: number, destinoId: number, bidirecional = false): DemandaGrafoArestaDto {
    return { id, origemId, destinoId, tipo: 'conexao', bidirecional };
}
const hierarquia = (id: number, origemId: number, destinoId: number): DemandaGrafoArestaDto => ({ id, origemId, destinoId, tipo: 'hierarquia', bidirecional: false });

describe('montarRecorteDeConexoes', () => {
    it('sem conexões: só a própria demanda', () => {
        const recorte = montarRecorteDeConexoes({ nos: [no(1), no(2)], arestas: [hierarquia(1, 1, 2)] }, 1);
        expect(recorte.grafo.nos.map((item) => item.id)).toEqual([1]);
        expect(recorte.grafo.arestas).toEqual([]);
    });

    it('traz as ligadas (saída, entrada e mútua) e as conexões entre elas, sem a hierarquia nem as demandas fora do recorte', () => {
        const recorte = montarRecorteDeConexoes(
            { nos: [no(1), no(2), no(3), no(4), no(5), no(6)], arestas: [conexao(1, 1, 2), conexao(2, 3, 1), conexao(3, 1, 4, true), conexao(4, 2, 3), conexao(5, 5, 6), hierarquia(6, 1, 5)] },
            1,
        );
        expect(recorte.grafo.nos.map((item) => item.id).sort()).toEqual([1, 2, 3, 4]);
        expect(recorte.grafo.arestas.map((aresta) => aresta.id).sort()).toEqual([1, 2, 3, 4]);
    });

    it('avisa as ligadas canceladas, mas não a própria demanda', () => {
        const recorte = montarRecorteDeConexoes({ nos: [no(1, TipoDemandaStatusEnum.CANCELADA), no(2, TipoDemandaStatusEnum.CANCELADA), no(3)], arestas: [conexao(1, 1, 2), conexao(2, 1, 3)] }, 1);
        expect(recorte.canceladas).toEqual(['D2']);
    });

    it('conexão com demanda que não está no grafo (outro projeto) é ignorada', () => {
        const recorte = montarRecorteDeConexoes({ nos: [no(1), no(2)], arestas: [conexao(1, 1, 2), conexao(2, 1, 99)] }, 1);
        expect(recorte.grafo.arestas.map((aresta) => aresta.id)).toEqual([1]);
    });

    it('a própria demanda fora do grafo dá recorte vazio', () => {
        expect(montarRecorteDeConexoes({ nos: [no(2)], arestas: [] }, 1).grafo.nos).toEqual([]);
    });
});

describe('sentidoDaConexao e textoDaConexao', () => {
    it('saída, entrada e mútua, do ponto de vista da demanda em foco', () => {
        expect(sentidoDaConexao(conexao(1, 1, 2), 1)).toBe('saida');
        expect(sentidoDaConexao(conexao(1, 2, 1), 1)).toBe('entrada');
        expect(sentidoDaConexao(conexao(1, 2, 1, true), 1)).toBe('mutua');
        expect([conexao(1, 1, 2), conexao(1, 2, 1), conexao(1, 1, 2, true)].map((aresta) => textoDaConexao(aresta, 1))).toEqual(['depende de', 'depende desta', 'mútua']);
    });

    it('entre duas outras demandas lê-se da origem para o destino', () => {
        expect(textoDaConexao(conexao(1, 2, 3), 1)).toBe('depende de');
    });
});
