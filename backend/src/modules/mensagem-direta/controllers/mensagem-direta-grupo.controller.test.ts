import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { MensagemDiretaGrupoController } from './mensagem-direta-grupo.controller';

// Grupos do chat (task 246): qualquer usuário autenticado, sempre como a pessoa do token. O `grupoId` da rota entra no DTO pela controller, nunca pelo
// corpo ou pela query. Só a supervisão é de gestor.

const USUARIO = { sub: 4, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

test('verbos e caminhos das vinte e seis rotas', () => {
    assert.deepEqual(
        Object.values(rotasPorNome(MensagemDiretaGrupoController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
        [
            'DELETE grupo/:grupoId/membro',
            'GET grupo/:grupoId',
            'GET canal/demanda/:demandaId',
            'GET grupo/:grupoId/resumo',
            'POST grupo/:grupoId/resumo',
            'POST grupo/:grupoId/resumo/estimativa',
            'POST grupo/:grupoId/resumo/:resumoId/proposta',
            'POST grupo/:grupoId/resumo/:resumoId/proposta/:propostaId/confirmar',
            'POST grupo/:grupoId/resumo/:resumoId/proposta/:propostaId/recusar',
            'GET canal/projeto/:projetoId',
            'DELETE grupo/:grupoId/fixadas/:mensagemId',
            'GET grupo/:grupoId/busca',
            'GET grupo/:grupoId/fixadas',
            'GET grupo/:grupoId/mensagens',
            'POST grupo/:grupoId/fixadas/:mensagemId',
            'GET supervisao/grupo/:grupoId',
            'GET supervisao/grupos',
            'PATCH grupo/:grupoId',
            'POST canal/demanda/:demandaId',
            'POST canal/projeto/:projetoId',
            'POST grupo',
            'POST grupo/:grupoId/digitando',
            'POST grupo/:grupoId/mensagem',
            'POST grupo/:grupoId/membros',
            'PUT grupo/:grupoId/leitura',
            'PUT grupo/:grupoId/silencio',
        ].sort(),
    );
});

test('nenhuma rota é pública ou de administrador, e só a supervisão é de gestor', () => {
    for (const rota of Object.values(rotasPorNome(MensagemDiretaGrupoController))) {
        assert.equal(rota.publica, false, rota.nome);
        assert.equal(rota.gestorOnly, rota.caminho.startsWith('supervisao/'), rota.nome);
        assert.equal(rota.administradorOnly, false, rota.nome);
    }
});

test('o grupoId da rota vence o do corpo e da query, e o usuário é sempre o do token', async () => {
    const chamadas: Record<string, unknown[]> = {};
    const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas[nome] = argumentos; return null; };
    const controller = new MensagemDiretaGrupoController(
        {
            alterarGrupo: registrar('alterar'),
            adicionarMembros: registrar('membros'),
            sairDoGrupo: registrar('sair'),
            listarMensagens: registrar('mensagens'),
            enviarMensagem: registrar('enviar'),
            alterarLeitura: registrar('leitura'),
            alterarSilencio: registrar('silencio'),
            avisarDigitacao: registrar('digitando'),
            recuperarGrupo: registrar('recuperar'),
            criarGrupo: registrar('criar'),
        } as never,
        { listarGruposSupervisionados: registrar('listarSupervisao'), lerGrupoSupervisionado: registrar('lerSupervisao') } as never,
        {} as never,
        {} as never,
    );

    await controller.alterarGrupo(7, { grupoId: 99, nome: 'Novo' } as never, USUARIO);
    await controller.adicionarMembros(7, { grupoId: 99, usuarioIds: [5] } as never, USUARIO);
    await controller.sairDoGrupo(7, USUARIO);
    await controller.listarMensagens(7, { grupoId: 99, limite: 10 } as never, USUARIO);
    await controller.enviarMensagem(7, { grupoId: 99, texto: 'oi' } as never, USUARIO);
    await controller.alterarLeitura(7, { grupoId: 99, lidaAteData: 'x' } as never, USUARIO);
    await controller.alterarSilencio(7, { grupoId: 99, silenciada: true } as never, USUARIO);
    await controller.avisarDigitacao(7, USUARIO);
    await controller.recuperarGrupo(7, USUARIO);
    await controller.criarGrupo({ nome: 'x' } as never, USUARIO);
    await controller.listarGruposSupervisionados({ texto: 'bug' } as never, USUARIO);
    await controller.lerGrupoSupervisionado(7, { grupoId: 99, limite: 5 } as never, USUARIO);

    assert.deepEqual(chamadas.alterar, [{ grupoId: 7, nome: 'Novo' }, USUARIO]);
    assert.deepEqual(chamadas.membros, [{ grupoId: 7, usuarioIds: [5] }, USUARIO]);
    assert.deepEqual(chamadas.sair, [7, USUARIO]);
    assert.deepEqual(chamadas.mensagens, [{ grupoId: 7, limite: 10 }, USUARIO]);
    assert.deepEqual(chamadas.enviar, [{ grupoId: 7, texto: 'oi' }, USUARIO]);
    assert.deepEqual(chamadas.leitura, [{ grupoId: 7, lidaAteData: 'x' }, USUARIO]);
    assert.deepEqual(chamadas.silencio, [{ grupoId: 7, silenciada: true }, USUARIO]);
    assert.deepEqual(chamadas.digitando, [7, USUARIO]);
    assert.deepEqual(chamadas.recuperar, [7, USUARIO]);
    assert.deepEqual(chamadas.criar, [{ nome: 'x' }, USUARIO]);
    assert.deepEqual(chamadas.listarSupervisao, [{ texto: 'bug' }, USUARIO]);
    assert.deepEqual(chamadas.lerSupervisao, [{ grupoId: 7, limite: 5 }, USUARIO]);
});

test('as rotas do canal montam o tipo e o alvo pela rota, sempre como a pessoa do token', async () => {
    const chamadas: Record<string, unknown[]> = {};
    const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas[nome] = argumentos; return null; };
    const controller = new MensagemDiretaGrupoController({ recuperarCanal: registrar('recuperar'), criarCanal: registrar('criar') } as never, {} as never, {} as never, {} as never);

    await controller.recuperarCanalDaDemanda(12, USUARIO);
    assert.deepEqual(chamadas.recuperar, [{ tipo: TipoGrupoEnum.DEMANDA, alvoId: 12 }, USUARIO]);
    await controller.recuperarCanalDoProjeto(3, USUARIO);
    assert.deepEqual(chamadas.recuperar, [{ tipo: TipoGrupoEnum.PROJETO, alvoId: 3 }, USUARIO]);
    await controller.criarCanalDaDemanda(12, USUARIO);
    assert.deepEqual(chamadas.criar, [{ tipo: TipoGrupoEnum.DEMANDA, alvoId: 12 }, USUARIO]);
    await controller.criarCanalDoProjeto(3, USUARIO);
    assert.deepEqual(chamadas.criar, [{ tipo: TipoGrupoEnum.PROJETO, alvoId: 3 }, USUARIO]);
});

test('as rotas do resumo com a IA levam o grupo, o resumo e a proposta da rota, e a pessoa do token', async () => {
    const chamadas: Record<string, unknown[]> = {};
    const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas[nome] = argumentos; return null; };
    const controller = new MensagemDiretaGrupoController(
        {} as never,
        {} as never,
        { recuperarOpcoes: registrar('opcoes'), estimar: registrar('estimar'), resumir: registrar('resumir'), criarProposta: registrar('proposta'), confirmarProposta: registrar('confirmar'), recusarProposta: registrar('recusar') } as never,
        {} as never,
    );

    await controller.recuperarOpcoesDoResumo(7, USUARIO);
    assert.deepEqual(chamadas.opcoes, [{ grupoId: 7 }, USUARIO]);
    await controller.estimarResumo(7, { grupoId: 99, inicioData: 'a', fimData: 'b', enviaCodigo: false } as never, USUARIO);
    assert.deepEqual(chamadas.estimar, [{ grupoId: 7, inicioData: 'a', fimData: 'b', enviaCodigo: false }, USUARIO]);
    await controller.resumir(7, { grupoId: 99, inicioData: 'a', fimData: 'b', enviaCodigo: true } as never, USUARIO);
    assert.deepEqual(chamadas.resumir, [{ grupoId: 7, inicioData: 'a', fimData: 'b', enviaCodigo: true }, USUARIO]);
    await controller.criarPropostaDoResumo(7, 3, { grupoId: 99, resumoId: 98, texto: 'x', demandaId: 5 } as never, USUARIO);
    assert.deepEqual(chamadas.proposta, [{ grupoId: 7, resumoId: 3, texto: 'x', demandaId: 5 }, USUARIO]);
    await controller.confirmarPropostaDoResumo(7, 3, 11, USUARIO);
    assert.deepEqual(chamadas.confirmar, [{ grupoId: 7, resumoId: 3, propostaId: 11 }, USUARIO]);
    await controller.recusarPropostaDoResumo(7, 3, 11, USUARIO);
    assert.deepEqual(chamadas.recusar, [{ grupoId: 7, resumoId: 3, propostaId: 11 }, USUARIO]);
});

test('as rotas das fixadas e da busca no grupo levam o grupo e a mensagem da rota, e a pessoa do token', async () => {
    const chamadas: Record<string, unknown[]> = {};
    const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas[nome] = argumentos; return null; };
    const controller = new MensagemDiretaGrupoController(
        {} as never,
        {} as never,
        {} as never,
        { listarFixadas: registrar('listar'), fixarMensagem: registrar('fixar'), desafixarMensagem: registrar('desafixar'), buscarNoGrupo: registrar('buscar') } as never,
    );
    const mensagemId = '8d0c8a52-3a7f-4a3e-9f0e-1c2b3d4e5f60';

    await controller.listarFixadas(7, USUARIO);
    assert.deepEqual(chamadas.listar, [{ grupoId: 7 }, USUARIO]);
    await controller.fixarMensagem(7, mensagemId, USUARIO);
    assert.deepEqual(chamadas.fixar, [{ grupoId: 7, mensagemId }, USUARIO]);
    await controller.desafixarMensagem(7, mensagemId, USUARIO);
    assert.deepEqual(chamadas.desafixar, [{ grupoId: 7, mensagemId }, USUARIO]);
    await controller.buscarNoGrupo(7, { grupoId: 99, texto: 'fila' } as never, USUARIO);
    assert.deepEqual(chamadas.buscar, [{ grupoId: 7, texto: 'fila' }, USUARIO]);
});
