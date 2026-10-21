import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { MensagemDiretaController } from './mensagem-direta.controller';

// SYSTEM.SPEC.md §12 (`mensagem-direta`): qualquer usuário autenticado, sempre como a pessoa do token. O `usuarioId` da rota é a OUTRA pessoa da
// conversa e entra no DTO pela controller, nunca pelo corpo ou pela query.

const USUARIO = { sub: 4, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

test('verbos e caminhos das nove rotas', () => {
  assert.deepEqual(
    Object.values(rotasPorNome(MensagemDiretaController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    [
      'GET busca',
      'GET eventos',
      'GET conversa/:usuarioId',
      'GET conversas',
      'GET preferencia',
      'POST mensagem',
      'PUT conversa/:usuarioId/leitura',
      'PUT conversa/:usuarioId/silencio',
      'PUT preferencia',
    ].sort(),
  );
});

test('nenhuma rota é pública, de gestor ou de administrador', () => {
  for (const rota of Object.values(rotasPorNome(MensagemDiretaController))) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.gestorOnly, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('o usuarioId da rota entra no DTO e vence qualquer valor vindo da query ou do corpo', async () => {
  const chamadas: Record<string, unknown[]> = {};
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas[nome] = argumentos; return null; };
  const controller = new MensagemDiretaController(
    { listarConversa: registrar('listarConversa'), alterarLeitura: registrar('alterarLeitura'), alterarSilencio: registrar('alterarSilencio') } as never,
    {} as never,
  );

  await controller.listarConversa(9, { usuarioId: 1000, limite: 10 } as never, USUARIO);
  await controller.alterarLeitura(9, { usuarioId: 1000, lidaAteDate: '2026-10-21T10:00:00.000Z' } as never, USUARIO);
  await controller.alterarSilencio(9, { usuarioId: 1000, silenciada: true } as never, USUARIO);

  assert.deepEqual(chamadas.listarConversa, [{ usuarioId: 9, limite: 10 }, USUARIO]);
  assert.deepEqual(chamadas.alterarLeitura, [{ usuarioId: 9, lidaAteDate: '2026-10-21T10:00:00.000Z' }, USUARIO]);
  assert.deepEqual(chamadas.alterarSilencio, [{ usuarioId: 9, silenciada: true }, USUARIO]);
});

test('as demais rotas repassam o DTO e o usuário do token', async () => {
  const chamadas: Record<string, unknown[]> = {};
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas[nome] = argumentos; return null; };
  const controller = new MensagemDiretaController(
    {
      listarConversas: registrar('listarConversas'),
      enviarMensagem: registrar('enviarMensagem'),
      buscar: registrar('buscar'),
      recuperarPreferencia: registrar('recuperarPreferencia'),
      alterarPreferencia: registrar('alterarPreferencia'),
    } as never,
    {} as never,
  );

  const envio = { destinatarioId: 9, mensagemId: 'x', texto: 'oi' } as never;
  const preferencia = { avisosAtivos: true } as never;
  await controller.listarConversas(USUARIO);
  await controller.enviarMensagem(envio, USUARIO);
  await controller.buscar({ texto: 'cadastro' }, USUARIO);
  await controller.recuperarPreferencia(USUARIO);
  await controller.alterarPreferencia(preferencia, USUARIO);

  assert.deepEqual(chamadas.listarConversas, [USUARIO]);
  assert.deepEqual(chamadas.enviarMensagem, [envio, USUARIO]);
  assert.deepEqual(chamadas.buscar, [{ texto: 'cadastro' }, USUARIO]);
  assert.deepEqual(chamadas.recuperarPreferencia, [USUARIO]);
  assert.deepEqual(chamadas.alterarPreferencia, [preferencia, USUARIO]);
});

test('eventos: abre o stream do usuário do token, com os cabeçalhos de event-stream, e fecha ao desconectar', () => {
  const cabecalhos: Record<string, string> = {};
  const escritas: string[] = [];
  const ouvintes: Record<string, () => void> = {};
  let encerrada = false;
  const resposta = {
    status: () => resposta,
    setHeader: (nome: string, valor: string) => { cabecalhos[nome] = valor; },
    flushHeaders: () => undefined,
    write: (texto: string) => { escritas.push(texto); return true; },
    end: () => { encerrada = true; },
    on: (evento: string, ouvinte: () => void) => { ouvintes[evento] = ouvinte; },
    writableEnded: false,
    destroyed: false,
  };
  const abertas: { usuarioId: number; conexao: { enviar(e: unknown): void; encerrar(): void } }[] = [];
  let fechada = 0;
  const controller = new MensagemDiretaController({} as never, {
    abrir: (usuarioAtivo: { sub: number }, conexao: { enviar(e: unknown): void; encerrar(): void }) => { abertas.push({ usuarioId: usuarioAtivo.sub, conexao }); return () => { fechada++; }; },
  } as never);

  controller.abrirEventos(USUARIO, resposta as never);

  assert.equal(abertas[0].usuarioId, 4);
  assert.match(cabecalhos['Content-Type'], /text\/event-stream/);
  assert.equal(cabecalhos['X-Accel-Buffering'], 'no');
  abertas[0].conexao.enviar({ tipo: 'BATIMENTO' });
  assert.deepEqual(escritas, ['data: {"tipo":"BATIMENTO"}\n\n']);
  assert.equal(fechada, 0);
  ouvintes.close();
  assert.equal(fechada, 1);
  abertas[0].conexao.encerrar();
  assert.equal(encerrada, true);
});
