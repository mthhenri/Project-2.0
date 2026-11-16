import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AutorMensagemDiretaEnum, MensagemDiretaEventoPublicarDto } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor, criarGestor } from '../../../testes/fabricas';
import { MensagemDiretaPostgresRepository } from '../repositories/mensagem-direta-postgres.repository';
import { MensagemDiretaSupervisaoRepository } from '../repositories/mensagem-direta-supervisao.repository';
import { MensagemDiretaSupervisaoService } from './mensagem-direta-supervisao.service';

// A supervisão da conversa um a um (tasks 359 e 391) com banco real: o cursor que o cliente monta não pula a auditoria nem o aviso, a segunda
// leitura do dia não duplica, e o par que nunca trocou mensagem responde "não encontrada" sem criar conversa nem auditoria.

const como = (usuario: { id: number; login: string; tipo: unknown }) => ({ sub: usuario.id, login: usuario.login, tipo: usuario.tipo }) as never;
const CURSOR_FORJADO = Buffer.from(JSON.stringify([4102444800000, 'ffffffff-ffff-ffff-ffff-ffffffffffff'])).toString('base64url');

async function montar(conexao: ConexaoTeste) {
    const eventos: MensagemDiretaEventoPublicarDto[] = [];
    const eventosService = { publicarParaUsuarios: async (dto: MensagemDiretaEventoPublicarDto) => { eventos.push(dto); } };
    const armazenamento = new MensagemDiretaPostgresRepository(conexao);
    const leituras = criarRepositorio(MensagemDiretaSupervisaoRepository, conexao);
    const service = new MensagemDiretaSupervisaoService(armazenamento, leituras, criarRepositorio(UsuarioRepository, conexao), eventosService as never);
    const gestor = await criarGestor(conexao);
    const [pessoaA, pessoaB] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const [menor, maior] = pessoaA.id < pessoaB.id ? [pessoaA, pessoaB] : [pessoaB, pessoaA];
    const conversaId = `${menor.id}-${maior.id}`;
    const conversaJaLida = () => leituras.validarLeituraDoDia({ leitorUsuarioId: gestor.id, conversaId, agora: new Date() });
    const gravarMensagem = (texto: string) => armazenamento.gravar({
        mensagemId: randomUUID(), conversaId, autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: menor.id, texto,
        contemCodigo: false, mencoes: [], referencias: [],
    });
    return { service, gestor, conversaId, conversaJaLida, gravarMensagem, eventos, armazenamento };
}

testarComBanco('cursor forjado: a primeira leitura do dia audita e avisa; a segunda não duplica o aviso nem a mensagem do sistema', async (conexao) => {
    const { service, gestor, conversaId, conversaJaLida, gravarMensagem, eventos, armazenamento } = await montar(conexao);
    await gravarMensagem('conteúdo da conversa');

    assert.equal(await conversaJaLida(), false);
    const primeira = (await service.lerConversaSupervisionada({ conversaId, cursor: CURSOR_FORJADO }, como(gestor))).dados!;
    assert.equal(primeira.participantesAvisados, true);
    assert.equal(await conversaJaLida(), true, 'a leitura ficou auditada mesmo vindo com cursor');
    assert.equal(eventos.length, 1, 'o aviso foi publicado aos dois participantes');

    const segunda = (await service.lerConversaSupervisionada({ conversaId, cursor: CURSOR_FORJADO }, como(gestor))).dados!;
    assert.equal(segunda.participantesAvisados, false);
    assert.equal(eventos.length, 1, 'nenhum aviso novo no mesmo dia');

    const todas = (await armazenamento.listarConversa({ conversaId, limite: 50 })).mensagens;
    assert.equal(todas.filter((mensagem) => mensagem.autor === AutorMensagemDiretaEnum.SISTEMA).length, 1);
});

testarComBanco('abrir sem cursor continua auditando a cada abertura e avisando uma vez por dia', async (conexao) => {
    const { service, gestor, conversaId, gravarMensagem } = await montar(conexao);
    await gravarMensagem('olá');

    const primeira = (await service.lerConversaSupervisionada({ conversaId }, como(gestor))).dados!;
    const segunda = (await service.lerConversaSupervisionada({ conversaId }, como(gestor))).dados!;
    assert.equal(primeira.participantesAvisados, true);
    assert.equal(segunda.participantesAvisados, false);
    assert.ok(primeira.mensagens.some((mensagem) => mensagem.autor === AutorMensagemDiretaEnum.SISTEMA), 'a primeira página já traz o aviso');
});

testarComBanco('par que nunca trocou mensagem: 404, sem conversa, sem auditoria e sem aviso; com cursor forjado, página vazia sem rastro', async (conexao) => {
    const { service, gestor, conversaId, conversaJaLida, eventos, armazenamento } = await montar(conexao);

    await assert.rejects(service.lerConversaSupervisionada({ conversaId }, como(gestor)), ResourceNotFoundException);
    const vazia = (await service.lerConversaSupervisionada({ conversaId, cursor: CURSOR_FORJADO }, como(gestor))).dados!;
    assert.deepEqual(vazia.mensagens, []);
    assert.equal(vazia.participantesAvisados, false);

    assert.equal(await conversaJaLida(), false, 'nenhuma auditoria');
    assert.equal(eventos.length, 0, 'nenhum aviso publicado');
    assert.equal((await armazenamento.listarConversa({ conversaId, limite: 50 })).mensagens.length, 0, 'a conversa não nasceu');
});
