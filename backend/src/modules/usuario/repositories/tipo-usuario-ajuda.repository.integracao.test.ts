import * as assert from 'node:assert/strict';
import { DESCRICAO_TIPO_USUARIO, TipoUsuarioEnum } from '@project20/shared';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { TipoUsuarioAjudaRepository } from './tipo-usuario-ajuda.repository';

// Textos de ajuda dos tipos (task 308): a migration semeia o padrão do `shared`; alterar troca o texto do tipo e só dele.

testarComBanco('listar traz os quatro tipos com o texto semeado, igual ao padrão do shared', async (conexao) => {
    const repositorio = criarRepositorio(TipoUsuarioAjudaRepository, conexao);
    const ajudas = await repositorio.listar();
    assert.equal(ajudas.length, 4);
    for (const tipo of Object.values(TipoUsuarioEnum)) {
        assert.equal(ajudas.find((ajuda) => ajuda.tipo === tipo)?.texto, DESCRICAO_TIPO_USUARIO[tipo], `texto de ${tipo} diferente do padrão`);
    }
});

testarComBanco('alterar troca o texto do tipo e não toca os outros', async (conexao) => {
    const repositorio = criarRepositorio(TipoUsuarioAjudaRepository, conexao);
    const antes = await repositorio.listar();
    assert.equal(await repositorio.alterar({ tipo: TipoUsuarioEnum.AUXILIAR, texto: 'Novo texto\n✓ item' }), true);

    const depois = await repositorio.listar();
    assert.equal(depois.find((ajuda) => ajuda.tipo === TipoUsuarioEnum.AUXILIAR)?.texto, 'Novo texto\n✓ item');
    for (const tipo of [TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR]) {
        assert.deepEqual(depois.find((ajuda) => ajuda.tipo === tipo), antes.find((ajuda) => ajuda.tipo === tipo));
    }
});

testarComBanco('alterar um tipo que não existe devolve false', async (conexao) => {
    const repositorio = criarRepositorio(TipoUsuarioAjudaRepository, conexao);
    assert.equal(await repositorio.alterar({ tipo: 'INEXISTENTE' as TipoUsuarioEnum, texto: 'x' }), false);
});
