import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { NivelIaEnum } from '@project20/shared';
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
  return { servico: new AssistenteService(iaService as never), chamadas };
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
