import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { recuperarAtividadeDaExecucao } from './atividade-da-execucao';

const USUARIO = { sub: 1, tipo: TipoUsuarioEnum.DESENVOLVEDOR } as JwtPayload;
const servicoQue = (recuperar: () => Promise<unknown>) => ({ recuperar }) as unknown as Pick<AtividadeService, 'recuperar'>;

test('devolve a atividade quando ela existe', async () => {
    const atividade = { id: 7, nome: 'Tela de login' };
    const encontrada = await recuperarAtividadeDaExecucao(servicoQue(async () => ({ dados: atividade })), { id: 7 }, USUARIO);
    assert.deepEqual(encontrada, atividade);
});

test('demanda ou projeto excluído com o cronômetro rodando: devolve null, para a IA ainda poder pausar', async () => {
    const encontrada = await recuperarAtividadeDaExecucao(servicoQue(async () => { throw new ResourceNotFoundException('Atividade'); }), { id: 7 }, USUARIO);
    assert.equal(encontrada, null);
});

test('qualquer outra falha continua subindo', async () => {
    await assert.rejects(recuperarAtividadeDaExecucao(servicoQue(async () => { throw new Error('banco fora'); }), { id: 7 }, USUARIO), /banco fora/);
});
