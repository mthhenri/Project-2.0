import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  abreviarTipo,
  alturaDaTabela,
  ChaveBanco,
  ColocacaoDeTabela,
  ColunaBanco,
  ConfiguracaoModelagem,
  inferirReferenciaLogica,
  montarDiagrama,
  montarModelo,
  posicionar,
  resolverGrupos,
} from './modelagem';

function coluna(tabela: string, nome: string, tipo = 'integer', extras: Partial<ColunaBanco> = {}): ColunaBanco {
  return { tabela, coluna: nome, tipo, tipoInterno: tipo, anulavel: false, padrao: null, ...extras };
}

const configuracao: ConfiguracaoModelagem = {
  colunasOcultas: ['created_date', 'is_deleted'],
  referenciasLogicas: { 'chat_mensagem.proposta_id': 'proposta_ia' },
};

const colunas: ColunaBanco[] = [
  coluna('projeto', 'id', 'integer', { padrao: "nextval('projeto_id_seq'::regclass)" }),
  coluna('projeto', 'created_date', 'timestamp with time zone'),
  coluna('projeto', 'nome', 'character varying'),
  coluna('projeto', 'tipo_projeto_status_id'),
  coluna('tipo_projeto_status', 'id', 'integer', { padrao: "nextval('x'::regclass)" }),
  coluna('tipo_projeto_status', 'codigo', 'character varying'),
  coluna('demanda', 'id', 'integer', { padrao: "nextval('y'::regclass)" }),
  coluna('demanda', 'projeto_id'),
  coluna('demanda', 'is_deleted', 'boolean'),
  coluna('chat_mensagem', 'id', 'integer', { padrao: "nextval('z'::regclass)" }),
  coluna('chat_mensagem', 'demanda_id', 'integer', { anulavel: true }),
  coluna('chat_mensagem', 'proposta_id', 'integer', { anulavel: true }),
  coluna('chat_mensagem', 'conversa_id', 'character varying'),
  coluna('proposta_ia', 'id', 'integer', { padrao: "nextval('w'::regclass)" }),
  coluna('knex_migrations', 'id'),
];
const primarias: ChaveBanco[] = ['projeto', 'tipo_projeto_status', 'demanda', 'chat_mensagem', 'proposta_ia', 'knex_migrations'].map((tabela) => ({ tabela, coluna: 'id' }));
const estrangeiras: ChaveBanco[] = [
  { tabela: 'projeto', coluna: 'tipo_projeto_status_id', tabelaDestino: 'tipo_projeto_status', colunaDestino: 'id' },
  { tabela: 'demanda', coluna: 'projeto_id', tabelaDestino: 'projeto', colunaDestino: 'id' },
];
const catalogo = montarModelo(colunas, primarias, estrangeiras, configuracao);

describe('abreviarTipo', () => {
  it('encurta os tipos do PostgreSQL e marca o que aceita nulo', () => {
    assert.equal(abreviarTipo(coluna('t', 'a', 'character varying')), 'varchar');
    assert.equal(abreviarTipo(coluna('t', 'a', 'timestamp with time zone', { anulavel: true })), 'timestamptz?');
    assert.equal(abreviarTipo(coluna('t', 'a', 'integer', { padrao: "nextval('s'::regclass)" })), 'serial');
    assert.equal(abreviarTipo(coluna('t', 'a', 'ARRAY', { tipoInterno: '_int4' })), 'int[]');
    assert.equal(abreviarTipo(coluna('t', 'a', 'jsonb')), 'jsonb');
  });
});

describe('inferirReferenciaLogica', () => {
  const tabelas = ['usuario', 'atividade', 'chat_usuario'];
  it('acha a tabela pelo nome da coluna, inclusive com prefixo', () => {
    assert.equal(inferirReferenciaLogica('atividade_id', tabelas), 'atividade');
    assert.equal(inferirReferenciaLogica('autor_usuario_id', tabelas), 'usuario');
  });
  it('prefere a tabela de nome mais longo e ignora o que não termina em _id', () => {
    assert.equal(inferirReferenciaLogica('x_chat_usuario_id', tabelas), 'chat_usuario');
    assert.equal(inferirReferenciaLogica('conversa', tabelas), null);
    assert.equal(inferirReferenciaLogica('conversa_id', tabelas), null);
  });
});

describe('montarModelo', () => {
  const porNome = (nome: string) => catalogo.find((tabela) => tabela.nome === nome)!;

  it('ignora as tabelas do Knex e oculta as colunas de BaseEntity (menos o id)', () => {
    assert.ok(!catalogo.some((tabela) => tabela.nome.startsWith('knex_')));
    assert.deepEqual(porNome('projeto').colunas.map((coluna) => coluna.nome), ['id', 'nome', 'tipo_projeto_status_id']);
  });

  it('marca PK, FK e a tabela referenciada', () => {
    assert.deepEqual(porNome('projeto').colunas[0], { nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null });
    assert.deepEqual(porNome('demanda').colunas[1], { nome: 'projeto_id', tipo: 'int', marca: 'fk', tabelaReferenciada: 'projeto' });
  });

  it('infere referência lógica pelo nome e aceita a explícita da configuração', () => {
    assert.deepEqual(porNome('chat_mensagem').colunas[1], { nome: 'demanda_id', tipo: 'int?', marca: 'lg', tabelaReferenciada: 'demanda' });
    assert.deepEqual(porNome('chat_mensagem').colunas[2], { nome: 'proposta_id', tipo: 'int?', marca: 'lg', tabelaReferenciada: 'proposta_ia' });
    assert.equal(porNome('chat_mensagem').colunas[3].marca, '');
  });

  it('dimensiona a largura pelo conteúdo, com mínimo de 200', () => {
    assert.ok(porNome('demanda').largura >= 200);
    assert.ok(porNome('chat_mensagem').largura >= porNome('demanda').largura);
  });
});

describe('resolverGrupos', () => {
  const colocacao = (nomeTabela: string, grupoId: number | null, x = 0, y = 0): ColocacaoDeTabela => ({ nomeTabela, grupoId, x, y });

  it('usa o grupo guardado; se o grupo não existe mais, a tabela fica sem grupo', () => {
    const grupoDe = resolverGrupos(catalogo, [colocacao('projeto', 1), colocacao('demanda', 99), colocacao('chat_mensagem', null)], estrangeiras, new Set([1]));
    assert.equal(grupoDe.get('projeto'), 1);
    assert.equal(grupoDe.get('demanda'), null);
    assert.equal(grupoDe.get('chat_mensagem'), null);
  });

  it('tabela tipo_* sem linha guardada herda o grupo de quem a referencia', () => {
    const grupoDe = resolverGrupos(catalogo, [colocacao('projeto', 1)], estrangeiras, new Set([1]));
    assert.equal(grupoDe.get('tipo_projeto_status'), 1);
  });

  it('tipo_* já guardada mantém o grupo dela e a tabela comum sem linha fica sem grupo', () => {
    const grupoDe = resolverGrupos(catalogo, [colocacao('projeto', 1), colocacao('tipo_projeto_status', 2)], estrangeiras, new Set([1, 2]));
    assert.equal(grupoDe.get('tipo_projeto_status'), 2);
    assert.equal(grupoDe.get('proposta_ia'), null);
  });
});

describe('posicionar', () => {
  const colocacao = (nomeTabela: string, grupoId: number | null, x: number, y: number): ColocacaoDeTabela => ({ nomeTabela, grupoId, x, y });
  const grupoDe = new Map<string, number | null>([['projeto', 1], ['tipo_projeto_status', 1], ['demanda', 1], ['chat_mensagem', 2], ['proposta_ia', null]]);

  it('mantém as posições guardadas', () => {
    const resultado = posicionar(catalogo, grupoDe, [colocacao('projeto', 1, 10, 20), colocacao('demanda', 1, 300, 20)], [1, 2]);
    const projeto = resultado.find((tabela) => tabela.nome === 'projeto')!;
    assert.deepEqual([projeto.x, projeto.y, projeto.grupoId], [10, 20, 1]);
  });

  it('põe a tabela sem posição abaixo do grupo, sem sobrepor', () => {
    const resultado = posicionar(catalogo, grupoDe, [colocacao('projeto', 1, 10, 20), colocacao('demanda', 1, 300, 20), colocacao('chat_mensagem', 2, 0, 900)], [1, 2]);
    const nova = resultado.find((tabela) => tabela.nome === 'tipo_projeto_status')!;
    assert.ok(nova.y > 20 + Math.max(alturaDaTabela(3), alturaDaTabela(2)));
    assert.equal(nova.x, 10);
  });

  it('as tabelas sem grupo e sem posição vão para o fim, abaixo de tudo', () => {
    const resultado = posicionar(catalogo, grupoDe, [colocacao('projeto', 1, 10, 20), colocacao('chat_mensagem', 2, 0, 900)], [1, 2]);
    const solta = resultado.find((tabela) => tabela.nome === 'proposta_ia')!;
    const maisBaixa = Math.max(...resultado.filter((tabela) => tabela.nome !== 'proposta_ia' && tabela.grupoId !== 1).map((tabela) => tabela.y));
    assert.ok(solta.y > maisBaixa);
  });

  it('é determinística: mesma entrada, mesma saída', () => {
    assert.deepEqual(posicionar(catalogo, grupoDe, [], [1, 2]), posicionar(catalogo, grupoDe, [], [1, 2]));
  });
});

describe('montarDiagrama', () => {
  const grupos = [{ id: 1, titulo: 'Domínio', rotulo: 'Domínio', corIndice: 0 }];

  it('avisa das tabelas sem grupo e leva as colunas ocultas e a origem', () => {
    const tabelas = posicionar(catalogo, new Map([['projeto', 1], ['proposta_ia', null]]), [], [1]);
    const diagrama = montarDiagrama(tabelas, grupos, configuracao, 'origem');
    assert.equal(diagrama.origem, 'origem');
    assert.deepEqual(diagrama.colunasOcultas, configuracao.colunasOcultas);
    assert.equal(diagrama.avisos.length, 1);
    assert.match(diagrama.avisos[0], /proposta_ia/);
    assert.deepEqual(diagrama.grupos, grupos);
  });

  it('sem tabela sem grupo não há aviso', () => {
    const tabelas = posicionar(catalogo, new Map(catalogo.map((tabela) => [tabela.nome, 1])), [], [1]);
    assert.deepEqual(montarDiagrama(tabelas, grupos, configuracao, 'origem').avisos, []);
  });
});
