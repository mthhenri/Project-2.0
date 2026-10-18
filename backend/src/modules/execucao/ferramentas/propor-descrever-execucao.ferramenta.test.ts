import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { NivelIaEnum, TipoPropostaIaEnum, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { IaSolicitacao } from '../../ia/domain/ia.tipos';
import { IaService } from '../../ia/services/ia.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ExecucaoService } from '../services/execucao.service';
import { ProporDescreverExecucaoFerramenta } from './propor-descrever-execucao.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const AGORA = new Date('2026-10-19T14:00:00Z');

function montar(opcoes: { ativa?: boolean; redigida?: string; rigor?: boolean } = {}) {
  const propostas: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const geradas: IaSolicitacao[] = [];
  const tiposDePrompt: TipoPromptEnum[] = [];
  const propostaIaService = {
    criar: async (dto: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => {
      propostas.push(dto);
      return { id: 9, status: 'PENDENTE' };
    },
  };
  const execucaoService = {
    recuperarAtiva: async () => ({ dados: opcoes.ativa === false ? null : { id: 5, atividadeId: 7, descricao: 'Revisão', inicioData: new Date('2026-10-19T11:20:00Z') } }),
    listar: async () => ({ dados: { itens: [{ id: 5, nomeAtividade: 'Teste ABC', nomeDemanda: 'IA', nomeProjeto: 'Zênite' }] } }),
  };
  const atividadeService = { recuperar: async ({ id }: { id: number }) => ({ dados: { id, nome: id === 10 ? 'AAA' : 'Outra' } }) };
  const iaService = {
    gerar: async (solicitacao: IaSolicitacao) => {
      geradas.push(solicitacao);
      return { texto: opcoes.redigida ?? 'Revisão da documentação do chat, com correção de erros de digitação.' };
    },
  };
  const promptService = {
    obterAtivo: async (tipo: TipoPromptEnum) => {
      tiposDePrompt.push(tipo);
      return { conteudo: 'PROMPT DE DESCRICAO' };
    },
  };
  const configuracaoIaService = { obterAtiva: async () => ({ duracaoRecomendadaMinutos: 90, rigorProporcional: opcoes.rigor ?? true }) };
  const ferramenta = new (class extends ProporDescreverExecucaoFerramenta {
    protected agora(): Date {
      return AGORA;
    }
  })(
    propostaIaService as unknown as PropostaIaService,
    execucaoService as unknown as ExecucaoService,
    atividadeService as unknown as AtividadeService,
    iaService as unknown as IaService,
    promptService as unknown as PromptService,
    configuracaoIaService as unknown as ConfiguracaoIaService,
  );
  return { ferramenta, propostas, geradas, tiposDePrompt };
}

test('redige no nível padrão com o prompt DESCRICAO_EXECUCAO e o rigor, e propõe sem a narrativa crua', async () => {
  const { ferramenta, propostas, geradas, tiposDePrompt } = montar();
  const resultado = (await ferramenta.executar({ relato: 'mexi no e-mail duplicado e arrumei uns typos' }, USUARIO)) as { propostaId: number };
  assert.equal(resultado.propostaId, 9);
  assert.deepEqual(tiposDePrompt, [TipoPromptEnum.DESCRICAO_EXECUCAO]);
  assert.equal(geradas[0].nivel, NivelIaEnum.PADRAO);
  assert.match(String(geradas[0].instrucoes), /PROMPT DE DESCRICAO[\s\S]*mais completa/); // 2h40 acima de 1h30, rigor ligado
  assert.match(String(geradas[0].mensagens[0].conteudo), /mexi no e-mail duplicado/);

  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.DESCREVER_EXECUCAO);
  assert.equal(propostas[0].usuarioId, 7);
  assert.deepEqual(propostas[0].dados, {
    descricao: 'Revisão da documentação do chat, com correção de erros de digitação.',
    escolha: 'CONTINUAR',
    execucaoId: 5,
    atividadeNome: 'Teste ABC',
    demandaNome: 'IA',
    minutos: 160,
  });
  assert.equal(JSON.stringify(propostas[0].dados).includes('typos'), false, 'o relato cru não vai para a proposta');
});

test('com o rigor desligado a redação pede descrição curta', async () => {
  const { ferramenta, geradas } = montar({ rigor: false });
  await ferramenta.executar({ relato: 'mexi no e-mail duplicado' }, USUARIO);
  assert.match(String(geradas[0].instrucoes), /curta: uma ou duas frases/);
});

test('trocar leva a atividade seguinte (conferida pelo acesso) e a descrição provisória', async () => {
  const { ferramenta, propostas } = montar();
  await ferramenta.executar({ relato: 'terminei', escolha: 'TROCAR', atividadeSeguinteId: 10, descricaoSeguinte: 'Verificar o Gemini' }, USUARIO);
  assert.equal(propostas[0].dados['escolha'], 'TROCAR');
  assert.equal(propostas[0].dados['atividadeSeguinteId'], 10);
  assert.equal(propostas[0].dados['atividadeSeguinteNome'], 'AAA');
  assert.equal(propostas[0].dados['descricaoSeguinte'], 'Verificar o Gemini');
});

test('trocar sem atividade, ou para a mesma da execução, não gera proposta nem chama a redação', async () => {
  const { ferramenta, propostas, geradas } = montar();
  await assert.rejects(ferramenta.executar({ relato: 'terminei', escolha: 'TROCAR' }, USUARIO), BusinessException);
  await assert.rejects(ferramenta.executar({ relato: 'terminei', escolha: 'TROCAR', atividadeSeguinteId: 7 }, USUARIO), BusinessException);
  assert.equal(propostas.length, 0);
  assert.equal(geradas.length, 0);
});

test('sem execução em andamento não há o que descrever', async () => {
  const { ferramenta, propostas, geradas } = montar({ ativa: false });
  await assert.rejects(ferramenta.executar({ relato: 'mexi em algo' }, USUARIO), BusinessException);
  assert.equal(propostas.length, 0);
  assert.equal(geradas.length, 0);
});

test('relato sem trabalho (almoço, pausa) não vira descrição', async () => {
  const { ferramenta, propostas } = montar({ redigida: 'NENHUM_TRABALHO' });
  await assert.rejects(ferramenta.executar({ relato: 'fui almoçar' }, USUARIO), BusinessException);
  assert.equal(propostas.length, 0);
});

test('a descrição redigida sai sem os caracteres proibidos', async () => {
  const { ferramenta, propostas } = montar({ redigida: 'Descrição: Ajuste do campo "e-mail" no cadastro.' });
  await ferramenta.executar({ relato: 'ajustei o campo de e-mail' }, USUARIO);
  assert.equal(propostas[0].dados['descricao'], 'Ajuste do campo e-mail no cadastro.');
});
