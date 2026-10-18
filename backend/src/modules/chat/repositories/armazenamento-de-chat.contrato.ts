import { describe, it, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum, NivelIaEnum } from '@project20/shared';
import { ChatMensagemNova } from '../domain/chat-mensagem.documento';
import { ArmazenamentoDeChat } from './armazenamento-de-chat';

/** Os testes de contrato rodam contra serviços reais e ficam desligados por padrão: `CHAT_INTEGRACAO=1` os liga. */
export const CONTRATO_LIGADO = process.env.CHAT_INTEGRACAO === '1';

const espera = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

/**
 * A mesma lista de cenários para toda implementação de `ArmazenamentoDeChat` (task 162): é o que garante que trocar o armazenamento
 * (OpenSearch no desenvolvimento, Postgres na produção de teste, Elasticsearch na de verdade) não muda o que o chat enxerga.
 * Cada execução usa usuários próprios (números altos e aleatórios) e `limpar` apaga o que gravou.
 */
export function registrarContratoDeArmazenamento(
  nome: string,
  criar: () => Promise<ArmazenamentoDeChat>,
  limpar: (usuarioIds: number[]) => Promise<void>,
): void {
  describe(`contrato do armazenamento do chat: ${nome}`, { skip: !CONTRATO_LIGADO && 'defina CHAT_INTEGRACAO=1 (usa o serviço real)' }, () => {
    const base = 900_000_000 + Math.floor(Math.random() * 90_000_000);
    const dono = base;
    const outro = base + 1;
    const conversaId = `${dono}-2026-10-17`;
    let armazenamento: ArmazenamentoDeChat;

    const mensagem = (texto: string, extras: Partial<ChatMensagemNova> = {}): ChatMensagemNova => ({
      conversaId,
      usuarioId: dono,
      contexto: ContextoChatEnum.CHAT,
      autor: AutorChatEnum.USUARIO,
      texto,
      ...extras,
    });

    after(async () => {
      await limpar([dono, outro]);
    });

    it('grava e lê a conversa em ordem crescente, com os campos opcionais e o conteúdo bruto', async () => {
      armazenamento = await criar();
      const primeira = await armazenamento.gravar(mensagem('Bom dia, preciso da descrição do cadastro'));
      await espera(15);
      const segunda = await armazenamento.gravar(
        mensagem('Claro, aqui está', { autor: AutorChatEnum.IA, nivel: NivelIaEnum.RAPIDO, modelo: 'modelo-x', tokensEntrada: 10, propostaId: 7, conteudoBruto: [{ type: 'text', text: 'Claro' }] }),
      );
      assert.ok(primeira.id && segunda.id && primeira.id !== segunda.id);
      const lida = await armazenamento.listarConversa({ conversaId, usuarioId: dono });
      assert.deepEqual(lida.map((item) => item.id), [primeira.id, segunda.id]);
      assert.equal(lida[1].autor, AutorChatEnum.IA);
      assert.equal(lida[1].nivel, NivelIaEnum.RAPIDO);
      assert.equal(lida[1].tokensEntrada, 10);
      assert.equal(lida[1].propostaId, 7);
      assert.equal(lida[0].propostaId, null);
      assert.deepEqual(lida[1].conteudoBruto, [{ type: 'text', text: 'Claro' }]);
      assert.ok(lida[0].createdDate instanceof Date && lida[0].createdDate <= lida[1].createdDate);
    });

    it('um usuário nunca lê a conversa nem busca nas mensagens de outro', async () => {
      assert.deepEqual(await armazenamento.listarConversa({ conversaId, usuarioId: outro }), []);
      assert.deepEqual(await armazenamento.buscar({ usuarioId: outro, texto: 'cadastro' }), []);
    });

    it('a busca ignora acento, exige todas as palavras e não acha o que não existe', async () => {
      assert.equal((await armazenamento.buscar({ usuarioId: dono, texto: 'descricao' })).length, 1);
      assert.equal((await armazenamento.buscar({ usuarioId: dono, texto: 'descrição cadastro' })).length, 1);
      assert.equal((await armazenamento.buscar({ usuarioId: dono, texto: 'cadastro inexistentexyz' })).length, 0);
      assert.equal((await armazenamento.buscar({ usuarioId: dono, texto: 'inexistentexyz' })).length, 0);
    });

    it('a busca respeita o período', async () => {
      const ontem = new Date(Date.now() - 24 * 3_600_000);
      const amanha = new Date(Date.now() + 24 * 3_600_000);
      assert.equal((await armazenamento.buscar({ usuarioId: dono, texto: 'cadastro', inicio: ontem, fim: amanha })).length, 1);
      assert.equal((await armazenamento.buscar({ usuarioId: dono, texto: 'cadastro', inicio: amanha })).length, 0);
      assert.equal((await armazenamento.buscar({ usuarioId: dono, texto: 'cadastro', fim: ontem })).length, 0);
    });

    it('lista as conversas do chat (uma por dia), da mais recente, com total, última data e primeira mensagem; check-in fica de fora', async () => {
      const outroDia = `${dono}-2026-10-18`;
      await armazenamento.gravar(mensagem('Primeira do dia 18', { conversaId: outroDia }));
      await espera(15);
      await armazenamento.gravar(mensagem('Segunda do dia 18', { conversaId: outroDia, autor: AutorChatEnum.IA }));
      await armazenamento.gravar(mensagem('Conversa do check-in', { conversaId: `${dono}-checkin-2026-10-18`, contexto: ContextoChatEnum.CHECKIN }));
      const conversas = await armazenamento.listarConversas({ usuarioId: dono });
      assert.deepEqual(conversas.map((balde) => balde.key), [outroDia, conversaId]);
      assert.equal(conversas[0].doc_count, 2);
      assert.equal(conversas[1].doc_count, 2);
      assert.equal(conversas[0].primeira.hits.hits[0]._source.texto, 'Primeira do dia 18');
      assert.equal(conversas[1].primeira.hits.hits[0]._source.texto, 'Bom dia, preciso da descrição do cadastro');
      assert.ok(conversas[0].ultima.value >= conversas[1].ultima.value);
      assert.deepEqual(await armazenamento.listarConversas({ usuarioId: outro }), []);
    });

    it('guarda e troca o título da conversa, só para o dono, e quem não tem título não aparece', async () => {
      assert.deepEqual(await armazenamento.listarTitulos({ usuarioId: dono, conversaIds: [] }), {});
      await armazenamento.gravarTitulo(conversaId, dono, 'Descrição do cadastro');
      assert.deepEqual(await armazenamento.listarTitulos({ usuarioId: dono, conversaIds: [conversaId, `${dono}-2026-10-18`] }), { [conversaId]: 'Descrição do cadastro' });
      await armazenamento.gravarTitulo(conversaId, dono, 'Cadastro de parceiros');
      assert.deepEqual(await armazenamento.listarTitulos({ usuarioId: dono, conversaIds: [conversaId] }), { [conversaId]: 'Cadastro de parceiros' });
      assert.deepEqual(await armazenamento.listarTitulos({ usuarioId: outro, conversaIds: [conversaId] }), {});
    });
  });
}
