import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { ChatMensagemLida } from '../domain/chat-mensagem.documento';
import { LIMITE_CARACTERES_DA_MENSAGEM, LIMITE_MENSAGENS_DA_CONVERSA } from '../domain/conversa-do-desenvolvedor';
import { ConsultaBusca } from '../domain/chat-consultas';
import { ArmazenamentoDeChat } from '../repositories/armazenamento-de-chat';
import { ChatMinhasConversasService } from './chat-minhas-conversas.service';

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
        modeloPlanejado: null,
        tokensEntrada: 10,
        tokensSaida: 5,
        tokensCache: 0,
        propostaIds: [],
        execucaoId: null,
        atividadeId: null,
        demandaId: null,
        conteudoBruto: '{"segredo":true}',
        createdDate: new Date(Date.UTC(2026, 9, 19, 12, indice)),
        ...parcial,
    };
}

function criar(armazenamento: Partial<ArmazenamentoDeChat>): ChatMinhasConversasService {
    return new ChatMinhasConversasService(armazenamento as ArmazenamentoDeChat);
}

test('buscar: o dono é sempre o usuário do token e só a fala do chat volta, sem check-in, plano ou aviso do sistema', async () => {
    const consultas: ConsultaBusca[] = [];
    const servico = criar({
        buscar: async (consulta) => {
            consultas.push(consulta);
            return [
                mensagem(1),
                mensagem(2, { contexto: ContextoChatEnum.CHECKIN }),
                mensagem(3, { autor: AutorChatEnum.SISTEMA }),
                mensagem(4, { conversaId: '7-2026-10-12' }),
            ];
        },
    });
    const resultado = await servico.buscarMensagens({ texto: 'deploy' }, DESENVOLVEDOR);
    assert.equal(consultas[0].usuarioId, 7);
    assert.deepEqual(resultado.mensagens.map((item) => [item.data, item.texto]), [['2026-10-19', 'texto 1'], ['2026-10-12', 'texto 4']]);
    assert.equal(JSON.stringify(resultado).includes('segredo'), false, 'o conteúdo bruto nunca vai à IA');
});

test('buscar: o período corta pelo dia da conversa e o armazenamento recebe o período com folga', async () => {
    const consultas: ConsultaBusca[] = [];
    const servico = criar({
        buscar: async (consulta) => {
            consultas.push(consulta);
            return [mensagem(1, { conversaId: '7-2026-10-05' }), mensagem(2, { conversaId: '7-2026-10-12' }), mensagem(3, { conversaId: '7-2026-10-25' })];
        },
    });
    const resultado = await servico.buscarMensagens({ texto: 'deploy', inicio: '2026-10-10', fim: '2026-10-20' }, DESENVOLVEDOR);
    assert.deepEqual(resultado.mensagens.map((item) => item.data), ['2026-10-12']);
    assert.ok(consultas[0].inicio && consultas[0].inicio.getTime() < Date.UTC(2026, 9, 10), 'começa antes do início');
    assert.ok(consultas[0].fim && consultas[0].fim.getTime() > Date.UTC(2026, 9, 20, 23), 'termina depois do fim');
});

test('buscar: texto longo é cortado e avisado; sem período, o armazenamento não recebe datas', async () => {
    const consultas: ConsultaBusca[] = [];
    const servico = criar({
        buscar: async (consulta) => {
            consultas.push(consulta);
            return [mensagem(1, { texto: 'x'.repeat(LIMITE_CARACTERES_DA_MENSAGEM + 50) })];
        },
    });
    const resultado = await servico.buscarMensagens({ texto: 'deploy' }, DESENVOLVEDOR);
    assert.equal(resultado.mensagens[0].texto.length, LIMITE_CARACTERES_DA_MENSAGEM);
    assert.equal(resultado.mensagens[0].truncada, true);
    assert.equal(consultas[0].inicio, undefined);
    assert.equal(consultas[0].fim, undefined);
});

test('consultar: lê a conversa do dia do próprio usuário, com o título, e nada além da fala', async () => {
    const pedidos: unknown[] = [];
    const servico = criar({
        listarConversa: async (consulta) => {
            pedidos.push(consulta);
            return [mensagem(1), mensagem(2, { contexto: ContextoChatEnum.CHECKIN }), mensagem(3, { autor: AutorChatEnum.SISTEMA }), mensagem(4)];
        },
        listarTitulos: async () => ({ '7-2026-10-19': { titulo: 'Deploy da semana', editado: false } }),
    });
    const resultado = await servico.consultarConversa({ data: '2026-10-19' }, DESENVOLVEDOR);
    assert.deepEqual(pedidos, [{ conversaId: '7-2026-10-19', usuarioId: 7 }]);
    assert.equal(resultado.titulo, 'Deploy da semana');
    assert.deepEqual(resultado.mensagens.map((item) => item.texto), ['texto 1', 'texto 4']);
    assert.equal(resultado.haMais, false);
    assert.equal(JSON.stringify(resultado).includes('segredo'), false);
});

test('consultar: sem título gravado usa o nome padrão e, com mais mensagens que o limite, fica com as mais recentes e avisa', async () => {
    const muitas = Array.from({ length: LIMITE_MENSAGENS_DA_CONVERSA + 5 }, (_, indice) => mensagem(indice + 1));
    const servico = criar({ listarConversa: async () => muitas, listarTitulos: async () => ({}) });
    const resultado = await servico.consultarConversa({ data: '2026-10-19' }, DESENVOLVEDOR);
    assert.match(resultado.titulo, /19 de outubro de 2026/);
    assert.equal(resultado.mensagens.length, LIMITE_MENSAGENS_DA_CONVERSA);
    assert.equal(resultado.mensagens.at(-1)?.texto, `texto ${LIMITE_MENSAGENS_DA_CONVERSA + 5}`);
    assert.equal(resultado.haMais, true);
});
