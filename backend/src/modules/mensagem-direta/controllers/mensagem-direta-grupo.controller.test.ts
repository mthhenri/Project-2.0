import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { MensagemDiretaGrupoController } from './mensagem-direta-grupo.controller';

// Grupos do chat (task 246): qualquer usuário autenticado, sempre como a pessoa do token. O `grupoId` da rota entra no DTO pela controller, nunca pelo
// corpo ou pela query. Só a supervisão é de gestor.

const USUARIO = { sub: 4, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

test('verbos e caminhos das doze rotas', () => {
    assert.deepEqual(
        Object.values(rotasPorNome(MensagemDiretaGrupoController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
        [
            'DELETE grupo/:grupoId/membro',
            'GET grupo/:grupoId',
            'GET grupo/:grupoId/mensagens',
            'GET supervisao/grupo/:grupoId',
            'GET supervisao/grupos',
            'PATCH grupo/:grupoId',
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
