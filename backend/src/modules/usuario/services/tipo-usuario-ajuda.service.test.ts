import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { TipoUsuarioAjudaService } from './tipo-usuario-ajuda.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

// Textos de ajuda dos tipos de usuário (task 308): só o administrador altera; o texto é aparado e validado na service.

const ADMINISTRADOR = { sub: 1, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR = { sub: 9, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

const DADOS = { tipo: TipoUsuarioEnum.AUXILIAR, texto: 'Conduz o trabalho.\n\n### Pode\n✓ Ver tudo' };

function criarServico(repositorio: Record<string, unknown>): TipoUsuarioAjudaService {
    const servico = Object.create(TipoUsuarioAjudaService.prototype) as Record<string, unknown>;
    servico.ajudaRepositorio = repositorio;
    return servico as unknown as TipoUsuarioAjudaService;
}

test('alterar: o gestor é recusado e nada é gravado', async () => {
    let gravou = false;
    const servico = criarServico({ alterar: async () => { gravou = true; return true; } });
    await assert.rejects(() => servico.alterar(DADOS, GESTOR), UnauthorizedAccessException);
    assert.equal(gravou, false);
});

test('alterar: o administrador grava o texto sem o espaço das pontas e a resposta devolve o que ficou', async () => {
    let gravado: unknown;
    const servico = criarServico({ alterar: async (dto: unknown) => { gravado = dto; return true; } });
    const resposta = await servico.alterar({ ...DADOS, texto: '\n  Conduz.  \n' }, ADMINISTRADOR);
    assert.deepEqual(gravado, { tipo: TipoUsuarioEnum.AUXILIAR, texto: 'Conduz.' });
    assert.equal(resposta.sucesso, true);
    assert.deepEqual(resposta.dados, gravado);
});

test('alterar: texto vazio ou maior que 2000 caracteres é recusado', async () => {
    const servico = criarServico({ alterar: async () => true });
    await assert.rejects(() => servico.alterar({ ...DADOS, texto: '   \n ' }, ADMINISTRADOR), BusinessException);
    await assert.rejects(() => servico.alterar({ ...DADOS, texto: 'x'.repeat(2001) }, ADMINISTRADOR), BusinessException);
    await servico.alterar({ ...DADOS, texto: 'x'.repeat(2000) }, ADMINISTRADOR);
});

test('alterar: tipo que não existe no banco vira "não encontrado"', async () => {
    const servico = criarServico({ alterar: async () => false });
    await assert.rejects(() => servico.alterar(DADOS, ADMINISTRADOR), ResourceNotFoundException);
});

test('listar devolve o que o repository trouxe', async () => {
    const ajudas = [{ tipo: TipoUsuarioEnum.GESTOR, texto: 'x' }];
    const servico = criarServico({ listar: async () => ajudas });
    const resposta = await servico.listar();
    assert.deepEqual(resposta.dados, ajudas);
});
