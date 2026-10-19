import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum, NivelIaEnum } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor } from '../../../testes/fabricas';
import { LIMITE_BUSCA } from '../domain/chat-consultas';
import { ChatMensagemNova } from '../domain/chat-mensagem.documento';
import { ChatMensagemPostgresRepository } from './chat-mensagem-postgres.repository';

// Armazenamento provisório do chat no Postgres (SYSTEM.SPEC.md §12 `chat`, task 162), contra o banco real: busca `tsvector` em
// português com `unaccent`, a mesma ordem e os mesmos limites do índice de busca, conversas só do contexto CHAT e mensagens nunca
// alteradas. Dentro da transação do teste; o `created_date` é gravado com o instante do aplicativo, então a ordem é testável.

const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(ChatMensagemPostgresRepository, conexao);
const espera = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

async function cenario(conexao: ConexaoTeste) {
  const dono = await criarDesenvolvedor(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const conversaId = `${dono.id}-2026-10-17`;
  const mensagem = (texto: string, extras: Partial<ChatMensagemNova> = {}): ChatMensagemNova => ({
    conversaId, usuarioId: dono.id, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto, ...extras,
  });
  return { dono, outro, conversaId, mensagem };
}

testarComBanco('gravar e listarConversa: ordem crescente, campos opcionais e conteúdo bruto preservados', async (conexao) => {
  const { dono, conversaId, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  const primeira = await repositorio.gravar(mensagem('Bom dia'));
  await espera(15);
  const segunda = await repositorio.gravar(mensagem('Claro, aqui está', {
    autor: AutorChatEnum.IA, nivel: NivelIaEnum.RAPIDO, modelo: 'modelo-x', tokensEntrada: 10, tokensSaida: 20, tokensCache: 0,
    propostaId: 7, conteudoBruto: [{ type: 'text', text: 'Claro' }],
  }));

  const lida = await repositorio.listarConversa({ conversaId, usuarioId: dono.id });
  assert.deepEqual(lida.map((item) => item.id), [primeira.id, segunda.id]);
  assert.equal(lida[1].autor, AutorChatEnum.IA);
  assert.equal(lida[1].nivel, NivelIaEnum.RAPIDO);
  assert.equal(lida[1].modelo, 'modelo-x');
  assert.equal(lida[1].tokensEntrada, 10);
  assert.equal(lida[1].tokensCache, 0);
  assert.equal(lida[1].propostaId, 7);
  assert.equal(lida[0].propostaId, null);
  assert.deepEqual(lida[1].conteudoBruto, [{ type: 'text', text: 'Claro' }]);
  assert.ok(lida[0].createdDate instanceof Date && lida[0].createdDate <= lida[1].createdDate);
});

testarComBanco('listarConversa: só a conversa pedida e só do dono (um usuário nunca lê a conversa do outro)', async (conexao) => {
  const { dono, outro, conversaId, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  await repositorio.gravar(mensagem('do dia 17'));
  await repositorio.gravar(mensagem('do dia 18', { conversaId: `${dono.id}-2026-10-18` }));

  assert.deepEqual((await repositorio.listarConversa({ conversaId, usuarioId: dono.id })).map((item) => item.texto), ['do dia 17']);
  assert.deepEqual(await repositorio.listarConversa({ conversaId, usuarioId: outro.id }), []);
});

testarComBanco('buscar: com e sem acento acham a mesma mensagem, e todas as palavras são exigidas', async (conexao) => {
  const { dono, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  await repositorio.gravar(mensagem('Preciso da descrição do cadastro de parceiros'));

  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'descricao' })).length, 1);
  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'descrição' })).length, 1);
  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'DESCRIÇÃO cadastro' })).length, 1);
  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'cadastro inexistentexyz' })).length, 0);
  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'inexistentexyz' })).length, 0);
});

testarComBanco('buscar: só as mensagens do próprio usuário', async (conexao) => {
  const { dono, outro, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  await repositorio.gravar(mensagem('segredo do cadastro'));
  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'cadastro' })).length, 1);
  assert.deepEqual(await repositorio.buscar({ usuarioId: outro.id, texto: 'cadastro' }), []);
});

testarComBanco('buscar: respeita o período (início e fim, inclusive só um dos dois)', async (conexao) => {
  const { dono, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  await repositorio.gravar(mensagem('relatório de hoje'));
  const ontem = new Date(Date.now() - 24 * 3_600_000);
  const amanha = new Date(Date.now() + 24 * 3_600_000);

  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'relatório', inicio: ontem, fim: amanha })).length, 1);
  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'relatório', inicio: amanha })).length, 0);
  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'relatório', fim: ontem })).length, 0);
});

testarComBanco('buscar: a mais relevante primeiro e, em empate, a mais recente', async (conexao) => {
  const { dono, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  const antiga = await repositorio.gravar(mensagem('deploy da API'));
  await espera(15);
  const recente = await repositorio.gravar(mensagem('deploy da API'));
  await espera(15);
  const maisRelevante = await repositorio.gravar(mensagem('deploy deploy deploy'));

  const achadas = await repositorio.buscar({ usuarioId: dono.id, texto: 'deploy' });
  assert.equal(achadas[0].id, maisRelevante.id);
  assert.deepEqual(achadas.slice(1).map((item) => item.id), [recente.id, antiga.id]);
});

testarComBanco('buscar: devolve no máximo o limite do índice de busca', async (conexao) => {
  const { dono, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  for (let indice = 0; indice < LIMITE_BUSCA + 3; indice++) await repositorio.gravar(mensagem(`pauta número ${indice}`));
  assert.equal((await repositorio.buscar({ usuarioId: dono.id, texto: 'pauta' })).length, LIMITE_BUSCA);
});

testarComBanco('listarConversas: uma por dia, da mais recente, com total, última data e primeira mensagem; check-in fica de fora', async (conexao) => {
  const { dono, outro, conversaId, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  const outroDia = `${dono.id}-2026-10-18`;
  await repositorio.gravar(mensagem('Primeira do dia 17'));
  await espera(15);
  await repositorio.gravar(mensagem('Primeira do dia 18', { conversaId: outroDia }));
  await espera(15);
  await repositorio.gravar(mensagem('Segunda do dia 18', { conversaId: outroDia, autor: AutorChatEnum.IA }));
  await repositorio.gravar(mensagem('Conversa do check-in', { conversaId: `${dono.id}-checkin-2026-10-18`, contexto: ContextoChatEnum.CHECKIN }));
  await repositorio.gravar({ ...mensagem('Do outro usuário'), usuarioId: outro.id, conversaId: `${outro.id}-2026-10-18` });

  const conversas = await repositorio.listarConversas({ usuarioId: dono.id });
  assert.deepEqual(conversas.map((balde) => balde.key), [outroDia, conversaId]);
  assert.equal(conversas[0].doc_count, 2);
  assert.equal(conversas[1].doc_count, 1);
  assert.equal(conversas[0].primeira.hits.hits[0]._source.texto, 'Primeira do dia 18');
  assert.ok(conversas[0].ultima.value >= conversas[1].ultima.value);
  assert.deepEqual((await repositorio.listarConversas({ usuarioId: outro.id })).map((balde) => balde.key), [`${outro.id}-2026-10-18`]);
});

testarComBanco('título da conversa: grava, troca e só aparece para o dono; quem não tem título não aparece', async (conexao) => {
  const { dono, outro, conversaId } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  assert.deepEqual(await repositorio.listarTitulos({ usuarioId: dono.id, conversaIds: [] }), {});

  await repositorio.gravarTitulo(conversaId, dono.id, 'Descrição do cadastro');
  assert.deepEqual(await repositorio.listarTitulos({ usuarioId: dono.id, conversaIds: [conversaId, `${dono.id}-2026-10-18`] }), { [conversaId]: 'Descrição do cadastro' });

  await repositorio.gravarTitulo(conversaId, dono.id, 'Cadastro de parceiros');
  assert.deepEqual(await repositorio.listarTitulos({ usuarioId: dono.id, conversaIds: [conversaId] }), { [conversaId]: 'Cadastro de parceiros' });
  assert.deepEqual(await repositorio.listarTitulos({ usuarioId: outro.id, conversaIds: [conversaId] }), {});
  const linhas = await conexao.raw('SELECT COUNT(*)::int AS total FROM chat_conversa WHERE conversa_id = :conversaId', { conversaId });
  assert.equal(linhas.rows[0].total, 1);
});

testarComBanco('mensagens nunca são alteradas: gravar de novo cria outra linha e as anteriores seguem intactas', async (conexao) => {
  const { dono, conversaId, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  const primeira = await repositorio.gravar(mensagem('texto original'));
  await repositorio.gravar(mensagem('texto original'));

  const lidas = await repositorio.listarConversa({ conversaId, usuarioId: dono.id });
  assert.equal(lidas.length, 2);
  assert.notEqual(lidas[0].id, lidas[1].id);
  assert.equal(lidas.find((item) => item.id === primeira.id)?.texto, 'texto original');
});

testarComBanco('mensagem excluída (soft delete) some da leitura, da busca e das conversas', async (conexao) => {
  const { dono, conversaId, mensagem } = await cenario(conexao);
  const repositorio = repositorioDe(conexao);
  await repositorio.gravar(mensagem('apagável cadastro'));
  await conexao.raw('UPDATE chat_mensagem SET is_deleted = true, deleted_date = NOW() WHERE conversa_id = :conversaId', { conversaId });

  assert.deepEqual(await repositorio.listarConversa({ conversaId, usuarioId: dono.id }), []);
  assert.deepEqual(await repositorio.buscar({ usuarioId: dono.id, texto: 'cadastro' }), []);
  assert.deepEqual(await repositorio.listarConversas({ usuarioId: dono.id }), []);
});
