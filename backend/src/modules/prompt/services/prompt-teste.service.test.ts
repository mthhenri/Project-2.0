import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EstadoIaEnum, NIVEL_DO_TIPO_DE_PROMPT, NivelIaEnum, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { IaException } from '../../ia/domain/ia.exception';
import { IaSolicitacao } from '../../ia/domain/ia.tipos';
import { IaService } from '../../ia/services/ia.service';
import { PromptService } from './prompt.service';
import { PromptTesteService } from './prompt-teste.service';

const ADMINISTRADOR = { sub: 1, tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR = { sub: 2, tipo: TipoUsuarioEnum.GESTOR } as never;

function montar(opcoes: { estado?: EstadoIaEnum; falhar?: (solicitacao: IaSolicitacao) => unknown } = {}) {
  const chamadas: IaSolicitacao[] = [];
  const iaService = {
    async obterEstado() {
      return opcoes.estado ?? EstadoIaEnum.NO_AR;
    },
    async gerar(solicitacao: IaSolicitacao) {
      chamadas.push(solicitacao);
      const erro = opcoes.falhar?.(solicitacao);
      if (erro) throw erro;
      return { texto: `resposta de ${solicitacao.instrucoes}`, tokens: { entrada: 10, saida: 5, cache: 0 } };
    },
  };
  const promptService = { obterAtivo: async () => ({ conteudo: 'ATIVO' }) };
  const servico = new PromptTesteService(promptService as unknown as PromptService, iaService as unknown as IaService);
  return { servico, chamadas };
}

test('roda cada narrativa duas vezes, com o ativo e com o candidato, só com texto', async () => {
  const { servico, chamadas } = montar();
  const resposta = await servico.testar(TipoPromptEnum.PAD, { conteudo: 'CANDIDATO', narrativas: ['a', 'b'] }, ADMINISTRADOR);
  assert.equal(chamadas.length, 4);
  assert.equal(chamadas.every((chamada) => chamada.ferramentas === undefined), true);
  assert.deepEqual(resposta.dados.resultados.map((r) => [r.narrativa, r.ativo.texto, r.candidato.texto]), [
    ['a', 'resposta de ATIVO', 'resposta de CANDIDATO'],
    ['b', 'resposta de ATIVO', 'resposta de CANDIDATO'],
  ]);
  assert.equal(resposta.dados.resultados[0].ativo.tokensSaida, 5);
});

test('usa o nível do tipo (tabela fixa)', async () => {
  const esperado: [TipoPromptEnum, NivelIaEnum][] = [
    [TipoPromptEnum.CONVERSA, NivelIaEnum.RAPIDO],
    [TipoPromptEnum.CHECKIN, NivelIaEnum.RAPIDO],
    [TipoPromptEnum.DESCRICAO_EXECUCAO, NivelIaEnum.PADRAO],
    [TipoPromptEnum.PAD, NivelIaEnum.PADRAO],
    [TipoPromptEnum.PRIORIDADE, NivelIaEnum.PADRAO],
    [TipoPromptEnum.ENTREVISTA_DEMANDA, NivelIaEnum.ANALITICO],
    [TipoPromptEnum.CONEXAO_DEMANDA, NivelIaEnum.ANALITICO],
  ];
  assert.equal(Object.keys(NIVEL_DO_TIPO_DE_PROMPT).length, Object.keys(TipoPromptEnum).length);
  for (const [tipo, nivel] of esperado) {
    const { servico, chamadas } = montar();
    const resposta = await servico.testar(tipo, { conteudo: 'C', narrativas: ['x'] }, ADMINISTRADOR);
    assert.equal(resposta.dados.nivel, nivel);
    assert.equal(chamadas.every((chamada) => chamada.nivel === nivel), true);
  }
});

test('o limite é de 5 narrativas, e vazias não contam', async () => {
  const { servico } = montar();
  const seis = ['1', '2', '3', '4', '5', '6'];
  await assert.rejects(servico.testar(TipoPromptEnum.PAD, { conteudo: 'C', narrativas: seis }, ADMINISTRADOR), BusinessException);
  const comVazias = await servico.testar(TipoPromptEnum.PAD, { conteudo: 'C', narrativas: ['1', '  ', '2', '', '3', '4', '5'] }, ADMINISTRADOR);
  assert.equal(comVazias.dados.resultados.length, 5);
  await assert.rejects(servico.testar(TipoPromptEnum.PAD, { conteudo: 'C', narrativas: ['  '] }, ADMINISTRADOR), BusinessException);
  await assert.rejects(servico.testar(TipoPromptEnum.PAD, { conteudo: '  ', narrativas: ['1'] }, ADMINISTRADOR), BusinessException);
});

test('a falha de uma chamada vira o erro só daquela saída; as outras seguem', async () => {
  const { servico } = montar({
    falhar: (solicitacao) => (solicitacao.mensagens[0].conteudo === 'ruim' && solicitacao.instrucoes === 'CANDIDATO' ? new IaException('LIMITE', 'Limite de uso da IA atingido') : null),
  });
  const resposta = await servico.testar(TipoPromptEnum.PAD, { conteudo: 'CANDIDATO', narrativas: ['boa', 'ruim'] }, ADMINISTRADOR);
  const [boa, ruim] = resposta.dados.resultados;
  assert.equal(boa.candidato.erro, null);
  assert.equal(ruim.ativo.texto, 'resposta de ATIVO');
  assert.equal(ruim.candidato.texto, null);
  assert.equal(ruim.candidato.erro, 'Limite de uso da IA atingido');
});

test('erro desconhecido vira a mensagem genérica, sem vazar detalhe', async () => {
  const { servico } = montar({ falhar: () => new Error('segredo do provedor') });
  const resposta = await servico.testar(TipoPromptEnum.PAD, { conteudo: 'C', narrativas: ['x'] }, ADMINISTRADOR);
  assert.equal(resposta.dados.resultados[0].ativo.erro, 'Serviço de IA temporariamente indisponível');
});

test('IA desligada responde 409 sem chamar o modelo; não-administrador é recusado', async () => {
  const desligada = montar({ estado: EstadoIaEnum.DESLIGADA });
  await assert.rejects(desligada.servico.testar(TipoPromptEnum.PAD, { conteudo: 'C', narrativas: ['x'] }, ADMINISTRADOR), ConflictException);
  assert.equal(desligada.chamadas.length, 0);
  const { servico } = montar();
  await assert.rejects(servico.testar(TipoPromptEnum.PAD, { conteudo: 'C', narrativas: ['x'] }, GESTOR), UnauthorizedAccessException);
});
