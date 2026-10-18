import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { NivelIaEnum, TipoPropostaIaEnum, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { IaService } from '../../ia/services/ia.service';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ProporDescreverDemandaFerramenta } from '../ferramentas/propor-descrever-demanda.ferramenta';
import { DemandaService } from '../services/demanda.service';
import { DescreverDemandaExecutor } from './descrever-demanda.executor';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

interface Demanda {
  id: number;
  nome: string;
  projetoId: number;
  descricaoCliente: string | null;
  descricaoTecnica: string | null;
}

function montarServico(inicial: Demanda) {
  const demanda = { ...inicial };
  const alteracoes: Record<string, unknown>[] = [];
  const servico = {
    recuperar: async () => ({ dados: { ...demanda } }),
    alterar: async (dto: Record<string, unknown>) => {
      alteracoes.push(dto);
      if ('descricaoCliente' in dto) demanda.descricaoCliente = dto['descricaoCliente'] as string | null;
      if ('descricaoTecnica' in dto) demanda.descricaoTecnica = dto['descricaoTecnica'] as string | null;
      return { dados: { ...demanda } };
    },
  };
  return { servico: servico as unknown as DemandaService, demanda, alteracoes };
}

const VAZIA: Demanda = { id: 3, nome: 'Novo cadastro', projetoId: 5, descricaoCliente: null, descricaoTecnica: null };

test('grava só as descrições da proposta pelo usuário do token e guarda o texto anterior', async () => {
  const { servico, alteracoes } = montarServico({ ...VAZIA, descricaoTecnica: 'Antiga técnica' });
  const resultado = await new DescreverDemandaExecutor(servico).executar({ demandaId: 3, descricaoCliente: 'O cliente quer um cadastro simples.' }, GESTOR);
  assert.deepEqual(alteracoes, [{ id: 3, descricaoCliente: 'O cliente quer um cadastro simples.' }]);
  assert.deepEqual(resultado, { demandaId: 3, gravouCliente: 'O cliente quer um cadastro simples.', anteriorCliente: null });
});

test('desfazer restaura os textos anteriores quando ainda são os que a IA gravou', async () => {
  const { servico, demanda } = montarServico({ ...VAZIA, descricaoCliente: 'Antes do cliente', descricaoTecnica: 'Antes técnico' });
  const executor = new DescreverDemandaExecutor(servico);
  const resultado = await executor.executar({ demandaId: 3, descricaoCliente: 'Novo cliente', descricaoTecnica: 'Novo técnico' }, GESTOR);
  await executor.desfazer(resultado, GESTOR);
  assert.equal(demanda.descricaoCliente, 'Antes do cliente');
  assert.equal(demanda.descricaoTecnica, 'Antes técnico');
});

test('desfazer recusa quando outra pessoa editou o texto depois (não perde a edição dela)', async () => {
  const { servico, demanda, alteracoes } = montarServico(VAZIA);
  const executor = new DescreverDemandaExecutor(servico);
  const resultado = await executor.executar({ demandaId: 3, descricaoTecnica: 'Texto da IA' }, GESTOR);
  demanda.descricaoTecnica = 'Texto da IA, editado por alguém';
  const antes = alteracoes.length;
  await assert.rejects(executor.desfazer(resultado, GESTOR), BusinessException);
  assert.equal(alteracoes.length, antes);
  assert.equal(demanda.descricaoTecnica, 'Texto da IA, editado por alguém');
});

test('os dados são validados: ao menos uma descrição e nenhum campo desconhecido', () => {
  const executor = new DescreverDemandaExecutor(montarServico(VAZIA).servico);
  assert.throws(() => executor.validar({ demandaId: 3 }), BusinessException);
  assert.throws(() => executor.validar({ demandaId: 3, descricaoCliente: 'x', nome: 'Outro nome' }), BusinessException);
  assert.doesNotThrow(() => executor.validar({ demandaId: 3, descricaoCliente: 'Pedido', demandaNome: 'Novo cadastro' }));
});

function montarFerramenta(opcoes: { resposta?: string } = {}) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const geradas: { nivel: NivelIaEnum; instrucoes: string; mensagens: { conteudo: unknown }[] }[] = [];
  const tiposDePrompt: TipoPromptEnum[] = [];
  const propostaIaService = {
    criar: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => {
      propostas.push(dto);
      return { id: 70, status: 'PENDENTE' };
    },
  };
  const demandaService = { recuperar: async () => ({ dados: { ...VAZIA, descricaoCliente: 'Já existente' } }) };
  const projetoService = { recuperar: async () => ({ dados: { nome: 'GR' } }) };
  const iaService = {
    gerar: async (solicitacao: { nivel: NivelIaEnum; instrucoes: string; mensagens: { conteudo: unknown }[] }) => {
      geradas.push(solicitacao);
      return { texto: opcoes.resposta ?? JSON.stringify({ descricaoCliente: 'O cliente pediu um cadastro.', descricaoTecnica: '- Criar a tela' }) };
    },
  };
  const promptService = {
    obterAtivo: async (tipo: TipoPromptEnum) => {
      tiposDePrompt.push(tipo);
      return { conteudo: 'Entreviste o gestor.' };
    },
  };
  const ferramenta = new ProporDescreverDemandaFerramenta(
    propostaIaService as unknown as PropostaIaService,
    demandaService as unknown as DemandaService,
    projetoService as unknown as ProjetoService,
    iaService as unknown as IaService,
    promptService as unknown as PromptService,
  );
  return { ferramenta, propostas, geradas, tiposDePrompt };
}

test('a ferramenta é do gestor, redige no nível analítico com o prompt da entrevista e só propõe', async () => {
  const { ferramenta, propostas, geradas, tiposDePrompt } = montarFerramenta();
  assert.equal(ferramenta.permissao, 'GESTOR');
  const resultado = (await ferramenta.executar({ demandaId: 3, relatoDoCliente: 'Quer cadastrar parceiros', relatoTecnico: 'Criar tela e API' }, GESTOR)) as { propostaId: number };
  assert.equal(resultado.propostaId, 70);
  assert.equal(geradas[0].nivel, NivelIaEnum.ANALITICO);
  assert.deepEqual(tiposDePrompt, [TipoPromptEnum.ENTREVISTA_DEMANDA]);
  assert.match(geradas[0].instrucoes, /Nunca invente/);
  assert.match(String(geradas[0].mensagens[0].conteudo), /Quer cadastrar parceiros/);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.DESCREVER_DEMANDA);
  assert.deepEqual(propostas[0].dados, { demandaId: 3, descricaoCliente: 'O cliente pediu um cadastro.', descricaoTecnica: '- Criar a tela', demandaNome: 'Novo cadastro', projetoNome: 'GR' });
});

test('sem entrevista (nenhum relato) não redige nem cria proposta', async () => {
  const { ferramenta, propostas, geradas } = montarFerramenta();
  await assert.rejects(ferramenta.executar({ demandaId: 3 }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ demandaId: 3, relatoDoCliente: '   ' }, GESTOR), BusinessException);
  assert.equal(geradas.length, 0);
  assert.equal(propostas.length, 0);
});

test('só vira descrição o campo que tem relato, e a descrição já existente vai à redação para não se perder', async () => {
  const { ferramenta, propostas, geradas } = montarFerramenta({ resposta: JSON.stringify({ descricaoCliente: 'Pedido refeito', descricaoTecnica: 'inventada' }) });
  await ferramenta.executar({ demandaId: 3, relatoDoCliente: 'Mais um pedido' }, GESTOR);
  assert.equal(propostas[0].dados['descricaoTecnica'], undefined);
  assert.equal(propostas[0].dados['descricaoCliente'], 'Pedido refeito');
  assert.match(geradas[0].instrucoes, /incorporar sem perder nada: Já existente/);
});

test('resposta da redação que não dá para ler recusa a proposta', async () => {
  const { ferramenta, propostas } = montarFerramenta({ resposta: 'não consegui' });
  await assert.rejects(ferramenta.executar({ demandaId: 3, relatoTecnico: 'x' }, GESTOR), BusinessException);
  assert.equal(propostas.length, 0);
});
