import { describe, it } from 'vitest';
import * as assert from 'node:assert/strict';
import type { ModelagemColuna, ModelagemTabela } from '@project20/shared';
import {
  alturaDaTabela,
  caminhoDaAresta,
  colunaCasaBusca,
  enquadrar,
  montarArestas,
  posicoesParaConfiguracao,
  retanguloDasTabelas,
  tabelaCasaBusca,
  vizinhasDe,
} from './modelagem.util';

function coluna(nome: string, marca: ModelagemColuna['marca'] = '', tabelaReferenciada: string | null = null): ModelagemColuna {
  return { nome, tipo: 'int', marca, tabelaReferenciada };
}

function tabela(nome: string, x: number, y: number, colunas: ModelagemColuna[], largura = 200): ModelagemTabela {
  return { nome, grupo: 'dom', x, y, largura, colunas };
}

const projeto = tabela('projeto', 0, 0, [coluna('id', 'pk'), coluna('nome')]);
const demanda = tabela('demanda', 400, 0, [coluna('id', 'pk'), coluna('projeto_id', 'fk', 'projeto'), coluna('demanda_pai_id', 'fk', 'demanda')]);
const chat = tabela('chat', 400, 300, [coluna('id', 'pk'), coluna('demanda_id', 'lg', 'demanda'), coluna('fantasma_id', 'lg', 'nao_existe')]);
const tabelas = [projeto, demanda, chat];

describe('montarArestas', () => {
  it('cria uma aresta por referência, marca a lógica e ignora destino que não existe', () => {
    const arestas = montarArestas(tabelas);
    assert.deepEqual(arestas, [
      { origem: 'demanda', coluna: 'projeto_id', destino: 'projeto', logica: false },
      { origem: 'demanda', coluna: 'demanda_pai_id', destino: 'demanda', logica: false },
      { origem: 'chat', coluna: 'demanda_id', destino: 'demanda', logica: true },
    ]);
  });
});

describe('vizinhasDe', () => {
  it('inclui a própria tabela, quem ela referencia e quem a referencia', () => {
    const arestas = montarArestas(tabelas);
    assert.deepEqual([...vizinhasDe('demanda', arestas)].sort(), ['chat', 'demanda', 'projeto']);
    assert.deepEqual([...vizinhasDe('projeto', arestas)].sort(), ['demanda', 'projeto']);
  });
});

describe('busca', () => {
  it('casa pelo nome da tabela ou de uma coluna, sem diferenciar maiúsculas; termo vazio casa tudo', () => {
    assert.equal(tabelaCasaBusca(demanda, 'PROJ'), true);
    assert.equal(tabelaCasaBusca(projeto, 'pai'), false);
    assert.equal(tabelaCasaBusca(projeto, '   '), true);
  });
  it('só realça a coluna quando há termo', () => {
    assert.equal(colunaCasaBusca(coluna('projeto_id'), 'proj'), true);
    assert.equal(colunaCasaBusca(coluna('projeto_id'), ''), false);
  });
});

describe('caminhoDaAresta', () => {
  it('sai pela direita da origem e entra pela esquerda do destino quando há espaço entre elas', () => {
    const resultado = caminhoDaAresta(projeto, 'id', demanda);
    assert.equal(resultado.origemX, 200);
    assert.equal(resultado.destinoX, 400);
    assert.match(resultado.caminho, /^M200,/);
  });
  it('parte da linha da coluna de origem e chega à linha id do destino', () => {
    const resultado = caminhoDaAresta(demanda, 'projeto_id', projeto);
    assert.equal(resultado.origemY, 28 + 18 + 9);
    assert.equal(resultado.destinoY, 28 + 9);
  });
  it('usa o mesmo lado quando as tabelas se sobrepõem na horizontal', () => {
    const resultado = caminhoDaAresta(chat, 'demanda_id', demanda);
    assert.equal(resultado.origemX, 400);
    assert.equal(resultado.destinoX, 400);
  });
  it('desenha a autorreferência como laço, sem traço de destino', () => {
    const resultado = caminhoDaAresta(demanda, 'demanda_pai_id', demanda);
    assert.equal(resultado.destinoX, null);
    assert.equal(resultado.origemX, 600);
  });
});

describe('retanguloDasTabelas e enquadrar', () => {
  it('envolve as tabelas com a folga pedida e devolve null sem tabelas', () => {
    assert.equal(retanguloDasTabelas([], { lados: 10, topo: 10, base: 10 }), null);
    const retangulo = retanguloDasTabelas([projeto, demanda], { lados: 18, topo: 36, base: 18 })!;
    assert.deepEqual(retangulo, { x: -18, y: -36, largura: 636, altura: 36 + alturaDaTabela(demanda) + 18 });
  });
  it('centraliza o retângulo na área visível pela menor escala', () => {
    const resultado = enquadrar({ x: 100, y: 0, largura: 400, altura: 200 }, 800, 800);
    assert.equal(resultado.escala, 2);
    assert.equal(resultado.x, -200);
    assert.equal(resultado.y, 200);
  });
});

describe('posicoesParaConfiguracao', () => {
  it('gera o campo posicoes em ordem alfabética com coordenadas inteiras', () => {
    const texto = posicoesParaConfiguracao([{ ...demanda, x: 400.4, y: 0.6 }, projeto]);
    assert.equal(texto, '"posicoes": {\n    "demanda": [400, 1],\n    "projeto": [0, 0]\n  }');
  });
});
