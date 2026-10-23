import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  abreviarTipo,
  alturaDaTabela,
  ColunaBanco,
  ConfiguracaoModelagem,
  inferirReferenciaLogica,
  montarDados,
  montarModelo,
  posicionar,
  renderizarHtml,
} from './modelagem';

function coluna(tabela: string, nome: string, tipo = 'integer', extras: Partial<ColunaBanco> = {}): ColunaBanco {
  return { tabela, coluna: nome, tipo, tipoInterno: tipo, anulavel: false, padrao: null, ...extras };
}

const configuracao: ConfiguracaoModelagem = {
  grupos: { dom: { titulo: 'Domínio', rotulo: 'Domínio' }, chat: { titulo: 'Chat', rotulo: 'Chat' } },
  tabelaGrupo: { projeto: 'dom', demanda: 'dom', chat_mensagem: 'chat' },
  colunasOcultas: ['created_date', 'is_deleted'],
  referenciasLogicas: { 'chat_mensagem.proposta_id': 'proposta_ia' },
  posicoes: {},
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
const primarias = ['projeto', 'tipo_projeto_status', 'demanda', 'chat_mensagem', 'proposta_ia', 'knex_migrations'].map((tabela) => ({ tabela, coluna: 'id' }));
const estrangeiras = [
  { tabela: 'projeto', coluna: 'tipo_projeto_status_id', tabelaDestino: 'tipo_projeto_status', colunaDestino: 'id' },
  { tabela: 'demanda', coluna: 'projeto_id', tabelaDestino: 'projeto', colunaDestino: 'id' },
];

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
  const { tabelas, avisos } = montarModelo(colunas, primarias, estrangeiras, configuracao);
  const porNome = (nome: string) => tabelas.find((tabela) => tabela.n === nome)!;

  it('ignora as tabelas do Knex e oculta as colunas de BaseEntity (menos o id)', () => {
    assert.ok(!tabelas.some((tabela) => tabela.n.startsWith('knex_')));
    assert.deepEqual(porNome('projeto').cols.map(([nome]) => nome), ['id', 'nome', 'tipo_projeto_status_id']);
  });

  it('marca PK, FK e a tabela referenciada', () => {
    assert.deepEqual(porNome('projeto').cols[0], ['id', 'serial', 'pk', null]);
    assert.deepEqual(porNome('demanda').cols[1], ['projeto_id', 'int', 'fk', 'projeto']);
  });

  it('infere referência lógica pelo nome e aceita a explícita da configuração', () => {
    assert.deepEqual(porNome('chat_mensagem').cols[1], ['demanda_id', 'int?', 'lg', 'demanda']);
    assert.deepEqual(porNome('chat_mensagem').cols[2], ['proposta_id', 'int?', 'lg', 'proposta_ia']);
    assert.equal(porNome('chat_mensagem').cols[3][2], '');
  });

  it('tabela tipo_* herda o grupo de quem a referencia e tabela solta vai para "outros" com aviso', () => {
    assert.equal(porNome('tipo_projeto_status').g, 'dom');
    assert.equal(porNome('proposta_ia').g, 'outros');
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /proposta_ia/);
  });

  it('dimensiona a largura pelo conteúdo, com mínimo de 200', () => {
    assert.ok(porNome('demanda').w >= 200);
    assert.ok(porNome('chat_mensagem').w >= porNome('demanda').w);
  });
});

describe('posicionar', () => {
  const modelo = montarModelo(colunas, primarias, estrangeiras, configuracao);

  it('mantém as posições da configuração e avisa de posições obsoletas', () => {
    const resultado = posicionar(modelo, { projeto: [10, 20], demanda: [300, 20], proposta_ia: [0, 0], chat_mensagem: [0, 900], tipo_projeto_status: [0, 200], fantasma: [1, 1] }, ['dom', 'chat']);
    const projeto = resultado.tabelas.find((tabela) => tabela.n === 'projeto')!;
    assert.deepEqual([projeto.x, projeto.y], [10, 20]);
    assert.ok(resultado.avisos.some((aviso) => aviso.includes('fantasma')));
    assert.ok(!resultado.avisos.some((aviso) => aviso.includes('Sem posição')));
  });

  it('põe a tabela nova abaixo do grupo, sem sobrepor', () => {
    const resultado = posicionar(modelo, { projeto: [10, 20], demanda: [300, 20], chat_mensagem: [0, 900], proposta_ia: [0, 1500] }, ['dom', 'chat']);
    const nova = resultado.tabelas.find((tabela) => tabela.n === 'tipo_projeto_status')!;
    const maisBaixaDoGrupo = Math.max(20 + alturaDaTabela(3), 20 + alturaDaTabela(2));
    assert.ok(nova.y > maisBaixaDoGrupo);
    assert.ok(resultado.avisos.some((aviso) => aviso.includes('tipo_projeto_status')));
  });

  it('é determinística: mesma entrada, mesma saída', () => {
    assert.deepEqual(posicionar(modelo, {}, ['dom', 'chat']), posicionar(modelo, {}, ['dom', 'chat']));
  });
});

describe('montarDados e renderizarHtml', () => {
  it('atribui as cores pela ordem dos grupos e cria o grupo "outros" quando preciso', () => {
    const modelo = montarModelo(colunas, primarias, estrangeiras, configuracao);
    const { tabelas } = posicionar(modelo, {}, ['dom', 'chat']);
    const dados = montarDados(tabelas, configuracao, 'origem', []);
    assert.equal(dados.grupos.dom.cor, '--g0');
    assert.equal(dados.grupos.chat.cor, '--g1');
    assert.equal(dados.grupos.outros.cor, '--goutros');
  });

  it('injeta o JSON no molde sem deixar um "</script>" do banco fechar a tag', () => {
    const dados = montarDados([], configuracao, 'a </script><b> $& origem', []);
    const html = renderizarHtml('<script>const DADOS=__DADOS__;</script>', dados);
    assert.ok(!html.slice(8, -9).includes('</script>'));
    assert.ok(html.includes('\\u003c/script>'));
    assert.ok(html.includes('$&'));
  });

  it('recusa um molde sem o marcador', () => {
    assert.throws(() => renderizarHtml('<html></html>', montarDados([], configuracao, '', [])), /__DADOS__/);
  });
});
