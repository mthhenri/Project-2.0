import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  abreviarTipo,
  alturaDaTabela,
  ColunaBanco,
  ConfiguracaoModelagem,
  inferirReferenciaLogica,
  montarDiagrama,
  montarModelo,
  posicionar,
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
  const porNome = (nome: string) => tabelas.find((tabela) => tabela.nome === nome)!;

  it('ignora as tabelas do Knex e oculta as colunas de BaseEntity (menos o id)', () => {
    assert.ok(!tabelas.some((tabela) => tabela.nome.startsWith('knex_')));
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

  it('tabela tipo_* herda o grupo de quem a referencia e tabela solta vai para "outros" com aviso', () => {
    assert.equal(porNome('tipo_projeto_status').grupo, 'dom');
    assert.equal(porNome('proposta_ia').grupo, 'outros');
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /proposta_ia/);
  });

  it('dimensiona a largura pelo conteúdo, com mínimo de 200', () => {
    assert.ok(porNome('demanda').largura >= 200);
    assert.ok(porNome('chat_mensagem').largura >= porNome('demanda').largura);
  });
});

describe('posicionar', () => {
  const modelo = montarModelo(colunas, primarias, estrangeiras, configuracao);

  it('mantém as posições da configuração e avisa de posições obsoletas', () => {
    const resultado = posicionar(modelo, { projeto: [10, 20], demanda: [300, 20], proposta_ia: [0, 0], chat_mensagem: [0, 900], tipo_projeto_status: [0, 200], fantasma: [1, 1] }, ['dom', 'chat']);
    const projeto = resultado.tabelas.find((tabela) => tabela.nome === 'projeto')!;
    assert.deepEqual([projeto.x, projeto.y], [10, 20]);
    assert.ok(resultado.avisos.some((aviso) => aviso.includes('fantasma')));
    assert.ok(!resultado.avisos.some((aviso) => aviso.includes('Sem posição')));
  });

  it('põe a tabela nova abaixo do grupo, sem sobrepor', () => {
    const resultado = posicionar(modelo, { projeto: [10, 20], demanda: [300, 20], chat_mensagem: [0, 900], proposta_ia: [0, 1500] }, ['dom', 'chat']);
    const nova = resultado.tabelas.find((tabela) => tabela.nome === 'tipo_projeto_status')!;
    const maisBaixaDoGrupo = Math.max(20 + alturaDaTabela(3), 20 + alturaDaTabela(2));
    assert.ok(nova.y > maisBaixaDoGrupo);
    assert.ok(resultado.avisos.some((aviso) => aviso.includes('tipo_projeto_status')));
  });

  it('é determinística: mesma entrada, mesma saída', () => {
    assert.deepEqual(posicionar(modelo, {}, ['dom', 'chat']), posicionar(modelo, {}, ['dom', 'chat']));
  });
});

describe('montarDiagrama', () => {
  const modelo = montarModelo(colunas, primarias, estrangeiras, configuracao);
  const { tabelas } = posicionar(modelo, {}, ['dom', 'chat']);

  it('lista os grupos na ordem da configuração, só os que têm tabela, e cria "outros" quando preciso', () => {
    const diagrama = montarDiagrama(tabelas, configuracao, 'origem', []);
    assert.deepEqual(diagrama.grupos.map((grupo) => grupo.id), ['dom', 'chat', 'outros']);
    assert.equal(diagrama.grupos[2].rotulo, 'Sem grupo');
    const semChat = montarDiagrama(tabelas.filter((tabela) => tabela.grupo !== 'chat'), configuracao, 'origem', []);
    assert.deepEqual(semChat.grupos.map((grupo) => grupo.id), ['dom', 'outros']);
  });
});
