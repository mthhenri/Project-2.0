import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { DemandaService } from '../../demanda/services/demanda.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { TagService } from '../../tag/services/tag.service';
import { calcularConjuntoDeTags, mesmoConjuntoDeTags } from '../domain/conjunto-de-tags';
import { AtribuirTagExecutor } from '../executores/atribuir-tag.executor';
import { AtividadeService } from '../services/atividade.service';
import { ProporAtribuirTagFerramenta } from './propor-atribuir-tag.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

/** Valida que a `BusinessException` traz o texto (a mensagem fica no corpo da resposta HTTP, não em `message`). */
const contem = (texto: string) => (erro: BusinessException) => JSON.stringify(erro.getResponse()).includes(texto);

const TAGS = [{ id: 1, nome: 'Bug', cor: '#ef4444' }, { id: 2, nome: 'Backend', cor: '#3b82f6' }, { id: 3, nome: 'Urgente', cor: '#f97316' }];

test('calcularConjuntoDeTags acrescenta, tira, não repete e ordena; mesmoConjuntoDeTags ignora ordem', () => {
  assert.deepEqual(calcularConjuntoDeTags([3, 1], [2, 1], [3]), [1, 2]);
  assert.deepEqual(calcularConjuntoDeTags([], undefined, undefined), []);
  assert.equal(mesmoConjuntoDeTags([1, 2], [2, 1]), true);
  assert.equal(mesmoConjuntoDeTags([1, 2], [1]), false);
});

/** Services em memória: a demanda 4 e a atividade 9 (da demanda 4), cada uma com um conjunto de tags. */
function criarServicos(tagsDaDemanda: number[], tagsDaAtividade: number[]) {
  const estado = { DEMANDA: [...tagsDaDemanda], ATIVIDADE: [...tagsDaAtividade] };
  const gravacoes: string[] = [];
  const tags = (ids: number[]) => ids.map((id) => TAGS.find((tag) => tag.id === id)!);
  const demandaService = {
    recuperar: async () => ({ dados: { id: 4, nome: 'Tela de login' } }),
    listarTagsDemanda: async () => ({ dados: tags(estado.DEMANDA) }),
    alterarTagsDemanda: async (dto: { demandaId: number; tagIds: number[] }) => { gravacoes.push(`demanda:${dto.tagIds.join(',')}`); estado.DEMANDA = [...dto.tagIds]; return {}; },
  };
  const atividadeService = {
    recuperar: async () => ({ dados: { id: 9, nome: 'Montar o formulário', demandaId: 4 } }),
    listarTags: async () => ({ dados: tags(estado.ATIVIDADE) }),
    alterarTags: async (dto: { id: number; tagIds: number[] }) => { gravacoes.push(`atividade:${dto.tagIds.join(',')}`); estado.ATIVIDADE = [...dto.tagIds]; return {}; },
  };
  return { demandaService: demandaService as unknown as DemandaService, atividadeService: atividadeService as unknown as AtividadeService, estado, gravacoes };
}

function criarFerramenta(tagsDaDemanda: number[] = [1], tagsDaAtividade: number[] = []) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } };
  const tagService = { listar: async () => ({ dados: TAGS }) };
  const { demandaService, atividadeService } = criarServicos(tagsDaDemanda, tagsDaAtividade);
  const ferramenta = new ProporAtribuirTagFerramenta(propostaIaService as unknown as PropostaIaService, demandaService, atividadeService, tagService as unknown as TagService);
  return { ferramenta, propostas };
}

test('propor numa demanda calcula o antes e o depois, com nomes, e guarda só o que muda', async () => {
  const { ferramenta, propostas } = criarFerramenta([1]);
  await ferramenta.executar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2, 1], removerTagIds: [3] }, GESTOR);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.ATRIBUIR_TAG);
  assert.deepEqual(propostas[0].dados, {
    alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2], removerTagIds: [], alvoNome: 'Tela de login', tagsAntesNomes: ['Bug'], tagsDepoisNomes: ['Bug', 'Backend'],
  });
  assert.equal(ferramenta.permissao, 'QUALQUER');
});

test('propor numa atividade mostra também a demanda dela', async () => {
  const { ferramenta, propostas } = criarFerramenta([1], [2]);
  await ferramenta.executar({ alvo: 'ATIVIDADE', alvoId: 9, removerTagIds: [2] }, GESTOR);
  assert.equal(propostas[0].dados['alvoNome'], 'Montar o formulário');
  assert.equal(propostas[0].dados['demandaNome'], 'Tela de login');
  assert.deepEqual(propostas[0].dados['tagsDepoisNomes'], []);
});

test('propor recusa tag inexistente, entrada vazia, conflito e nada a alterar, sem criar proposta', async () => {
  const { ferramenta, propostas } = criarFerramenta([1]);
  await assert.rejects(ferramenta.executar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [99] }, GESTOR), contem('inexistente'));
  await assert.rejects(ferramenta.executar({ alvo: 'DEMANDA', alvoId: 4 }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2], removerTagIds: [2] }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [1], removerTagIds: [3] }, GESTOR), BusinessException);
  assert.equal(propostas.length, 0);
});

test('executar aplica a diferença sobre as tags de agora (não sobre as da proposta) e desfazer devolve as de antes', async () => {
  const { demandaService, atividadeService, estado, gravacoes } = criarServicos([1], []);
  const executor = new AtribuirTagExecutor(demandaService, atividadeService);
  // Outra pessoa acrescentou a tag 3 depois de a proposta nascer: ela precisa sobreviver.
  estado.DEMANDA = [1, 3];
  const resultado = await executor.executar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2], removerTagIds: [] }, GESTOR);
  assert.deepEqual(estado.DEMANDA, [1, 2, 3]);
  assert.deepEqual(resultado['tagsAntesIds'], [1, 3]);
  await executor.desfazer(resultado, GESTOR);
  assert.deepEqual(estado.DEMANDA, [1, 3]);
  assert.deepEqual(gravacoes, ['demanda:1,2,3', 'demanda:1,3']);
});

test('numa atividade, executar e desfazer usam a service da atividade', async () => {
  const { demandaService, atividadeService, estado } = criarServicos([], [2]);
  const executor = new AtribuirTagExecutor(demandaService, atividadeService);
  const resultado = await executor.executar({ alvo: 'ATIVIDADE', alvoId: 9, adicionarTagIds: [1], removerTagIds: [2] }, GESTOR);
  assert.deepEqual(estado.ATIVIDADE, [1]);
  await executor.desfazer(resultado, GESTOR);
  assert.deepEqual(estado.ATIVIDADE, [2]);
});

test('desfazer é recusado se as tags mudaram depois', async () => {
  const { demandaService, atividadeService, estado, gravacoes } = criarServicos([1], []);
  const executor = new AtribuirTagExecutor(demandaService, atividadeService);
  const resultado = await executor.executar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2] }, GESTOR);
  estado.DEMANDA = [3];
  gravacoes.length = 0;
  await assert.rejects(executor.desfazer(resultado, GESTOR), BusinessException);
  assert.deepEqual(gravacoes, []);
});

test('validar confere os dados; obsoleta quando o alvo já tem o conjunto pedido', async () => {
  const { demandaService, atividadeService } = criarServicos([1, 2], []);
  const executor = new AtribuirTagExecutor(demandaService, atividadeService);
  assert.doesNotThrow(() => executor.validar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2], tagsAntesNomes: ['Bug'] }));
  assert.throws(() => executor.validar({ alvo: 'DEMANDA', alvoId: 4 }), BusinessException);
  assert.throws(() => executor.validar({ alvo: 'PROJETO', alvoId: 4, adicionarTagIds: [2] }), BusinessException);
  assert.equal(await executor.estaObsoleta({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2] }, GESTOR), true);
  assert.equal(await executor.estaObsoleta({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [3] }, GESTOR), false);
});

test('o desenvolvedor propõe, executa e desfaz tags na atividade e na demanda (quem pode, a service do alvo decide)', async () => {
  const { ferramenta, propostas } = criarFerramenta([1], [2]);
  await ferramenta.executar({ alvo: 'ATIVIDADE', alvoId: 9, adicionarTagIds: [1] }, DESENVOLVEDOR);
  await ferramenta.executar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2] }, DESENVOLVEDOR);
  assert.equal(propostas.length, 2);

  const { demandaService, atividadeService, estado } = criarServicos([1], [2]);
  const executor = new AtribuirTagExecutor(demandaService, atividadeService);
  const daAtividade = await executor.executar({ alvo: 'ATIVIDADE', alvoId: 9, adicionarTagIds: [1] }, DESENVOLVEDOR);
  assert.deepEqual(estado.ATIVIDADE, [1, 2]);
  await executor.desfazer(daAtividade, DESENVOLVEDOR);
  assert.deepEqual(estado.ATIVIDADE, [2]);
  const daDemanda = await executor.executar({ alvo: 'DEMANDA', alvoId: 4, adicionarTagIds: [2] }, DESENVOLVEDOR);
  assert.deepEqual(estado.DEMANDA, [1, 2]);
  await executor.desfazer(daDemanda, DESENVOLVEDOR);
  assert.deepEqual(estado.DEMANDA, [1]);
});
