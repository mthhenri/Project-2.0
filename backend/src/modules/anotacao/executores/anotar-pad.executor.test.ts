import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoAnotacaoEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { anexarAoFeitoDoDia, anexarAoFim, substituirTrechoUnico } from '../domain/anotacao-texto';
import { AnotacaoService } from '../services/anotacao.service';
import { AnotarPadExecutor } from './anotar-pad.executor';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

/** `AnotacaoService` em memória, com as mesmas operações de texto da real (o dono é sempre o `usuarioId` recebido). */
function criarServico(inicial: Partial<Record<TipoAnotacaoEnum, string>> = {}) {
  const textos: Record<string, string> = { ...inicial };
  const versoes: Record<string, number> = {};
  const chamadas: { usuarioId: number; operacao: string }[] = [];
  const secao = (tipo: string) => ({ id: 1, usuarioId: 7, tipo, texto: textos[tipo] ?? '', updatedDate: new Date(1_000 + (versoes[tipo] ?? 0)) });
  const gravar = (tipo: string, texto: string) => {
    textos[tipo] = texto;
    versoes[tipo] = (versoes[tipo] ?? 0) + 1;
    return { dados: secao(tipo) };
  };
  const servico = {
    listar: async (dto: { tipos?: string[] }) => ({ dados: (dto.tipos ?? []).map(secao) }),
    anexarTexto: async (dto: { usuarioId: number; tipo: string; texto: string }) => {
      chamadas.push({ usuarioId: dto.usuarioId, operacao: 'anexarTexto' });
      return gravar(dto.tipo, anexarAoFim(textos[dto.tipo] ?? '', dto.texto));
    },
    anexarFeito: async (dto: { usuarioId: number; texto: string }) => {
      chamadas.push({ usuarioId: dto.usuarioId, operacao: 'anexarFeito' });
      return gravar('FEITO', anexarAoFeitoDoDia(textos['FEITO'] ?? '', '18/10', dto.texto));
    },
    trocarTrecho: async (dto: { usuarioId: number; tipo: string; trechoAntigo: string; trechoNovo: string }) => {
      chamadas.push({ usuarioId: dto.usuarioId, operacao: 'trocarTrecho' });
      const resultado = substituirTrechoUnico(textos[dto.tipo] ?? '', dto.trechoAntigo, dto.trechoNovo);
      if (!resultado.ok) throw new BusinessException('trecho');
      return gravar(dto.tipo, resultado.texto);
    },
    alterar: async (dto: { tipo: string; texto: string; updatedDateLido: Date }) => {
      chamadas.push({ usuarioId: 7, operacao: 'alterar' });
      if (new Date(dto.updatedDateLido).getTime() !== secao(dto.tipo).updatedDate.getTime()) throw new BusinessException('conflito');
      return gravar(dto.tipo, dto.texto);
    },
  };
  return { executor: new AnotarPadExecutor(servico as unknown as AnotacaoService), textos, chamadas, escreverPorFora: (tipo: string, texto: string) => gravar(tipo, texto) };
}

test('anexar acrescenta ao fim da seção, no pad do usuário do token', async () => {
  const { executor, textos, chamadas } = criarServico({ LEMBRETE: 'Reunião às 10h.' });
  await executor.executar({ secao: 'LEMBRETE', operacao: 'ANEXAR', texto: 'Homologação reinicia às 18h.' }, USUARIO);
  assert.equal(textos['LEMBRETE'], 'Reunião às 10h.\n\nHomologação reinicia às 18h.');
  assert.deepEqual(chamadas, [{ usuarioId: 7, operacao: 'anexarTexto' }]);
});

test('anexar em Feito escreve debaixo do título do dia', async () => {
  const { executor, textos, chamadas } = criarServico();
  await executor.executar({ secao: 'FEITO', operacao: 'ANEXAR', texto: '- Cadastro de login' }, USUARIO);
  assert.equal(textos['FEITO'], '## 18/10\n- Cadastro de login');
  assert.equal(chamadas[0].operacao, 'anexarFeito');
});

test('trocar muda só o trecho', async () => {
  const { executor, textos } = criarServico({ EM_ANDAMENTO: 'Parei na validação de e-mail.\nOutra linha.' });
  await executor.executar({ secao: 'EM_ANDAMENTO', operacao: 'TROCAR', trechoAntigo: 'Parei na validação de e-mail.', trechoNovo: 'Validação de e-mail concluída.' }, USUARIO);
  assert.equal(textos['EM_ANDAMENTO'], 'Validação de e-mail concluída.\nOutra linha.');
});

test('desfazer restaura o texto de antes quando a seção ainda é a que a anotação deixou', async () => {
  const { executor, textos } = criarServico({ LEMBRETE: 'Reunião às 10h.' });
  const resultado = await executor.executar({ secao: 'LEMBRETE', operacao: 'ANEXAR', texto: 'Homologação reinicia às 18h.' }, USUARIO);
  await executor.desfazer(resultado, USUARIO);
  assert.equal(textos['LEMBRETE'], 'Reunião às 10h.');
});

test('desfazer é recusado se alguém escreveu na seção depois', async () => {
  const { executor, textos, escreverPorFora } = criarServico({ LEMBRETE: 'Reunião às 10h.' });
  const resultado = await executor.executar({ secao: 'LEMBRETE', operacao: 'ANEXAR', texto: 'Homologação reinicia às 18h.' }, USUARIO);
  escreverPorFora('LEMBRETE', `${textos['LEMBRETE']}\n\nAnotação feita à mão.`);
  await assert.rejects(executor.desfazer(resultado, USUARIO), BusinessException);
  assert.match(textos['LEMBRETE'], /Anotação feita à mão/);
});

test('Pessoal só com pedido explícito; combinações incompletas são recusadas', () => {
  const { executor } = criarServico();
  assert.throws(() => executor.validar({ secao: 'PESSOAL', operacao: 'ANEXAR', texto: 'npm run dev' }), BusinessException);
  assert.doesNotThrow(() => executor.validar({ secao: 'PESSOAL', operacao: 'ANEXAR', texto: 'npm run dev', pedidoExplicito: true }));
  assert.throws(() => executor.validar({ secao: 'LEMBRETE', operacao: 'ANEXAR' }), BusinessException);
  assert.throws(() => executor.validar({ secao: 'LEMBRETE', operacao: 'TROCAR', trechoAntigo: 'a' }), BusinessException);
  assert.throws(() => executor.validar({ secao: 'LEMBRETE', operacao: 'TROCAR', trechoAntigo: 'a', trechoNovo: 'a' }), BusinessException);
  assert.throws(() => executor.validar({ secao: 'LEMBRETE', operacao: 'REESCREVER', texto: 'x' }), BusinessException);
  assert.throws(() => executor.validar({ secao: 'LEMBRETE', operacao: 'ANEXAR', texto: 'x', usuarioId: 2 }), BusinessException);
});
