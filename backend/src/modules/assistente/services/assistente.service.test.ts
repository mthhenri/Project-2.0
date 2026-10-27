import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { NivelIaEnum, PlanoAbaEnum, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { IaException } from '../../ia/domain/ia.exception';
import { AssistenteService } from './assistente.service';

// SYSTEM.SPEC.md §12 (`assistente`): refina a descrição pela camada de IA, no nível padrão; falha da IA vira BusinessException.

function criar(resposta: string | Error = 'Texto refinado') {
  const chamadas: Record<string, unknown>[] = [];
  const iaService = {
    gerar: async (pedido: Record<string, unknown>) => {
      chamadas.push(pedido);
      if (resposta instanceof Error) throw resposta;
      return { texto: resposta };
    },
  };
  return { servico: new AssistenteService(iaService as never, {} as never, {} as never, {} as never), chamadas };
}

const promptDe = (chamada: Record<string, unknown>) => (chamada.mensagens as { papel: string; conteudo: string }[])[0].conteudo;
const mensagemDe = (erro: unknown) => ((erro as BusinessException).getResponse() as { mensagem: string }).mensagem;

test('chama a IA no nível padrão com o texto do usuário, o tipo e o nome da entidade no prompt', async () => {
  const { servico, chamadas } = criar();
  await servico.auxiliarDescricao({ textoOriginal: 'arrumei o login', tipoEntidade: 'execucao', contextoEntidade: 'Tela de login' });

  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].nivel, NivelIaEnum.PADRAO);
  assert.equal((chamadas[0].mensagens as unknown[]).length, 1);
  const prompt = promptDe(chamadas[0]);
  assert.ok(prompt.includes('arrumei o login'));
  assert.ok(prompt.includes('execução de trabalho'));
  assert.ok(prompt.includes('"Tela de login"'));
});

test('para demanda, o prompt fala em demanda de projeto', async () => {
  const { servico, chamadas } = criar();
  await servico.auxiliarDescricao({ textoOriginal: 'texto', tipoEntidade: 'demanda', contextoEntidade: 'Relatórios' });
  assert.ok(promptDe(chamadas[0]).includes('demanda de projeto'));
});

test('devolve o texto original junto do texto refinado pela IA', async () => {
  const { servico } = criar('Corrigiu a validação do formulário de login.');
  const resposta = await servico.auxiliarDescricao({ textoOriginal: 'arrumei o login', tipoEntidade: 'execucao', contextoEntidade: 'Login' });
  assert.equal(resposta.sucesso, true);
  assert.deepEqual(resposta.dados, { textoOriginal: 'arrumei o login', textoAuxiliado: 'Corrigiu a validação do formulário de login.' });
});

test('IA desligada ou fora do ar vira BusinessException com a mensagem do motivo', async () => {
  const { servico } = criar(new IaException('DESLIGADA', 'A IA está desligada'));
  await assert.rejects(
    () => servico.auxiliarDescricao({ textoOriginal: 'x', tipoEntidade: 'execucao', contextoEntidade: 'Y' }),
    (erro: unknown) => erro instanceof BusinessException && mensagemDe(erro) === 'A IA está desligada',
  );
});

test('erro desconhecido vira a mensagem genérica de indisponibilidade', async () => {
  const { servico } = criar(new Error('socket hang up'));
  await assert.rejects(
    () => servico.auxiliarDescricao({ textoOriginal: 'x', tipoEntidade: 'demanda', contextoEntidade: 'Y' }),
    (erro: unknown) => erro instanceof BusinessException && mensagemDe(erro) === 'Serviço de IA temporariamente indisponível',
  );
});

// alterarTrecho() (task 260): só a seleção muda, a IA recebe os dois prompts, a permissão é a da aba e nada é gravado.
const BLOCO = 'O sistema deve **exportar o relatório** em PDF.';
const PEDIDO = { demandaId: 5, aba: PlanoAbaEnum.DESCRICAO_TECNICA, bloco: BLOCO, selecao: 'exportar', pedido: 'trocar por gerar' };
const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;
const DEV = { sub: 7, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criarParaTrecho(resposta: string | Error, opcoes: { negarEdicao?: boolean } = {}) {
  const chamadas: Record<string, unknown>[] = [];
  const verificacoes: unknown[][] = [];
  const iaService = {
    gerar: async (pedido: Record<string, unknown>) => {
      chamadas.push(pedido);
      if (resposta instanceof Error) throw resposta;
      return { texto: resposta, modelo: 'modelo-teste', tokens: { entrada: 100, saida: 20, cache: 5 } };
    },
  };
  const demandaService = {
    recuperarDemandaParaEditar: async (...argumentos: unknown[]) => {
      verificacoes.push(argumentos);
      if (opcoes.negarEdicao) throw new UnauthorizedAccessException('Você só pode editar demandas das quais é membro');
      return { id: 5 };
    },
  };
  const promptService = { obterAtivo: async (tipo: TipoPromptEnum) => ({ conteudo: `PROMPT ${tipo}` }) };
  const usos: Record<string, unknown>[] = [];
  const iaUsoService = { registrar: async (uso: Record<string, unknown>) => { usos.push(uso); } };
  return { servico: new AssistenteService(iaService as never, demandaService as never, promptService as never, iaUsoService as never), chamadas, verificacoes, usos };
}

test('alterarTrecho: devolve o bloco com só a seleção alterada, no nível padrão, com os dois prompts e o pedido', async () => {
  const { servico, chamadas, verificacoes } = criarParaTrecho('O sistema deve **gerar o relatório** em PDF.');
  const resposta = await servico.alterarTrecho(PEDIDO, GESTOR);

  assert.equal(resposta.dados?.bloco, BLOCO);
  assert.equal(resposta.dados?.blocoNovo, 'O sistema deve **gerar o relatório** em PDF.');
  assert.equal(chamadas[0].nivel, NivelIaEnum.PADRAO);
  const instrucoes = chamadas[0].instrucoes as string;
  assert.ok(instrucoes.includes(`PROMPT ${TipoPromptEnum.ALTERAR_TRECHO}`));
  assert.ok(instrucoes.includes(`PROMPT ${TipoPromptEnum.PLANO_DESCRICAO_TECNICA}`));
  const mensagem = (chamadas[0].mensagens as { conteudo: string }[])[0].conteudo;
  assert.ok(mensagem.includes(BLOCO) && mensagem.includes('exportar') && mensagem.includes('trocar por gerar'));
  assert.deepEqual(verificacoes[0], [5, false, GESTOR]);
});

test('alterarTrecho: o prompt de como escrever é o da aba pedida, e a aba do cliente pede a regra de quem altera o cliente', async () => {
  const { servico, chamadas, verificacoes } = criarParaTrecho('O sistema deve **gerar o relatório** em PDF.');
  await servico.alterarTrecho({ ...PEDIDO, aba: PlanoAbaEnum.DESCRICAO_CLIENTE }, GESTOR);
  assert.ok((chamadas[0].instrucoes as string).includes(`PROMPT ${TipoPromptEnum.PLANO_DESCRICAO_CLIENTE}`));
  assert.deepEqual(verificacoes[0], [5, true, GESTOR]);
});

test('alterarTrecho: sem permissão na aba ou na demanda, recusa antes de chamar a IA', async () => {
  const { servico, chamadas } = criarParaTrecho('x', { negarEdicao: true });
  await assert.rejects(() => servico.alterarTrecho(PEDIDO, DEV), UnauthorizedAccessException);
  assert.equal(chamadas.length, 0);
});

test('alterarTrecho: resposta que muda além da seleção ou não muda nada vira erro, em vez de proposta', async () => {
  const alemDaSelecao = criarParaTrecho('O sistema precisa **gerar o relatório** em PDF.');
  await assert.rejects(() => alemDaSelecao.servico.alterarTrecho(PEDIDO, GESTOR), BusinessException);
  const igual = criarParaTrecho(BLOCO);
  await assert.rejects(() => igual.servico.alterarTrecho(PEDIDO, GESTOR), (erro: unknown) => mensagemDe(erro).includes('não mudou nada'));
});

test('alterarTrecho: IA fora do ar vira a mensagem de falha da IA', async () => {
  const { servico } = criarParaTrecho(new IaException('FORA_DO_AR' as never, 'sem chave'));
  await assert.rejects(() => servico.alterarTrecho(PEDIDO, GESTOR));
});

test('alterarTrecho: a chamada entra na conta de custos com o modelo e os tokens, também quando a resposta não encaixa', async () => {
  const sucesso = criarParaTrecho('O sistema deve **gerar o relatório** em PDF.');
  await sucesso.servico.alterarTrecho(PEDIDO, GESTOR);
  assert.deepEqual(sucesso.usos, [{
    usuarioId: 1, descricao: 'Alterar trecho (Documentações)', nivel: NivelIaEnum.PADRAO, modelo: 'modelo-teste',
    tokensEntrada: 100, tokensSaida: 20, tokensCache: 5, demandaId: 5,
  }]);

  const naoEncaixa = criarParaTrecho('O sistema precisa **gerar o relatório** em PDF.');
  await assert.rejects(() => naoEncaixa.servico.alterarTrecho(PEDIDO, GESTOR), BusinessException);
  assert.equal(naoEncaixa.usos.length, 1, 'os tokens foram gastos mesmo sem proposta');
});

test('alterarTrecho: sem permissão ou com a IA fora do ar nada é registrado (nada foi gasto)', async () => {
  const semPermissao = criarParaTrecho('x', { negarEdicao: true });
  await assert.rejects(() => semPermissao.servico.alterarTrecho(PEDIDO, DEV));
  assert.equal(semPermissao.usos.length, 0);
  const iaFora = criarParaTrecho(new IaException('FORA_DO_AR' as never, 'sem chave'));
  await assert.rejects(() => iaFora.servico.alterarTrecho(PEDIDO, GESTOR));
  assert.equal(iaFora.usos.length, 0);
});
