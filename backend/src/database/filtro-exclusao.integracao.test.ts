import * as assert from 'node:assert/strict';
import {
    StatusPropostaIaEnum,
    TipoPlanoFonteOrigemEnum,
    TipoPromptEnum,
    TipoPropostaIaEnum,
} from '@project20/shared';
import { BaseRepository } from '../core/base/base.repository';
import { AtividadeRepository } from '../modules/atividade/repositories/atividade.repository';
import { CalendarioRepository } from '../modules/calendario/repositories/calendario.repository';
import { ConfiguracaoIaRepository } from '../modules/configuracao-ia/repositories/configuracao-ia.repository';
import { DemandaRepository } from '../modules/demanda/repositories/demanda.repository';
import { PlanoFonteRepository } from '../modules/plano/repositories/plano-fonte.repository';
import { PlanoRepository } from '../modules/plano/repositories/plano.repository';
import { ProjetoRepository } from '../modules/projeto/repositories/projeto.repository';
import { PromptRepository } from '../modules/prompt/repositories/prompt.repository';
import { PropostaIaRepository } from '../modules/proposta-ia/repositories/proposta-ia.repository';
import { TagRepository } from '../modules/tag/repositories/tag.repository';
import { UsuarioRepository } from '../modules/usuario/repositories/usuario.repository';
import { ConexaoTeste, testarComBanco } from '../testes/banco-teste';
import { criarRepositorio } from '../testes/criar-repositorio';
import { criarAdministrador, criarAtividade, criarDemanda, criarDemandaConexao, criarDesenvolvedor, criarDiaNaoUtil, criarGestor, criarProjeto, criarTag, excluirLinha } from '../testes/fabricas';

// Task 276: registro `is_deleted = true` é morto. Cada teste exclui uma linha e prova que a consulta corrigida não a enxerga.

const NOME_DO_AUTOR_EXCLUIDO = 'Usuário removido';

/** Marca como excluída a linha de uma tabela de referência (a transação do teste desfaz). */
async function excluirReferencia(conexao: ConexaoTeste, tabela: string, codigo: string): Promise<void> {
    await conexao.raw(`
        UPDATE :tabela:
        SET
            is_deleted = true,
            deleted_date = NOW()
        WHERE
            codigo = :codigo
    `, { tabela, codigo });
}

/** Põe uma data de exclusão conhecida: dentro da transação do teste o `NOW()` é congelado e não distinguiria uma segunda gravação. */
async function excluirNoPassado(conexao: ConexaoTeste, tabela: string, id: number): Promise<void> {
    await conexao.raw(`
        UPDATE :tabela:
        SET
            is_deleted = true,
            deleted_date = '2020-01-01T00:00:00Z'
        WHERE
            id = :id
    `, { tabela, id });
}

async function anoDaExclusao(conexao: ConexaoTeste, tabela: string, id: number): Promise<number> {
    const { rows } = await conexao.raw(`
        SELECT
            EXTRACT(
                YEAR
                FROM
                    deleted_date AT TIME ZONE 'UTC'
            )::int AS ano
        FROM
            :tabela:
        WHERE
            id = :id
    `, { tabela, id });
    return rows[0].ano;
}

// --- Autor excluído: a linha continua, o nome de quem foi excluído não é lido.

testarComBanco('prompt de autor excluído continua, com "Usuário removido"', async (conexao) => {
    const repositorio = criarRepositorio(PromptRepository, conexao);
    const autor = await criarAdministrador(conexao, { nomeCompleto: 'Autor Excluído' });
    const rascunho = await repositorio.salvarRascunho(TipoPromptEnum.PRIORIDADE, 'texto', autor.id);
    await excluirLinha(conexao, 'usuario', autor.id);

    const { itens } = await repositorio.listarVersoes(TipoPromptEnum.PRIORIDADE, {});
    assert.equal(itens.find((item) => item.id === rascunho.id)?.usuarioNome, NOME_DO_AUTOR_EXCLUIDO);
    const doTipo = (await repositorio.listarTipos()).find((item) => item.tipo === TipoPromptEnum.PRIORIDADE);
    assert.equal(doTipo?.rascunho?.usuarioNome, NOME_DO_AUTOR_EXCLUIDO);

    const ativado = await repositorio.ativarRascunho(TipoPromptEnum.PRIORIDADE);
    assert.equal(ativado?.usuarioNome, NOME_DO_AUTOR_EXCLUIDO);
    assert.equal((await repositorio.recuperarAtivo(TipoPromptEnum.PRIORIDADE))?.id, rascunho.id);
    assert.equal((await repositorio.recuperarAtivo(TipoPromptEnum.PRIORIDADE))?.usuarioNome, NOME_DO_AUTOR_EXCLUIDO);
});

testarComBanco('configuração da IA de autor excluído continua ativa, com "Usuário removido"', async (conexao) => {
    const repositorio = criarRepositorio(ConfiguracaoIaRepository, conexao);
    const atual = await repositorio.recuperarAtiva();
    assert.ok(atual);
    const autor = await criarAdministrador(conexao, { nomeCompleto: 'Autor Excluído' });
    const gravada = await repositorio.inserirNovaVersao({ ...atual, niveisProposta: undefined } as never, autor.id);
    await excluirLinha(conexao, 'usuario', autor.id);

    const ativa = await repositorio.recuperarAtiva();
    assert.equal(ativa?.id, gravada.id);
    assert.equal(ativa?.usuarioNome, NOME_DO_AUTOR_EXCLUIDO);
    assert.equal((await repositorio.listar({})).itens[0].usuarioNome, NOME_DO_AUTOR_EXCLUIDO);
});

testarComBanco('fonte do plano de autor excluído continua, com "Usuário removido"', async (conexao) => {
    const repositorio = criarRepositorio(PlanoFonteRepository, conexao);
    const autor = await criarGestor(conexao, { nomeCompleto: 'Autor Excluído' });
    const { id: planoId } = await criarRepositorio(PlanoRepository, conexao).inserir({ titulo: 'Plano', projetoId: null, usuarioId: autor.id });
    const { id } = await repositorio.inserir({ planoId, titulo: 'a', conteudo: 'b', origem: TipoPlanoFonteOrigemEnum.COLADO, usuarioId: autor.id });
    await excluirLinha(conexao, 'usuario', autor.id);

    assert.equal((await repositorio.recuperar({ planoId, id }))?.usuarioNome, NOME_DO_AUTOR_EXCLUIDO);
    assert.equal((await repositorio.listar({ planoId }))[0].usuarioNome, NOME_DO_AUTOR_EXCLUIDO);
    assert.equal((await repositorio.listarComConteudo({ planoId }))[0].usuarioNome, NOME_DO_AUTOR_EXCLUIDO);
});

testarComBanco('plano de criador excluído continua, com "Usuário removido"', async (conexao) => {
    const repositorio = criarRepositorio(PlanoRepository, conexao);
    const autor = await criarGestor(conexao, { nomeCompleto: 'Autor Excluído' });
    const { id } = await repositorio.inserir({ titulo: 'Plano', projetoId: null, usuarioId: autor.id });
    await excluirLinha(conexao, 'usuario', autor.id);

    const plano = await repositorio.recuperar({ id });
    assert.equal(plano?.id, id);
    assert.equal(plano?.criadorNome, NOME_DO_AUTOR_EXCLUIDO);
});

// --- Atividade numa demanda ou projeto excluído.

testarComBanco('recuperar não acha atividade de demanda excluída', async (conexao) => {
    const usuario = await criarDesenvolvedor(conexao);
    const projeto = await criarProjeto(conexao);
    const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
    const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
    const repositorio = criarRepositorio(AtividadeRepository, conexao);
    assert.equal((await repositorio.recuperar({ id: atividade.id }))?.id, atividade.id);

    await excluirLinha(conexao, 'demanda', demanda.id);
    assert.equal(await repositorio.recuperar({ id: atividade.id }), null);
});

testarComBanco('recuperar não acha atividade de projeto excluído', async (conexao) => {
    const usuario = await criarDesenvolvedor(conexao);
    const projeto = await criarProjeto(conexao);
    const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
    const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });

    await excluirLinha(conexao, 'projeto', projeto.id);
    assert.equal(await criarRepositorio(AtividadeRepository, conexao).recuperar({ id: atividade.id }), null);
});

// --- Excluir de novo não toca a linha já morta.

class RepositorioExposto extends BaseRepository<unknown> {
    excluirPeloBase(identificador: number) {
        return this.executarSoftDelete(identificador);
    }
}

testarComBanco('executarSoftDelete não regrava a data de um registro já excluído', async (conexao) => {
    const tag = await criarTag(conexao);
    await excluirNoPassado(conexao, 'tag', tag.id);
    await new RepositorioExposto(conexao as never, 'tag').excluirPeloBase(tag.id);
    assert.equal(await anoDaExclusao(conexao, 'tag', tag.id), 2020);
    assert.equal(await criarRepositorio(TagRepository, conexao).recuperar({ id: tag.id }), null);
});

testarComBanco('excluirConexao não regrava a data de uma conexão já excluída', async (conexao) => {
    const projeto = await criarProjeto(conexao);
    const origem = await criarDemanda(conexao, { projetoId: projeto.id });
    const destino = await criarDemanda(conexao, { projetoId: projeto.id });
    const conexaoDemanda = await criarDemandaConexao(conexao, { demandaOrigemId: origem.id, demandaDestinoId: destino.id });
    await excluirNoPassado(conexao, 'demanda_conexao', conexaoDemanda.id);

    await criarRepositorio(DemandaRepository, conexao).excluirConexao({ demandaId: origem.id, conexaoId: conexaoDemanda.id });
    assert.equal(await anoDaExclusao(conexao, 'demanda_conexao', conexaoDemanda.id), 2020);
});

testarComBanco('excluir o plano não regrava a data de um plano já excluído', async (conexao) => {
    const autor = await criarGestor(conexao);
    const repositorio = criarRepositorio(PlanoRepository, conexao);
    const { id } = await repositorio.inserir({ titulo: 'Plano', projetoId: null, usuarioId: autor.id });
    await excluirNoPassado(conexao, 'plano', id);

    await repositorio.excluir({ id });
    assert.equal(await anoDaExclusao(conexao, 'plano', id), 2020);
});

// --- Tabela de referência excluída: o subselect que lê o código da linha volta vazio, em vez de devolver a referência morta.

/** Exclui a linha de referência que a linha de negócio aponta. */
async function excluirReferenciaDaLinha(conexao: ConexaoTeste, tabelaReferencia: string, tabela: string, coluna: string, id: number): Promise<void> {
    await conexao.raw(`
        UPDATE :tabelaReferencia:
        SET
            is_deleted = true,
            deleted_date = NOW()
        WHERE
            id = (
                SELECT
                    :coluna:
                FROM
                    :tabela:
                WHERE
                    id = :id
            )
    `, { tabelaReferencia, tabela, coluna, id });
}

async function criarAtividadeDeTeste(conexao: ConexaoTeste) {
    const usuario = await criarDesenvolvedor(conexao);
    const projeto = await criarProjeto(conexao);
    const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
    return { ...(await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id })), demandaId: demanda.id };
}

testarComBanco('alterar atividade não devolve status nem prioridade de referência excluída', async (conexao) => {
    const atividade = await criarAtividadeDeTeste(conexao);
    const repositorio = criarRepositorio(AtividadeRepository, conexao);
    await excluirReferenciaDaLinha(conexao, 'tipo_atividade_status', 'atividade', 'tipo_atividade_status_id', atividade.id);
    await excluirReferenciaDaLinha(conexao, 'tipo_atividade_prioridade', 'atividade', 'tipo_atividade_prioridade_id', atividade.id);
    const alterada = await repositorio.alterar({ id: atividade.id, nome: 'Depois' });
    assert.equal(alterada.nome, 'Depois');
    assert.equal(alterada.status, null);
    assert.equal(alterada.prioridade, null);
});

testarComBanco('recuperar não devolve prioridade de referência excluída, e a listagem não traz a linha', async (conexao) => {
    const atividade = await criarAtividadeDeTeste(conexao);
    const repositorio = criarRepositorio(AtividadeRepository, conexao);
    await excluirReferenciaDaLinha(conexao, 'tipo_atividade_prioridade', 'atividade', 'tipo_atividade_prioridade_id', atividade.id);
    const recuperada = await repositorio.recuperar({ id: atividade.id });
    assert.equal(recuperada?.prioridade, null);
    const { itens } = await repositorio.listar({ demandaId: atividade.demandaId });
    assert.equal(itens.some((item) => item.id === atividade.id), false);
});

testarComBanco('alterar dia não útil não devolve tipo nem duração de referência excluída', async (conexao) => {
    const dia = await criarDiaNaoUtil(conexao);
    await excluirReferenciaDaLinha(conexao, 'tipo_dia_nao_util', 'dia_nao_util', 'tipo_dia_nao_util_id', dia.id);
    await excluirReferenciaDaLinha(conexao, 'tipo_dia_nao_util_duracao', 'dia_nao_util', 'tipo_dia_nao_util_duracao_id', dia.id);
    const alterado = await criarRepositorio(CalendarioRepository, conexao).alterar({ id: dia.id, descricao: 'Depois' });
    assert.equal(alterado.descricao, 'Depois');
    assert.equal(alterado.tipo, null);
    assert.equal(alterado.duracao, null);
});

testarComBanco('alterar demanda não devolve status de referência excluída', async (conexao) => {
    const projeto = await criarProjeto(conexao);
    const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
    await excluirReferenciaDaLinha(conexao, 'tipo_demanda_status', 'demanda', 'tipo_demanda_status_id', demanda.id);
    const alterada = await criarRepositorio(DemandaRepository, conexao).alterar({ id: demanda.id, nome: 'Depois' });
    assert.equal(alterada.nome, 'Depois');
    assert.equal(alterada.status, null);
});

testarComBanco('alterar projeto não devolve status de referência excluída', async (conexao) => {
    const projeto = await criarProjeto(conexao);
    await excluirReferenciaDaLinha(conexao, 'tipo_projeto_status', 'projeto', 'tipo_projeto_status_id', projeto.id);
    const alterado = await criarRepositorio(ProjetoRepository, conexao).alterar({ id: projeto.id, nome: 'Depois' });
    assert.equal(alterado.nome, 'Depois');
    assert.equal(alterado.status, null);
});

testarComBanco('alterar usuário não devolve tipo de referência excluída', async (conexao) => {
    const usuario = await criarDesenvolvedor(conexao);
    await excluirReferenciaDaLinha(conexao, 'tipo_usuario', 'usuario', 'tipo_usuario_id', usuario.id);
    const alterado = await criarRepositorio(UsuarioRepository, conexao).alterar({ id: usuario.id, nomeCompleto: 'Depois' });
    assert.equal(alterado.nomeCompleto, 'Depois');
    assert.equal(alterado.tipo, null);
});

testarComBanco('versões de prompt de tipo excluído não contam nem aparecem', async (conexao) => {
    await excluirReferencia(conexao, 'tipo_prompt', TipoPromptEnum.PRIORIDADE);
    const { itens, total } = await criarRepositorio(PromptRepository, conexao).listarVersoes(TipoPromptEnum.PRIORIDADE, {});
    assert.equal(total, 0);
    assert.deepEqual(itens, []);
});

testarComBanco('proposta de tipo excluído não é lida nem listada', async (conexao) => {
    const dono = await criarDesenvolvedor(conexao);
    const repositorio = criarRepositorio(PropostaIaRepository, conexao);
    const proposta = await repositorio.criar({ usuarioId: dono.id, tipo: TipoPropostaIaEnum.INICIAR_EXECUCAO, dados: { atividadeId: 1 } });
    assert.equal((await repositorio.listarPendentesDoUsuario(dono.id)).length, 1);

    await excluirReferencia(conexao, 'tipo_proposta_ia', TipoPropostaIaEnum.INICIAR_EXECUCAO);
    assert.equal(await repositorio.recuperarPorId(proposta.id), undefined);
    assert.deepEqual(await repositorio.listarPendentesDoUsuario(dono.id), []);
});

testarComBanco('proposta em situação excluída não conta nem transita', async (conexao) => {
    const dono = await criarDesenvolvedor(conexao);
    const repositorio = criarRepositorio(PropostaIaRepository, conexao);
    const proposta = await repositorio.criar({ usuarioId: dono.id, tipo: TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO, dados: { planoId: 77 } });
    assert.equal(await repositorio.contarPendentesDoPlano({ planoId: 77, tipo: TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO }), 1);

    await excluirReferencia(conexao, 'tipo_proposta_ia_status', StatusPropostaIaEnum.PENDENTE);
    assert.equal(await repositorio.contarPendentesDoPlano({ planoId: 77, tipo: TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO }), 0);
    assert.equal(await repositorio.transitar({ id: proposta.id, usuarioId: dono.id, de: [StatusPropostaIaEnum.PENDENTE], para: StatusPropostaIaEnum.CONFIRMADA }), undefined);
});
