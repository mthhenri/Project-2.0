import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ModelagemGrupoDto } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { ChaveBanco, ColocacaoDeTabela, ColunaBanco } from '../domain/modelagem';
import { ModelagemCatalogoRepository } from '../repositories/modelagem-catalogo.repository';
import { ModelagemGrupoRepository } from '../repositories/modelagem-grupo.repository';
import { ModelagemTabelaRepository } from '../repositories/modelagem-tabela.repository';
import { ModelagemService } from './modelagem.service';

function coluna(tabela: string, nome: string, extras: Partial<ColunaBanco> = {}): ColunaBanco {
  return { tabela, coluna: nome, tipo: 'integer', tipoInterno: 'int4', anulavel: false, padrao: null, ...extras };
}

/** Repositórios em memória: o catálogo (projeto, demanda, tipo_projeto_status), os grupos e as posições guardadas. */
function montar(opcoes: { ultimaMigration?: string | null; grupos?: ModelagemGrupoDto[]; colocacoes?: ColocacaoDeTabela[] } = {}) {
  const estado = {
    grupos: opcoes.grupos ?? [{ id: 1, titulo: 'Domínio', rotulo: 'Domínio', corIndice: 0 }],
    colocacoes: opcoes.colocacoes ?? [{ nomeTabela: 'projeto', grupoId: 1, x: 10, y: 20 }, { nomeTabela: 'demanda', grupoId: 1, x: 400, y: 20 }],
    leiturasDoCatalogo: 0,
    excluidos: [] as number[],
    inseridos: [] as unknown[],
    falhaDoBanco: null as unknown,
    removidas: [] as string[],
  };
  const catalogo = {
    listarColunas: async () => {
      estado.leiturasDoCatalogo++;
      return [
        coluna('projeto', 'id', { padrao: "nextval('a'::regclass)" }), coluna('projeto', 'tipo_projeto_status_id'),
        coluna('tipo_projeto_status', 'id', { padrao: "nextval('b'::regclass)" }),
        coluna('demanda', 'id', { padrao: "nextval('c'::regclass)" }), coluna('demanda', 'projeto_id'),
      ];
    },
    listarChavesPrimarias: async (): Promise<ChaveBanco[]> => ['projeto', 'tipo_projeto_status', 'demanda'].map((tabela) => ({ tabela, coluna: 'id' })),
    listarChavesEstrangeiras: async (): Promise<ChaveBanco[]> => [
      { tabela: 'projeto', coluna: 'tipo_projeto_status_id', tabelaDestino: 'tipo_projeto_status', colunaDestino: 'id' },
      { tabela: 'demanda', coluna: 'projeto_id', tabelaDestino: 'projeto', colunaDestino: 'id' },
    ],
    obterUltimaMigration: async () => (opcoes.ultimaMigration === undefined ? '0099 - Teste.sql' : opcoes.ultimaMigration),
  } as unknown as ModelagemCatalogoRepository;
  const grupoRepository = {
    listar: async () => estado.grupos,
    recuperar: async (dto: { id: number }) => estado.grupos.find((grupo) => grupo.id === dto.id) ?? null,
    obterMaiorOrdem: async () => estado.grupos.length,
    inserir: async (dto: { titulo: string; rotulo: string; ordem: number; corIndice: number }) => {
      if (estado.falhaDoBanco) throw estado.falhaDoBanco;
      estado.inseridos.push(dto);
      return { id: 50, titulo: dto.titulo, rotulo: dto.rotulo, corIndice: dto.corIndice };
    },
    alterar: async (dto: { id: number; titulo: string; rotulo: string }) => {
      if (estado.falhaDoBanco) throw estado.falhaDoBanco;
      return { id: dto.id, titulo: dto.titulo, rotulo: dto.rotulo, corIndice: 0 };
    },
    excluir: async (dto: { id: number }) => void estado.excluidos.push(dto.id),
    validarRotulo: async (dto: { rotulo: string; idExcluir?: number }) =>
      estado.grupos.some((grupo) => grupo.rotulo.toLowerCase() === dto.rotulo.toLowerCase() && grupo.id !== dto.idExcluir),
  } as unknown as ModelagemGrupoRepository;
  const tabelaRepository = {
    listar: async () => estado.colocacoes,
    remover: async (dto: { nomeTabela: string }) => {
      estado.removidas.push(dto.nomeTabela);
      estado.colocacoes = estado.colocacoes.filter((colocacao) => colocacao.nomeTabela !== dto.nomeTabela);
    },
    gravar: async (dto: { nomeTabela: string; grupoId: number; x: number; y: number }) => {
      estado.colocacoes = [...estado.colocacoes.filter((colocacao) => colocacao.nomeTabela !== dto.nomeTabela), { ...dto }];
      return { nomeTabela: dto.nomeTabela, grupoId: dto.grupoId, x: dto.x, y: dto.y };
    },
  } as unknown as ModelagemTabelaRepository;
  return { service: new ModelagemService(catalogo, grupoRepository, tabelaRepository), estado };
}

test('monta o diagrama com a origem, os grupos do banco e a posição guardada de cada tabela da modelagem', async () => {
  const { service } = montar();
  const diagrama = (await service.obterDiagrama()).dados!;
  assert.equal(diagrama.origem, 'PostgreSQL · última migration: 0099 - Teste');
  assert.deepEqual(diagrama.grupos.map((grupo) => grupo.rotulo), ['Domínio']);
  const projeto = diagrama.tabelas.find((tabela) => tabela.nome === 'projeto')!;
  assert.deepEqual([projeto.grupoId, projeto.x, projeto.y], [1, 10, 20]);
  assert.deepEqual(projeto.colunas.map((coluna) => [coluna.nome, coluna.marca]), [['id', 'pk'], ['tipo_projeto_status_id', 'fk']]);
});

test('tabela do banco sem linha guardada fica fora da modelagem, no canto, sem herdar grupo, e o diagrama avisa', async () => {
  const { service } = montar();
  const diagrama = (await service.obterDiagrama()).dados!;
  const fora = diagrama.tabelas.find((tabela) => tabela.nome === 'tipo_projeto_status')!;
  assert.equal(fora.grupoId, null);
  assert.ok(fora.y > 20);
  assert.equal(diagrama.avisos.length, 1);
  assert.match(diagrama.avisos[0], /tipo_projeto_status/);
});

test('sem migration aplicada a origem diz isso', async () => {
  const { service } = montar({ ultimaMigration: null });
  assert.match((await service.obterDiagrama()).dados!.origem, /nenhuma aplicada/);
});

test('guarda o catálogo em memória por um tempo, mas lê os grupos e as posições de novo a cada vez', async (contexto) => {
  const { service, estado } = montar();
  const relogio = contexto.mock.method(Date, 'now', () => 1_000);
  await service.obterDiagrama();
  estado.grupos = [...estado.grupos, { id: 2, titulo: 'Outro', rotulo: 'Outro', corIndice: 1 }];
  const segundo = (await service.obterDiagrama()).dados!;
  assert.equal(estado.leiturasDoCatalogo, 1);
  assert.equal(segundo.grupos.length, 2);
  relogio.mock.mockImplementation(() => 1_000 + 61_000);
  await service.obterDiagrama();
  assert.equal(estado.leiturasDoCatalogo, 2);
});

test('criar grupo guarda o texto aparado, vai para o fim e usa a cor menos usada', async () => {
  const { service, estado } = montar({
    grupos: [
      { id: 1, titulo: 'A', rotulo: 'A', corIndice: 0 },
      { id: 2, titulo: 'B', rotulo: 'B', corIndice: 1 },
      { id: 3, titulo: 'C', rotulo: 'C', corIndice: 1 },
    ],
  });
  const resposta = await service.criarGrupo({ titulo: '  Ponto do dia  ', rotulo: ' Ponto ' });
  assert.equal(resposta.sucesso, true);
  assert.deepEqual(estado.inseridos, [{ titulo: 'Ponto do dia', rotulo: 'Ponto', ordem: 4, corIndice: 2 }]);
});

test('criar grupo recusa rótulo repetido (sem diferenciar maiúsculas) e texto vazio', async () => {
  const { service } = montar();
  await assert.rejects(service.criarGrupo({ titulo: 'Outro', rotulo: 'domínio' }), BusinessException);
  await assert.rejects(service.criarGrupo({ titulo: '   ', rotulo: 'X' }), BusinessException);
});

test('alterar grupo aceita manter o próprio rótulo e recusa o de outro grupo', async () => {
  const { service } = montar({ grupos: [{ id: 1, titulo: 'A', rotulo: 'A', corIndice: 0 }, { id: 2, titulo: 'B', rotulo: 'B', corIndice: 1 }] });
  assert.equal((await service.alterarGrupo({ id: 1, titulo: 'A novo', rotulo: 'A' })).dados!.titulo, 'A novo');
  await assert.rejects(service.alterarGrupo({ id: 1, titulo: 'A', rotulo: 'B' }), BusinessException);
  await assert.rejects(service.alterarGrupo({ id: 9, titulo: 'X', rotulo: 'X' }), ResourceNotFoundException);
});

test('excluir grupo: só vazio e que exista', async () => {
  const { service, estado } = montar({ grupos: [{ id: 1, titulo: 'A', rotulo: 'A', corIndice: 0 }, { id: 2, titulo: 'B', rotulo: 'B', corIndice: 1 }] });
  await assert.rejects(service.excluirGrupo({ id: 1 }), BusinessException);
  await assert.rejects(service.excluirGrupo({ id: 9 }), ResourceNotFoundException);
  assert.equal((await service.excluirGrupo({ id: 2 })).sucesso, true);
  assert.deepEqual(estado.excluidos, [2]);
});

test('alterar tabela da modelagem grava grupo e posição; recusa tabela que não existe, grupo que não existe e pedido vazio', async () => {
  const { service } = montar({ grupos: [{ id: 1, titulo: 'A', rotulo: 'A', corIndice: 0 }, { id: 2, titulo: 'B', rotulo: 'B', corIndice: 1 }] });
  const resposta = await service.alterarTabela({ nomeTabela: 'demanda', grupoId: 2, x: 5, y: 6 });
  assert.deepEqual(resposta.dados, { nome: 'demanda', grupoId: 2, x: 5, y: 6 });
  await assert.rejects(service.alterarTabela({ nomeTabela: 'fantasma', grupoId: 1, x: 0, y: 0 }), ResourceNotFoundException);
  await assert.rejects(service.alterarTabela({ nomeTabela: 'demanda', grupoId: 77, x: 0, y: 0 }), ResourceNotFoundException);
  await assert.rejects(service.alterarTabela({ nomeTabela: 'demanda' }), BusinessException);
});

test('alterar só a posição mantém o grupo que está gravado agora; alterar só o grupo mantém a posição', async () => {
  const { service, estado } = montar({ grupos: [{ id: 1, titulo: 'A', rotulo: 'A', corIndice: 0 }, { id: 2, titulo: 'B', rotulo: 'B', corIndice: 1 }] });
  assert.deepEqual((await service.alterarTabela({ nomeTabela: 'projeto', x: 99, y: 98 })).dados, { nome: 'projeto', grupoId: 1, x: 99, y: 98 });
  // Outra pessoa trocou o grupo no meio: o servidor mantém o que está lá, não o que a tela de quem arrasta achava.
  estado.colocacoes = estado.colocacoes.map((colocacao) => (colocacao.nomeTabela === 'projeto' ? { ...colocacao, grupoId: 2 } : colocacao));
  assert.deepEqual((await service.alterarTabela({ nomeTabela: 'projeto', x: 1, y: 2 })).dados, { nome: 'projeto', grupoId: 2, x: 1, y: 2 });
  assert.deepEqual((await service.alterarTabela({ nomeTabela: 'projeto', grupoId: 1 })).dados, { nome: 'projeto', grupoId: 1, x: 1, y: 2 });
});

test('pôr uma tabela de fora na modelagem exige um grupo; sem posição ela cai embaixo das do grupo; com posição, onde foi solta', async () => {
  const { service, estado } = montar();
  await assert.rejects(service.alterarTabela({ nomeTabela: 'tipo_projeto_status', x: 5, y: 5 }), BusinessException);

  const automatica = (await service.alterarTabela({ nomeTabela: 'tipo_projeto_status', grupoId: 1 })).dados!;
  assert.equal(automatica.grupoId, 1);
  assert.equal(automatica.x, 10);
  assert.ok(automatica.y > 20);
  assert.ok(estado.colocacoes.some((colocacao) => colocacao.nomeTabela === 'tipo_projeto_status'));

  const { service: outro } = montar();
  assert.deepEqual((await outro.alterarTabela({ nomeTabela: 'tipo_projeto_status', grupoId: 1, x: 700, y: 800 })).dados, { nome: 'tipo_projeto_status', grupoId: 1, x: 700, y: 800 });
});

test('tirar da modelagem só remove a linha da tabela (nunca a do banco) e conta como feito para tabela que já estava fora', async () => {
  const { service, estado } = montar();
  assert.equal((await service.removerTabela({ nomeTabela: 'demanda' })).sucesso, true);
  assert.deepEqual(estado.removidas, ['demanda']);
  const depois = (await service.obterDiagrama()).dados!.tabelas.find((tabela) => tabela.nome === 'demanda')!;
  assert.equal(depois.grupoId, null);
  assert.equal((await service.removerTabela({ nomeTabela: 'tipo_projeto_status' })).sucesso, true);
  await assert.rejects(service.removerTabela({ nomeTabela: 'fantasma' }), ResourceNotFoundException);
});

test('rótulo repetido pego só pelo índice único do banco (pedidos ao mesmo tempo) vira a mesma recusa de negócio', async () => {
  const { service, estado } = montar();
  estado.falhaDoBanco = { code: '23505' };
  await assert.rejects(service.criarGrupo({ titulo: 'Novo', rotulo: 'Novo' }), BusinessException);
  await assert.rejects(service.alterarGrupo({ id: 1, titulo: 'Novo', rotulo: 'Novo' }), BusinessException);
  estado.falhaDoBanco = new Error('outra falha');
  await assert.rejects(service.criarGrupo({ titulo: 'Novo', rotulo: 'Novo' }), /outra falha/);
});

test('tabela que não está no cache é conferida de novo no banco antes de ser recusada', async () => {
  const { service, estado } = montar();
  await service.obterDiagrama();
  await assert.rejects(service.alterarTabela({ nomeTabela: 'fantasma', grupoId: 1, x: 0, y: 0 }), ResourceNotFoundException);
  assert.equal(estado.leiturasDoCatalogo, 2);
});
