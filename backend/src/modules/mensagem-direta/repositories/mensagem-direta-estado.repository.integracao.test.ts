import * as assert from 'node:assert/strict';
import { ATALHO_GLOBAL_PADRAO } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor } from '../../../testes/fabricas';
import { MensagemDiretaLeituraRepository } from './mensagem-direta-leitura.repository';
import { MensagemDiretaPreferenciaRepository } from './mensagem-direta-preferencia.repository';

// O estado que muda do chat entre colaboradores (task 208) no SQL real: até onde cada pessoa leu, o silêncio por conversa (migration 0050) e as
// preferências. As mensagens ficam no armazenamento (206 e 207); aqui só `mensagem_direta_leitura` e `mensagem_direta_preferencia`.

const leitura = (conexao: ConexaoTeste) => criarRepositorio(MensagemDiretaLeituraRepository, conexao);
const preferencia = (conexao: ConexaoTeste) => criarRepositorio(MensagemDiretaPreferenciaRepository, conexao);

async function criarPar(conexao: ConexaoTeste) {
  const [pessoaA, pessoaB] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
  const [menor, maior] = pessoaA.id < pessoaB.id ? [pessoaA, pessoaB] : [pessoaB, pessoaA];
  return { ana: pessoaA, bruno: pessoaB, conversaId: `${menor.id}-${maior.id}` };
}

// --- leitura ---------------------------------------------------------------

testarComBanco('alterarLeitura: cria o marcador na primeira leitura e devolve o que ficou gravado', async (conexao) => {
  const { ana, bruno, conversaId } = await criarPar(conexao);
  const lidaAteDate = new Date('2026-10-21T14:00:00.123Z');

  const gravado = await leitura(conexao).alterarLeitura({ conversaId, usuarioId: ana.id, outroUsuarioId: bruno.id, lidaAteDate });

  assert.equal(gravado.conversaId, conversaId);
  assert.equal(gravado.outroUsuarioId, bruno.id);
  assert.equal(gravado.lidaAteDate?.toISOString(), '2026-10-21T14:00:00.123Z');
  assert.equal(gravado.silenciada, false);
});

testarComBanco('alterarLeitura: avança com uma data mais nova e NUNCA recua com uma mais antiga', async (conexao) => {
  const { ana, bruno, conversaId } = await criarPar(conexao);
  const dto = { conversaId, usuarioId: ana.id, outroUsuarioId: bruno.id };
  await leitura(conexao).alterarLeitura({ ...dto, lidaAteDate: new Date('2026-10-21T14:00:00.000Z') });

  const avancou = await leitura(conexao).alterarLeitura({ ...dto, lidaAteDate: new Date('2026-10-21T15:00:00.000Z') });
  assert.equal(avancou.lidaAteDate?.toISOString(), '2026-10-21T15:00:00.000Z');

  const atrasada = await leitura(conexao).alterarLeitura({ ...dto, lidaAteDate: new Date('2026-10-21T13:00:00.000Z') });
  assert.equal(atrasada.lidaAteDate?.toISOString(), '2026-10-21T15:00:00.000Z', 'uma requisição atrasada não reabre as não lidas');
});

testarComBanco('alterarSilencio: não apaga até onde a pessoa já leu, e ler não desfaz o silêncio', async (conexao) => {
  const { ana, bruno, conversaId } = await criarPar(conexao);
  const dto = { conversaId, usuarioId: ana.id, outroUsuarioId: bruno.id };
  await leitura(conexao).alterarLeitura({ ...dto, lidaAteDate: new Date('2026-10-21T14:00:00.000Z') });

  const silenciada = await leitura(conexao).alterarSilencio({ ...dto, silenciada: true });
  assert.equal(silenciada.silenciada, true);
  assert.equal(silenciada.lidaAteDate?.toISOString(), '2026-10-21T14:00:00.000Z');

  const lida = await leitura(conexao).alterarLeitura({ ...dto, lidaAteDate: new Date('2026-10-21T16:00:00.000Z') });
  assert.equal(lida.silenciada, true);

  const reativada = await leitura(conexao).alterarSilencio({ ...dto, silenciada: false });
  assert.equal(reativada.silenciada, false);
});

testarComBanco('alterarSilencio: silenciar antes de ler cria o marcador sem data de leitura', async (conexao) => {
  const { ana, bruno, conversaId } = await criarPar(conexao);
  const gravado = await leitura(conexao).alterarSilencio({ conversaId, usuarioId: ana.id, outroUsuarioId: bruno.id, silenciada: true });
  assert.equal(gravado.lidaAteDate, null);
  assert.equal(gravado.silenciada, true);
});

testarComBanco('um marcador por pessoa e conversa: o de uma ponta não aparece na outra', async (conexao) => {
  const { ana, bruno, conversaId } = await criarPar(conexao);
  await leitura(conexao).alterarLeitura({ conversaId, usuarioId: ana.id, outroUsuarioId: bruno.id, lidaAteDate: new Date('2026-10-21T14:00:00.000Z') });
  await leitura(conexao).alterarLeitura({ conversaId, usuarioId: ana.id, outroUsuarioId: bruno.id, lidaAteDate: new Date('2026-10-21T15:00:00.000Z') });

  assert.equal((await leitura(conexao).listarMarcadores({ usuarioId: ana.id })).length, 1);
  assert.deepEqual(await leitura(conexao).listarMarcadores({ usuarioId: bruno.id }), []);
  assert.equal(await leitura(conexao).recuperarMarcador({ conversaId, usuarioId: bruno.id }), null);

  const doBruno = await leitura(conexao).alterarLeitura({ conversaId, usuarioId: bruno.id, outroUsuarioId: ana.id, lidaAteDate: new Date('2026-10-21T10:00:00.000Z') });
  assert.equal(doBruno.lidaAteDate?.toISOString(), '2026-10-21T10:00:00.000Z', 'o marcador do Bruno é independente do da Ana');
  assert.equal((await leitura(conexao).recuperarMarcador({ conversaId, usuarioId: ana.id }))?.lidaAteDate?.toISOString(), '2026-10-21T15:00:00.000Z');
});

testarComBanco('o banco recusa conversa que não bate com os ids e a pessoa consigo mesma', async (conexao) => {
  const { ana, bruno } = await criarPar(conexao);
  await assert.rejects(
    conexao.transaction(async (transacao) =>
      criarRepositorio(MensagemDiretaLeituraRepository, transacao).alterarLeitura({ conversaId: '1-2', usuarioId: ana.id, outroUsuarioId: bruno.id, lidaAteDate: new Date() }),
    ),
    /chk_mensagem_direta_leitura_conversa/,
  );
  await assert.rejects(
    conexao.transaction(async (transacao) =>
      criarRepositorio(MensagemDiretaLeituraRepository, transacao).alterarSilencio({ conversaId: `${ana.id}-${ana.id}`, usuarioId: ana.id, outroUsuarioId: ana.id, silenciada: true }),
    ),
    /chk_mensagem_direta_leitura_/,
  );
});

// --- preferência -------------------------------------------------------------

testarComBanco('recuperar: sem linha devolve null (o padrão mora no shared, nunca em DEFAULT de coluna)', async (conexao) => {
  const ana = await criarDesenvolvedor(conexao);
  assert.equal(await preferencia(conexao).recuperar({ usuarioId: ana.id }), null);
});

testarComBanco('alterar: cria a linha do usuário e a segunda chamada troca o conjunto inteiro, sem duplicar', async (conexao) => {
  const ana = await criarDesenvolvedor(conexao);
  const outra = await criarDesenvolvedor(conexao);
  const primeira = {
    usuarioId: ana.id, avisosAtivos: true, avisoDesktopAtivo: false, somAtivo: true,
    silenciadoAteDate: new Date('2026-10-21T16:00:00.000Z'), atalhoGlobal: 'Alt+F1',
  };
  const { usuarioId: _usuarioId, ...esperada } = primeira;
  assert.deepEqual(await preferencia(conexao).alterar(primeira), esperada);
  assert.deepEqual(await preferencia(conexao).recuperar({ usuarioId: ana.id }), esperada);

  const segunda = { ...primeira, avisosAtivos: false, somAtivo: false, silenciadoAteDate: null, atalhoGlobal: ATALHO_GLOBAL_PADRAO };
  const { usuarioId: _outroUsuarioId, ...esperadaSegunda } = segunda;
  assert.deepEqual(await preferencia(conexao).alterar(segunda), esperadaSegunda);
  assert.deepEqual(await preferencia(conexao).recuperar({ usuarioId: ana.id }), esperadaSegunda);

  const linhas = await conexao.raw('SELECT count(*)::int AS total FROM mensagem_direta_preferencia WHERE usuario_id = ? AND is_deleted = false', [ana.id]);
  assert.equal(linhas.rows[0].total, 1);
  assert.equal(await preferencia(conexao).recuperar({ usuarioId: outra.id }), null, 'a preferência de uma pessoa não vaza para outra');
});

testarComBanco('as tabelas do estado não têm DEFAULT em nenhuma coluna (a aplicação fornece todos os valores)', async (conexao) => {
  const colunas = await conexao.raw(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_name IN ('mensagem_direta_leitura', 'mensagem_direta_preferencia') AND column_default IS NOT NULL AND column_name <> 'id'`,
  );
  assert.deepEqual(colunas.rows, []);
});
