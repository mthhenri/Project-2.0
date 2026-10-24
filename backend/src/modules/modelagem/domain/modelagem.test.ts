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
  posicionarTabelaNova,
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
  const colocacao = (nomeTabela: string, grupoId: number, x = 0, y = 0): ColocacaoDeTabela => ({ nomeTabela, grupoId, x, y });

  it('usa o grupo guardado; se o grupo não existe mais, a tabela fica fora da modelagem', () => {
    const grupoDe = resolverGrupos(catalogo, [colocacao('projeto', 1), colocacao('demanda', 99)], new Set([1]));
    assert.equal(grupoDe.get('projeto'), 1);
    assert.equal(grupoDe.get('demanda'), null);
  });

  it('tabela sem linha guardada (nova no banco ou tirada da modelagem) fica fora, sem herdar grupo de ninguém, nem a tipo_*', () => {
    const grupoDe = resolverGrupos(catalogo, [colocacao('projeto', 1)], new Set([1]));
    assert.equal(grupoDe.get('tipo_projeto_status'), null);
    assert.equal(grupoDe.get('chat_mensagem'), null);
  });
});

describe('posicionar', () => {
  const colocacao = (nomeTabela: string, grupoId: number, x: number, y: number): ColocacaoDeTabela => ({ nomeTabela, grupoId, x, y });
  const grupoDe = new Map<string, number | null>([['projeto', 1], ['demanda', 1], ['chat_mensagem', 2], ['tipo_projeto_status', null], ['proposta_ia', null]]);
  const colocacoes = [colocacao('projeto', 1, 10, 20), colocacao('demanda', 1, 300, 20), colocacao('chat_mensagem', 2, 0, 900)];
  const resultado = posicionar(catalogo, grupoDe, colocacoes);
  const tabela = (nome: string) => resultado.find((candidata) => candidata.nome === nome)!;

  it('mantém as posições guardadas das tabelas da modelagem', () => {
    assert.deepEqual([tabela('projeto').x, tabela('projeto').y, tabela('projeto').grupoId], [10, 20, 1]);
    assert.deepEqual([tabela('chat_mensagem').x, tabela('chat_mensagem').y], [0, 900]);
  });

  it('as tabelas fora da modelagem ficam no canto de baixo, embaixo de tudo e alinhadas à esquerda, sem grupo e em grade', () => {
    const abaixoDeTudo = Math.max(...['projeto', 'demanda', 'chat_mensagem'].map((nome) => tabela(nome).y + alturaDaTabela(tabela(nome).colunas.length)));
    for (const nome of ['tipo_projeto_status', 'proposta_ia']) {
      assert.equal(tabela(nome).grupoId, null);
      assert.ok(tabela(nome).y > abaixoDeTudo, nome);
    }
    assert.equal(tabela('proposta_ia').x, 0);
    assert.ok(tabela('tipo_projeto_status').x > tabela('proposta_ia').x);
    assert.equal(tabela('tipo_projeto_status').y, tabela('proposta_ia').y);
  });

  it('tabela com linha guardada mas sem grupo existente também vai para o canto', () => {
    const semGrupo = posicionar(catalogo, new Map([['projeto', null]]), [colocacao('projeto', 1, 10, 20)]);
    assert.equal(semGrupo.find((candidata) => candidata.nome === 'projeto')!.grupoId, null);
  });

  it('sem nenhuma tabela na modelagem o canto começa na margem', () => {
    const tudoFora = posicionar(catalogo, new Map(), []);
    assert.ok(tudoFora.every((candidata) => candidata.grupoId === null));
    assert.equal(Math.min(...tudoFora.map((candidata) => candidata.x)), 40);
  });

  it('é determinística: mesma entrada, mesma saída', () => {
    assert.deepEqual(posicionar(catalogo, grupoDe, colocacoes), posicionar(catalogo, grupoDe, colocacoes));
  });
});

describe('posicionarTabelaNova', () => {
  const naModelagem = [
    { nome: 'projeto', grupoId: 1, x: 10, y: 20, largura: 200, colunas: catalogo[0].colunas },
    { nome: 'demanda', grupoId: 1, x: 300, y: 20, largura: 200, colunas: catalogo[0].colunas },
    { nome: 'chat_mensagem', grupoId: 2, x: 0, y: 900, largura: 200, colunas: catalogo[0].colunas },
  ];

  it('cai embaixo das tabelas do grupo, alinhada à esquerda delas', () => {
    const posicao = posicionarTabelaNova(1, { nome: 'nova' }, naModelagem);
    assert.equal(posicao.x, 10);
    assert.equal(posicao.y, 20 + alturaDaTabela(catalogo[0].colunas.length) + 50);
  });

  it('num grupo ainda sem tabela cai embaixo de todo o desenho', () => {
    const posicao = posicionarTabelaNova(3, { nome: 'nova' }, naModelagem);
    assert.equal(posicao.x, 40);
    assert.equal(posicao.y, 900 + alturaDaTabela(catalogo[0].colunas.length) + 50);
  });

  it('sem nenhuma tabela na modelagem cai na margem', () => {
    assert.deepEqual(posicionarTabelaNova(1, { nome: 'nova' }, []), { x: 40, y: 40 });
  });

  it('ignora a própria tabela (mover de grupo não conta ela mesma)', () => {
    const posicao = posicionarTabelaNova(1, { nome: 'projeto' }, naModelagem);
    assert.equal(posicao.x, 300);
  });
});

describe('montarDiagrama', () => {
  const grupos = [{ id: 1, titulo: 'Domínio', rotulo: 'Domínio', corIndice: 0 }];

  it('avisa das tabelas fora da modelagem e leva as colunas ocultas e a origem', () => {
    const tabelas = posicionar(catalogo, new Map([['projeto', 1]]), [{ nomeTabela: 'projeto', grupoId: 1, x: 0, y: 0 }]);
    const diagrama = montarDiagrama(tabelas, grupos, configuracao, 'origem');
    assert.equal(diagrama.origem, 'origem');
    assert.deepEqual(diagrama.colunasOcultas, configuracao.colunasOcultas);
    assert.equal(diagrama.avisos.length, 1);
    assert.match(diagrama.avisos[0], /fora da modelagem/);
    assert.match(diagrama.avisos[0], /proposta_ia/);
    assert.deepEqual(diagrama.grupos, grupos);
  });

  it('com tudo na modelagem não há aviso', () => {
    const grupoDe = new Map(catalogo.map((tabela) => [tabela.nome, 1]));
    const tabelas = posicionar(catalogo, grupoDe, catalogo.map((tabela) => ({ nomeTabela: tabela.nome, grupoId: 1, x: 0, y: 0 })));
    assert.deepEqual(montarDiagrama(tabelas, grupos, configuracao, 'origem').avisos, []);
  });
});
