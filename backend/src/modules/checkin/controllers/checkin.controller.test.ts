import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ChatEventoDto, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { CheckinController } from './checkin.controller';

// SYSTEM.SPEC.md §12 (`checkin`): do próprio usuário autenticado (nunca o de outro). `mensagem` responde `text/event-stream` no
// formato do chat e 409 sem execução em andamento, antes de qualquer evento.

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

test('verbos e caminhos das três rotas do check-in', () => {
  assert.deepEqual(
    Object.values(rotasPorNome(CheckinController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['GET situacao', 'GET suspensao', 'POST mensagem'].sort(),
  );
});

test('nenhuma rota é pública, de gestor ou de administrador', () => {
  for (const rota of Object.values(rotasPorNome(CheckinController))) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.gestorOnly, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('situação: usa o usuário do token', async () => {
  const recebidos: unknown[] = [];
  const controller = new CheckinController({} as never, { consultarSituacao: async (usuario: unknown) => { recebidos.push(usuario); return null; } } as never);
  await controller.consultarSituacao(USUARIO);
  assert.deepEqual(recebidos, [USUARIO]);
});

test('suspensão: consulta só a do usuário do token e responde no envelope padrão', () => {
  const consultados: unknown[] = [];
  const dados = { suspenso: true, desde: new Date('2026-10-19T13:00:00Z'), motivo: 'reunião' };
  const controller = new CheckinController({ consultar: (usuarioId: number) => { consultados.push(usuarioId); return dados; } } as never, {} as never);
  assert.deepEqual(controller.consultarSuspensao(USUARIO), { sucesso: true, dados, mensagem: 'Suspensão dos check-ins consultada com sucesso' });
  assert.deepEqual(consultados, [7]);
});

function criarResposta() {
  const registro = { status: [] as number[], escritas: [] as string[], terminou: 0 };
  const resposta = {
    writableEnded: false, destroyed: false,
    status(codigo: number) { registro.status.push(codigo); return resposta; },
    setHeader() { /* sem efeito no teste */ },
    flushHeaders() { /* sem efeito no teste */ },
    write(texto: string) { registro.escritas.push(texto); return true; },
    end() { registro.terminou++; resposta.writableEnded = true; },
  };
  return { resposta, registro };
}

test('mensagem: os eventos da service viram o fluxo, a resposta é encerrada e a service recebe o texto e o usuário do token', async () => {
  const recebidos: unknown[][] = [];
  const checkinService = {
    enviarMensagem: async (usuario: unknown, dto: unknown, aoEvento: (evento: ChatEventoDto) => void) => {
      recebidos.push([usuario, dto]);
      aoEvento({ tipo: 'trecho', texto: 'Anotado' });
      aoEvento({ tipo: 'proposta', propostaId: 3 });
    },
  };
  const { resposta, registro } = criarResposta();
  await new CheckinController({} as never, checkinService as never).enviarMensagem({ texto: 'Fiz o login' }, USUARIO, resposta as never);

  assert.deepEqual(recebidos, [[USUARIO, { texto: 'Fiz o login' }]]);
  assert.deepEqual(registro.escritas.map((escrita) => JSON.parse(escrita.slice('data: '.length))), [{ tipo: 'trecho', texto: 'Anotado' }, { tipo: 'proposta', propostaId: 3 }]);
  assert.deepEqual(registro.status, [200]);
  assert.equal(registro.terminou, 1);
});

test('mensagem: 409 sem execução em andamento sobe antes de qualquer evento, sem abrir o fluxo', async () => {
  const semExecucao = new BusinessException('Não há execução em andamento');
  const checkinService = { enviarMensagem: async () => { throw semExecucao; } };
  const { resposta, registro } = criarResposta();
  await assert.rejects(
    () => new CheckinController({} as never, checkinService as never).enviarMensagem({ texto: 'Oi' }, USUARIO, resposta as never),
    semExecucao,
  );
  assert.deepEqual(registro.status, []);
  assert.deepEqual(registro.escritas, []);
  assert.equal(registro.terminou, 0);
});
