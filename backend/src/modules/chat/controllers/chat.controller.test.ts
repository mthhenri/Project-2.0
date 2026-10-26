import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ChatEventoDto, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { ChatController } from './chat.controller';

// SYSTEM.SPEC.md §12 (`chat`): qualquer usuário autenticado, sempre o PRÓPRIO chat (o dono vem do token); as três rotas de envio
// respondem em `text/event-stream`; falha antes do primeiro evento (409) sai com o status HTTP de erro, sem abrir o fluxo.

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

test('verbos e caminhos das dez rotas do chat', () => {
  assert.deepEqual(
    Object.values(rotasPorNome(ChatController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['GET busca', 'GET conversa/:data', 'GET conversas', 'GET hoje', 'GET plano/:planoId', 'POST bom-dia', 'POST mensagem', 'POST plano/:planoId/mensagem', 'POST retomada', 'PUT conversa/:data/titulo'].sort(),
  );
});

test('nenhuma rota é pública, de gestor ou de administrador: o chat é de qualquer usuário autenticado', () => {
  for (const rota of Object.values(rotasPorNome(ChatController))) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.gestorOnly, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('as rotas de leitura repassam o DTO e o usuário do token (nunca um id vindo da requisição)', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new ChatController({
    recuperarHoje: registrar('recuperarHoje'), listarConversas: registrar('listarConversas'),
    recuperarConversa: registrar('recuperarConversa'), buscar: registrar('buscar'),
  } as never, {} as never);

  await controller.recuperarHoje(USUARIO);
  await controller.listarConversas(USUARIO);
  await controller.recuperarConversa({ data: '2026-10-16' }, USUARIO);
  await controller.buscar({ texto: 'cadastro' }, USUARIO);

  assert.deepEqual(chamadas, [
    ['recuperarHoje', USUARIO], ['listarConversas', USUARIO], ['recuperarConversa', { data: '2026-10-16' }, USUARIO], ['buscar', { texto: 'cadastro' }, USUARIO],
  ]);
});

test('renomear a conversa junta o dia da rota ao corpo e usa o usuário do token (nunca um id da requisição)', async () => {
  const chamadas: unknown[][] = [];
  const controller = new ChatController({ alterarTituloConversa: async (...argumentos: unknown[]) => { chamadas.push(argumentos); return null; } } as never, {} as never);
  await controller.alterarTituloConversa({ data: '2026-10-16' }, { titulo: 'Meu nome' }, USUARIO);
  assert.deepEqual(chamadas, [[{ titulo: 'Meu nome', data: '2026-10-16' }, USUARIO]]);
});

test('o dia da rota vence um "data" que venha no corpo', async () => {
  const chamadas: unknown[][] = [];
  const controller = new ChatController({ alterarTituloConversa: async (...argumentos: unknown[]) => { chamadas.push(argumentos); return null; } } as never, {} as never);
  await controller.alterarTituloConversa({ data: '2026-10-16' }, { titulo: 'x', data: '1999-01-01' } as never, USUARIO);
  assert.equal((chamadas[0][0] as { data: string }).data, '2026-10-16');
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

const eventosEscritos = (escritas: string[]) => escritas.map((escrita) => JSON.parse(escrita.slice('data: '.length)) as ChatEventoDto);

const ROTAS_DE_ENVIO = [
  { nome: 'mensagem', metodo: 'enviarMensagem', chamar: (controller: ChatController, resposta: never) => controller.enviarMensagem({ texto: 'Oi' }, USUARIO, resposta) },
  { nome: 'bom-dia', metodo: 'iniciarBomDia', chamar: (controller: ChatController, resposta: never) => controller.iniciarBomDia(USUARIO, resposta) },
  { nome: 'retomada', metodo: 'retomarAposQueda', chamar: (controller: ChatController, resposta: never) => controller.retomarAposQueda(USUARIO, resposta) },
];

for (const rota of ROTAS_DE_ENVIO) {
  test(`${rota.nome}: os eventos da service viram o fluxo, na ordem, e a resposta é encerrada no fim`, async () => {
    const recebidos: unknown[] = [];
    const servico = {
      [rota.metodo]: async (...argumentos: unknown[]) => {
        recebidos.push(argumentos.slice(0, -1));
        const aoEvento = argumentos[argumentos.length - 1] as (evento: ChatEventoDto) => void;
        aoEvento({ tipo: 'trecho', texto: 'Olá' });
        aoEvento({ tipo: 'proposta', propostaId: 4 });
        aoEvento({ tipo: 'sugestoes', itens: ['Sim', 'Não'] });
      },
    };
    const { resposta, registro } = criarResposta();
    await rota.chamar(new ChatController(servico as never, {} as never), resposta as never);

    assert.deepEqual(eventosEscritos(registro.escritas), [
      { tipo: 'trecho', texto: 'Olá' }, { tipo: 'proposta', propostaId: 4 }, { tipo: 'sugestoes', itens: ['Sim', 'Não'] },
    ]);
    assert.deepEqual(registro.status, [200]);
    assert.equal(registro.terminou, 1);
    assert.equal(recebidos.length, 1);
    assert.equal((recebidos[0] as unknown[])[0], USUARIO);
  });

  test(`${rota.nome}: 409 da service antes de qualquer evento sobe como exceção, sem abrir nem fechar o fluxo`, async () => {
    const conflito = new BusinessException('Já existe uma resposta em andamento');
    const servico = { [rota.metodo]: async () => { throw conflito; } };
    const { resposta, registro } = criarResposta();

    await assert.rejects(() => rota.chamar(new ChatController(servico as never, {} as never), resposta as never), conflito);
    assert.deepEqual(registro.status, []);
    assert.deepEqual(registro.escritas, []);
    assert.equal(registro.terminou, 0);
  });

  test(`${rota.nome}: falha depois do primeiro evento ainda fecha o fluxo que já começou`, async () => {
    const servico = {
      [rota.metodo]: async (...argumentos: unknown[]) => {
        (argumentos[argumentos.length - 1] as (evento: ChatEventoDto) => void)({ tipo: 'trecho', texto: 'parcial' });
        throw new Error('estourou');
      },
    };
    const { resposta, registro } = criarResposta();
    await assert.rejects(() => rota.chamar(new ChatController(servico as never, {} as never), resposta as never), /estourou/);
    assert.equal(registro.terminou, 1);
  });
}

test('mensagem: o texto do DTO e o usuário do token chegam à service', async () => {
  const recebidos: unknown[][] = [];
  const controller = new ChatController({ enviarMensagem: async (...argumentos: unknown[]) => { recebidos.push(argumentos.slice(0, 2)); } } as never, {} as never);
  await controller.enviarMensagem({ texto: 'Preciso de ajuda' }, USUARIO, criarResposta().resposta as never);
  assert.deepEqual(recebidos, [[USUARIO, { texto: 'Preciso de ajuda' }]]);
});

test('cliente que fecha a conexão no meio: a service continua gerando e o controller termina sem lançar', async () => {
  let eventosGerados = 0;
  const servico = {
    enviarMensagem: async (_usuario: unknown, _dto: unknown, aoEvento: (evento: ChatEventoDto) => void) => {
      for (let i = 0; i < 3; i++) { aoEvento({ tipo: 'trecho', texto: String(i) }); eventosGerados++; }
    },
  };
  const { resposta, registro } = criarResposta();
  resposta.destroyed = true;
  await new ChatController(servico as never, {} as never).enviarMensagem({ texto: 'Oi' }, USUARIO, resposta as never);
  assert.equal(eventosGerados, 3);
  assert.deepEqual(registro.escritas, []);
});

test('a conversa do plano usa o id da rota e o usuário do token (nunca um id do corpo)', async () => {
  const chamadas: unknown[][] = [];
  const controller = new ChatController({} as never, { recuperarConversa: async (...argumentos: unknown[]) => { chamadas.push(['conversa', ...argumentos]); return null; } } as never);
  await controller.recuperarConversaDoPlano(12, USUARIO);
  assert.deepEqual(chamadas, [['conversa', { id: 12 }, USUARIO]]);
});

test('a mensagem no plano repassa o id da rota, o corpo e o usuário do token', async () => {
  const recebidos: unknown[][] = [];
  const { resposta, registro } = criarResposta();
  const planoService = { enviarMensagem: async (...argumentos: unknown[]) => { recebidos.push(argumentos.slice(0, 3)); } };
  await new ChatController({} as never, planoService as never).enviarMensagemNoPlano(12, { texto: 'Oi' }, USUARIO, resposta as never);
  assert.deepEqual(recebidos, [[{ id: 12 }, { texto: 'Oi' }, USUARIO]]);
  assert.deepEqual(registro.escritas, [], 'sem evento da service, nada é escrito no fluxo');
});
