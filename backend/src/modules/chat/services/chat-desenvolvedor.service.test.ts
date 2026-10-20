import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { ChatMensagemLida } from '../domain/chat-mensagem.documento';
import { LIMITE_CARACTERES_DA_MENSAGEM, LIMITE_CONVERSAS_DO_DESENVOLVEDOR, LIMITE_MENSAGENS_DA_CONVERSA } from '../domain/conversa-do-desenvolvedor';
import { ArmazenamentoDeChat } from '../repositories/armazenamento-de-chat';
import { ChatDesenvolvedorService } from './chat-desenvolvedor.service';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 2, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function mensagem(indice: number, parcial: Partial<ChatMensagemLida> = {}): ChatMensagemLida {
  return {
    id: `m${indice}`,
    conversaId: '7-2026-10-19',
    usuarioId: 7,
    contexto: ContextoChatEnum.CHAT,
    autor: indice % 2 === 0 ? AutorChatEnum.USUARIO : AutorChatEnum.IA,
    assunto: null,
    texto: `texto ${indice}`,
    nivel: null,
    modelo: 'claude',
    tokensEntrada: 10,
    tokensSaida: 5,
    tokensCache: 0,
    propostaId: null,
    execucaoId: null,
    atividadeId: null,
    demandaId: null,
    conteudoBruto: '{"segredo":true}',
    createdDate: new Date(Date.UTC(2026, 9, 19, 12, indice)),
    ...parcial,
  };
}

function balde(dia: string, quantidade = 3) {
  return { key: `7-${dia}`, doc_count: quantidade, ultima: { value: 0 }, primeira: { hits: { hits: [{ _source: { texto: `primeira de ${dia}` } }] } } };
}

function montar(opcoes: { tipoDoDono?: TipoUsuarioEnum | null; mensagens?: ChatMensagemLida[]; baldes?: ReturnType<typeof balde>[] } = {}) {
  const consultas: Record<string, unknown>[] = [];
  const armazenamento = {
    listarConversas: async (consulta: Record<string, unknown>) => {
      consultas.push(consulta);
      return opcoes.baldes ?? [];
    },
    listarTitulos: async () => ({ '7-2026-10-19': { titulo: 'Erro no login', editado: false } }),
    listarConversa: async (consulta: Record<string, unknown>) => {
      consultas.push(consulta);
      return opcoes.mensagens ?? [];
    },
    buscar: async (consulta: Record<string, unknown>) => {
      consultas.push(consulta);
      return opcoes.mensagens ?? [];
    },
  } as unknown as ArmazenamentoDeChat;
  const tipo = opcoes.tipoDoDono === undefined ? TipoUsuarioEnum.DESENVOLVEDOR : opcoes.tipoDoDono;
  const usuarios = { recuperar: async () => (tipo ? { id: 7, nomeCompleto: 'Dev Teste', tipo } : null) } as unknown as UsuarioRepository;
  return { service: new ChatDesenvolvedorService(armazenamento, usuarios), consultas };
}

test('o desenvolvedor não lê a conversa de ninguém, nem a própria por esta via', async () => {
  const { service, consultas } = montar();
  await assert.rejects(service.consultarConversa({ usuarioId: 7, data: '2026-10-19' }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(consultas.length, 0);
});

test('só conversa de desenvolvedor existente é lida: gestor, administrador e usuário inexistente não', async () => {
  await assert.rejects(montar({ tipoDoDono: TipoUsuarioEnum.GESTOR }).service.listarConversas({ usuarioId: 7 }, GESTOR), UnauthorizedAccessException);
  await assert.rejects(montar({ tipoDoDono: TipoUsuarioEnum.ADMINISTRADOR }).service.buscarMensagens({ usuarioId: 7, texto: 'erro' }, ADMINISTRADOR), UnauthorizedAccessException);
  await assert.rejects(montar({ tipoDoDono: null }).service.consultarConversa({ usuarioId: 7, data: '2026-10-19' }, GESTOR), ResourceNotFoundException);
});

test('lista as conversas do desenvolvedor no intervalo, com o nome da conversa e o padrão quando não há', async () => {
  const { service, consultas } = montar({ baldes: [balde('2026-10-19'), balde('2026-10-15'), balde('2026-09-30')] });
  const resultado = await service.listarConversas({ usuarioId: 7, inicio: '2026-10-01' }, GESTOR);
  assert.deepEqual(consultas[0], { usuarioId: 7 });
  assert.equal(resultado.usuario, 'Dev Teste');
  assert.deepEqual(resultado.conversas.map((conversa) => conversa.data), ['2026-10-19', '2026-10-15']);
  assert.equal(resultado.conversas[0].titulo, 'Erro no login');
  assert.equal(resultado.conversas[1].titulo, 'Chat do dia 15 de outubro de 2026');
  assert.equal(resultado.conversas[0].primeiraMensagem, 'primeira de 2026-10-19');
  assert.equal(resultado.haMais, false);
});

test('a lista avisa quando há mais conversas do que o limite', async () => {
  const dias = Array.from({ length: LIMITE_CONVERSAS_DO_DESENVOLVEDOR + 2 }, (_, indice) =>
    balde(new Date(Date.UTC(2026, 9, 19 - indice)).toISOString().slice(0, 10)),
  );
  const resultado = await montar({ baldes: dias }).service.listarConversas({ usuarioId: 7 }, GESTOR);
  assert.equal(resultado.conversas.length, LIMITE_CONVERSAS_DO_DESENVOLVEDOR);
  assert.equal(resultado.haMais, true);
});

test('a conversa do dia só traz o chat (sem check-in nem falha do sistema) e nunca o conteúdo bruto, os tokens ou o modelo', async () => {
  const { service, consultas } = montar({
    mensagens: [
      mensagem(1),
      mensagem(2, { contexto: ContextoChatEnum.CHECKIN, texto: 'check-in' }),
      mensagem(3, { autor: AutorChatEnum.SISTEMA, texto: 'Serviço indisponível' }),
      mensagem(4),
    ],
  });
  const resultado = await service.consultarConversa({ usuarioId: 7, data: '2026-10-19' }, GESTOR);
  assert.deepEqual(consultas[0], { conversaId: '7-2026-10-19', usuarioId: 7 });
  assert.deepEqual(resultado.mensagens.map((item) => item.texto), ['texto 1', 'texto 4']);
  assert.equal(resultado.titulo, 'Erro no login');
  for (const item of resultado.mensagens) assert.deepEqual(Object.keys(item).sort(), ['autor', 'data', 'texto', 'truncada']);
});

test('mensagem longa é cortada e avisada; conversa longa fica com as mais recentes', async () => {
  const longa = mensagem(1, { texto: 'x'.repeat(LIMITE_CARACTERES_DA_MENSAGEM + 10) });
  const muitas = Array.from({ length: LIMITE_MENSAGENS_DA_CONVERSA + 3 }, (_, indice) => mensagem(indice + 10));
  const curta = await montar({ mensagens: [longa] }).service.consultarConversa({ usuarioId: 7, data: '2026-10-19' }, GESTOR);
  assert.equal(curta.mensagens[0].texto.length, LIMITE_CARACTERES_DA_MENSAGEM);
  assert.equal(curta.mensagens[0].truncada, true);
  const grande = await montar({ mensagens: muitas }).service.consultarConversa({ usuarioId: 7, data: '2026-10-19' }, GESTOR);
  assert.equal(grande.mensagens.length, LIMITE_MENSAGENS_DA_CONVERSA);
  assert.equal(grande.mensagens.at(-1)?.texto, `texto ${LIMITE_MENSAGENS_DA_CONVERSA + 12}`);
  assert.equal(grande.haMais, true);
});

test('a busca é no nome do desenvolvedor pedido e devolve o dia de cada achado', async () => {
  const { service, consultas } = montar({ mensagens: [mensagem(1, { conversaId: '7-2026-10-12', texto: 'travei no deploy' })] });
  const resultado = await service.buscarMensagens({ usuarioId: 7, texto: 'deploy' }, GESTOR);
  assert.deepEqual(consultas[0], { usuarioId: 7, texto: 'deploy' });
  assert.deepEqual(resultado.mensagens, [{ data: '2026-10-12', autor: AutorChatEnum.IA, texto: 'travei no deploy', truncada: false }]);
});
