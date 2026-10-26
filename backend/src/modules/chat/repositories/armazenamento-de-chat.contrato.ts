import { describe, it, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { AssuntoChatEnum, AutorChatEnum, ContextoChatEnum, NivelIaEnum } from '@project20/shared';
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
        mensagem('Claro, aqui está', { autor: AutorChatEnum.IA, assunto: AssuntoChatEnum.CODIGO, nivel: NivelIaEnum.RAPIDO, modelo: 'modelo-x', tokensEntrada: 10, propostaIds: [7, 8], conteudoBruto: [{ type: 'text', text: 'Claro' }] }),
      );
      assert.ok(primeira.id && segunda.id && primeira.id !== segunda.id);
      const lida = await armazenamento.listarConversa({ conversaId, usuarioId: dono });
      assert.deepEqual(lida.map((item) => item.id), [primeira.id, segunda.id]);
      assert.equal(lida[1].autor, AutorChatEnum.IA);
      assert.equal(lida[1].nivel, NivelIaEnum.RAPIDO);
      assert.equal(lida[1].tokensEntrada, 10);
      assert.deepEqual(lida[1].propostaIds, [7, 8], 'todas as propostas do turno voltam, na ordem');
      assert.deepEqual(lida[0].propostaIds, [], 'sem proposta, a lista vem vazia');
      assert.equal(lida[1].assunto, AssuntoChatEnum.CODIGO, 'o assunto gravado volta igual');
      assert.equal(lida[0].assunto, null, 'sem assunto, volta null');
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

    it('soma os tokens gravados por dia e por modelo, só de mensagem com modelo e tokens, no fuso do sistema (task 202)', async () => {
      const modelo = `modelo-contrato-${dono}`;
      await armazenamento.gravar(mensagem('Resposta 1', { autor: AutorChatEnum.IA, modelo, tokensEntrada: 100, tokensSaida: 10, tokensCache: 5 }));
      await armazenamento.gravar(mensagem('Resposta 2', { autor: AutorChatEnum.IA, modelo, tokensEntrada: 50, tokensSaida: 4, tokensCache: 0 }));
      await armazenamento.gravar(mensagem('Sem tokens', { autor: AutorChatEnum.IA, modelo }));
      await armazenamento.gravar(mensagem('Do usuário'));
      const ontem = new Date(Date.now() - 24 * 3_600_000).toISOString().slice(0, 10);
      const amanha = new Date(Date.now() + 24 * 3_600_000).toISOString().slice(0, 10);

      const porDia = (await armazenamento.somarTokens({ dataInicio: ontem, dataFim: amanha, porMes: false, fusoHorario: 'UTC' })).filter((linha) => linha.modelo === modelo);
      assert.equal(porDia.length, 1);
      assert.deepEqual([porDia[0].mensagens, porDia[0].tokensEntrada, porDia[0].tokensSaida, porDia[0].tokensCache], [2, 150, 14, 5]);
      assert.match(porDia[0].periodo, /^\d{4}-\d{2}-\d{2}$/);

      const porMes = (await armazenamento.somarTokens({ dataInicio: ontem, dataFim: amanha, porMes: true, fusoHorario: 'UTC' })).filter((linha) => linha.modelo === modelo);
      assert.equal(porMes.length, 1);
      assert.match(porMes[0].periodo, /^\d{4}-\d{2}$/);

      const foraDoRecorte = await armazenamento.somarTokens({ dataInicio: '2000-01-01', dataFim: '2000-01-31', porMes: false, fusoHorario: 'UTC' });
      assert.equal(foraDoRecorte.filter((linha) => linha.modelo === modelo).length, 0);
    });

    it('a conversa de um plano é lida sem filtro de dono, com as mensagens de quem escreveu, e não aparece nas conversas do dia nem na busca (task 234)', async () => {
      const conversaDoPlano = `plano-${base}`;
      await armazenamento.gravar(mensagem('Pergunta de planejamentoxyz do dono', { conversaId: conversaDoPlano, contexto: ContextoChatEnum.PLANEJAMENTO }));
      await espera(15);
      await armazenamento.gravar(mensagem('Resposta do colega sobre planejamentoxyz', { conversaId: conversaDoPlano, contexto: ContextoChatEnum.PLANEJAMENTO, usuarioId: outro }));
      await espera(15);
      await armazenamento.gravar(mensagem('Resposta da IA', { conversaId: conversaDoPlano, contexto: ContextoChatEnum.PLANEJAMENTO, autor: AutorChatEnum.IA }));

      const lida = await armazenamento.listarConversa({ conversaId: conversaDoPlano });
      assert.deepEqual(lida.map((item) => item.usuarioId), [dono, outro, dono], 'todas as mensagens, de todos, em ordem');
      assert.equal(lida.every((item) => item.contexto === ContextoChatEnum.PLANEJAMENTO), true);

      assert.equal((await armazenamento.listarConversas({ usuarioId: dono })).some((balde) => balde.key === conversaDoPlano), false, 'não é conversa do dia');
      assert.equal((await armazenamento.buscar({ usuarioId: dono, texto: 'planejamentoxyz' })).length, 0, 'a busca não a acha');
    });

    it('guarda e troca o título da conversa, só para o dono, e quem não tem título não aparece', async () => {
      assert.deepEqual(await armazenamento.listarTitulos({ usuarioId: dono, conversaIds: [] }), {});
      await armazenamento.gravarTitulo({ conversaId, usuarioId: dono, titulo: 'Descrição do cadastro', editado: false });
      assert.deepEqual(await armazenamento.listarTitulos({ usuarioId: dono, conversaIds: [conversaId, `${dono}-2026-10-18`] }), { [conversaId]: { titulo: 'Descrição do cadastro', editado: false } });
      await armazenamento.gravarTitulo({ conversaId, usuarioId: dono, titulo: 'Cadastro de parceiros', editado: false });
      assert.deepEqual(await armazenamento.listarTitulos({ usuarioId: dono, conversaIds: [conversaId] }), { [conversaId]: { titulo: 'Cadastro de parceiros', editado: false } });
      assert.deepEqual(await armazenamento.listarTitulos({ usuarioId: outro, conversaIds: [conversaId] }), {});
    });

    it('o nome dado pelo usuário fica marcado como editado e, em branco, volta a não ter nome (task 192)', async () => {
      await armazenamento.gravarTitulo({ conversaId, usuarioId: dono, titulo: 'Meu nome', editado: true });
      assert.deepEqual((await armazenamento.listarTitulos({ usuarioId: dono, conversaIds: [conversaId] }))[conversaId], { titulo: 'Meu nome', editado: true });
      await armazenamento.gravarTitulo({ conversaId, usuarioId: dono, titulo: '', editado: false });
      assert.deepEqual((await armazenamento.listarTitulos({ usuarioId: dono, conversaIds: [conversaId] }))[conversaId], { titulo: '', editado: false });
    });
  });
}
