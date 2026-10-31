import * as assert from 'node:assert/strict';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor, criarGestor } from '../../../testes/fabricas';
import { MensagemDiretaSupervisaoRepository } from './mensagem-direta-supervisao.repository';

// A auditoria da supervisão do chat (task 214) no SQL real: uma linha por abertura (migration 0050), o aviso que só conta depois de dado e o dia
// do aviso. O fuso é o da conexão (`APP_TIMEZONE`); o teste compara com o instante de agora, um dia antes e um dia depois.

const supervisao = (conexao: ConexaoTeste) => criarRepositorio(MensagemDiretaSupervisaoRepository, conexao);

async function criarCenario(conexao: ConexaoTeste) {
  const gestor = await criarGestor(conexao);
  const [pessoaA, pessoaB] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
  const [menor, maior] = pessoaA.id < pessoaB.id ? [pessoaA, pessoaB] : [pessoaB, pessoaA];
  return { gestor, dto: { leitorUsuarioId: gestor.id, conversaId: `${menor.id}-${maior.id}`, usuarioMenorId: menor.id, usuarioMaiorId: maior.id } };
}

testarComBanco('registrarLeitura: grava uma linha por abertura, ainda sem aviso', async (conexao) => {
  const { dto } = await criarCenario(conexao);

  const primeira = await supervisao(conexao).registrarLeitura(dto);
  const segunda = await supervisao(conexao).registrarLeitura(dto);

  assert.notEqual(primeira.id, segunda.id, 'cada abertura é uma linha de auditoria');
  assert.equal(primeira.participantesAvisados, false);
  assert.equal(primeira.leitorUsuarioId, dto.leitorUsuarioId);
  assert.equal(primeira.conversaId, dto.conversaId);
});

testarComBanco('existeAvisoDoDia: a abertura sem aviso dado não conta; depois de marcada, conta só para o mesmo leitor e a mesma conversa', async (conexao) => {
  const { dto, gestor } = await criarCenario(conexao);
  const outroGestor = await criarGestor(conexao);
  const agora = new Date();
  const abertura = await supervisao(conexao).registrarLeitura(dto);

  assert.equal(await supervisao(conexao).existeAvisoDoDia({ leitorUsuarioId: gestor.id, conversaId: dto.conversaId, agora }), false, 'o aviso ainda não foi dado');

  await supervisao(conexao).marcarAvisoDado({ supervisaoId: abertura.id });

  assert.equal(await supervisao(conexao).existeAvisoDoDia({ leitorUsuarioId: gestor.id, conversaId: dto.conversaId, agora }), true);
  assert.equal(await supervisao(conexao).existeAvisoDoDia({ leitorUsuarioId: outroGestor.id, conversaId: dto.conversaId, agora }), false, 'outro leitor avisa de novo');
  assert.equal(await supervisao(conexao).existeAvisoDoDia({ leitorUsuarioId: gestor.id, conversaId: '999998-999999', agora }), false, 'outra conversa');
});

testarComBanco('existeAvisoDoDia: o aviso de hoje não vale para o dia seguinte nem para o anterior', async (conexao) => {
  const { dto, gestor } = await criarCenario(conexao);
  const abertura = await supervisao(conexao).registrarLeitura(dto);
  await supervisao(conexao).marcarAvisoDado({ supervisaoId: abertura.id });
  const umDia = 24 * 60 * 60 * 1000;
  const pergunta = (agora: Date) => supervisao(conexao).existeAvisoDoDia({ leitorUsuarioId: gestor.id, conversaId: dto.conversaId, agora });

  assert.equal(await pergunta(new Date()), true);
  assert.equal(await pergunta(new Date(Date.now() + umDia)), false, 'amanhã avisa de novo');
  assert.equal(await pergunta(new Date(Date.now() - umDia)), false, 'ontem não tinha aviso');
});
