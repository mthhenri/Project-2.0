import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AutorMensagemDiretaEnum, PosicaoBarraChatEnum, PosicaoPopupChatEnum, StatusPropostaIaEnum, TipoAnotacaoEnum, TipoAtividadePrioridadeEnum, TipoPlanoFonteOrigemEnum, TipoPlanoPontoSituacaoEnum, TipoPromptEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { AnotacaoRepository } from '../modules/anotacao/repositories/anotacao.repository';
import { AtividadePrioridadeRepository } from '../modules/atividade-prioridade/repositories/atividade-prioridade.repository';
import { AtividadeRepository } from '../modules/atividade/repositories/atividade.repository';
import { CalendarioRepository } from '../modules/calendario/repositories/calendario.repository';
import { ChatMensagemPostgresRepository } from '../modules/chat/repositories/chat-mensagem-postgres.repository';
import { ConfiguracaoIaRepository } from '../modules/configuracao-ia/repositories/configuracao-ia.repository';
import { DemandaRepository } from '../modules/demanda/repositories/demanda.repository';
import { ExecucaoRepository } from '../modules/execucao/repositories/execucao.repository';
import { MensagemDiretaLeituraRepository } from '../modules/mensagem-direta/repositories/mensagem-direta-leitura.repository';
import { MensagemDiretaPostgresRepository } from '../modules/mensagem-direta/repositories/mensagem-direta-postgres.repository';
import { MensagemDiretaPreferenciaRepository } from '../modules/mensagem-direta/repositories/mensagem-direta-preferencia.repository';
import { MensagemDiretaSupervisaoRepository } from '../modules/mensagem-direta/repositories/mensagem-direta-supervisao.repository';
import { ModelagemGrupoRepository } from '../modules/modelagem/repositories/modelagem-grupo.repository';
import { ModelagemTabelaRepository } from '../modules/modelagem/repositories/modelagem-tabela.repository';
import { PlanoFonteRepository } from '../modules/plano/repositories/plano-fonte.repository';
import { PlanoPontoRepository } from '../modules/plano/repositories/plano-ponto.repository';
import { PlanoRepository } from '../modules/plano/repositories/plano.repository';
import { ProjetoRepository } from '../modules/projeto/repositories/projeto.repository';
import { PromptRepository } from '../modules/prompt/repositories/prompt.repository';
import { PropostaIaRepository } from '../modules/proposta-ia/repositories/proposta-ia.repository';
import { TagRepository } from '../modules/tag/repositories/tag.repository';
import { TipoUsuarioAjudaRepository } from '../modules/usuario/repositories/tipo-usuario-ajuda.repository';
import { UsuarioRepository } from '../modules/usuario/repositories/usuario.repository';
import { ConexaoTeste, testarComBanco } from '../testes/banco-teste';
import { criarRepositorio } from '../testes/criar-repositorio';
import { criarAdministrador, criarAtividade, criarDemanda, criarDemandaConexao, criarDemandaTag, criarDemandaUsuario, criarDesenvolvedor, criarDiaNaoUtil, criarExecucao, criarGestor, criarProjeto, criarTag } from '../testes/fabricas';

// Task 277: o banco não tem mais trigger, então cada `UPDATE` grava `updated_date` por conta própria.
// O `NOW()` é congelado na transação do teste: cada linha é envelhecida antes de ser alterada, e `updated_date` precisa sair de 2020.

/** Volta as datas da linha para um passado conhecido. `chave` é a coluna que identifica a linha. */
async function envelhecer(conexao: ConexaoTeste, tabela: string, valor: number | string, chave = 'id'): Promise<void> {
    await conexao.raw(`
        UPDATE :tabela:
        SET
            created_date = '2020-01-01T00:00:00Z',
            updated_date = '2020-01-01T00:00:00Z'
        WHERE
            :chave: = :valor
    `, { tabela, chave, valor });
}

async function datasDaLinha(conexao: ConexaoTeste, tabela: string, valor: number | string, chave = 'id'): Promise<{ criada: Date; alterada: Date }> {
    const { rows } = await conexao.raw(`
        SELECT
            created_date AS criada,
            updated_date AS alterada
        FROM
            :tabela:
        WHERE
            :chave: = :valor
    `, { tabela, chave, valor });
    return rows[0];
}

async function assegurarAlterada(conexao: ConexaoTeste, tabela: string, valor: number | string, chave = 'id'): Promise<void> {
    const { criada, alterada } = await datasDaLinha(conexao, tabela, valor, chave);
    assert.ok(alterada.getTime() > criada.getTime(), `${tabela}: updated_date não foi gravado`);
}

async function criarCadeia(conexao: ConexaoTeste) {
    const usuario = await criarDesenvolvedor(conexao);
    const projeto = await criarProjeto(conexao);
    const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
    const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
    return { usuario, projeto, demanda, atividade };
}

// --- Esquema

testarComBanco('não sobrou trigger nem fn_set_updated_date; as funções de busca do chat e a unaccent ficam', async (conexao) => {
    const gatilhos = await conexao.raw(`
        SELECT
            count(*)::int AS total
        FROM
            pg_trigger
        WHERE
            pg_trigger.tgisinternal = false
    `);
    assert.equal(gatilhos.rows[0].total, 0);
    const funcoes = await conexao.raw(`
        SELECT
            pg_proc.proname AS nome
        FROM
            pg_proc
            INNER JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE
            pg_namespace.nspname = 'public'
            AND pg_proc.proname LIKE 'fn\\_%'
        ORDER BY
            pg_proc.proname
    `);
    assert.deepEqual(funcoes.rows.map((linha: { nome: string }) => linha.nome), ['fn_chat_texto_busca', 'fn_chat_texto_consulta']);
    const extensoes = await conexao.raw(`
        SELECT
            count(*)::int AS total
        FROM
            pg_extension
        WHERE
            pg_extension.extname = 'unaccent'
    `);
    assert.equal(extensoes.rows[0].total, 1);
});

// --- Exclusão não é alteração (P-074); restaurar é.

testarComBanco('excluir grava is_deleted e deleted_date e não toca updated_date; restaurar grava', async (conexao) => {
    const repositorio = criarRepositorio(TagRepository, conexao);
    const tag = await criarTag(conexao);
    await envelhecer(conexao, 'tag', tag.id);

    await repositorio.excluir({ id: tag.id });
    const excluida = await datasDaLinha(conexao, 'tag', tag.id);
    assert.equal(excluida.alterada.getTime(), excluida.criada.getTime());

    await repositorio.restaurar({ id: tag.id });
    await assegurarAlterada(conexao, 'tag', tag.id);
});

testarComBanco('excluir conexão, tag e membro da demanda não toca updated_date', async (conexao) => {
    const { demanda, usuario } = await criarCadeia(conexao);
    const repositorio = criarRepositorio(DemandaRepository, conexao);
    const outra = await criarDemanda(conexao, { projetoId: demanda.projetoId });
    const ligacao = await criarDemandaConexao(conexao, { demandaOrigemId: demanda.id, demandaDestinoId: outra.id });
    const tag = await criarTag(conexao);
    const ligacaoTag = await criarDemandaTag(conexao, { demandaId: demanda.id, tagId: tag.id });
    const membro = await criarDemandaUsuario(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
    for (const [tabela, id] of [['demanda_conexao', ligacao.id], ['demanda_tag', ligacaoTag.id], ['demanda_usuario', membro.id]] as const) {
        await envelhecer(conexao, tabela, id);
    }

    await repositorio.excluirConexao({ demandaId: demanda.id, conexaoId: ligacao.id });
    await repositorio.removerTagDemanda({ demandaId: demanda.id, tagId: tag.id });
    await repositorio.removerMembroDemanda({ demandaId: demanda.id, usuarioId: usuario.id });

    for (const [tabela, id] of [['demanda_conexao', ligacao.id], ['demanda_tag', ligacaoTag.id], ['demanda_usuario', membro.id]] as const) {
        const datas = await datasDaLinha(conexao, tabela, id);
        assert.equal(datas.alterada.getTime(), datas.criada.getTime(), tabela);
    }
});

testarComBanco('excluir fonte e plano não toca updated_date', async (conexao) => {
    const autor = await criarGestor(conexao);
    const planos = criarRepositorio(PlanoRepository, conexao);
    const fontes = criarRepositorio(PlanoFonteRepository, conexao);
    const plano = await planos.inserir({ titulo: 'Plano', projetoId: null, usuarioId: autor.id });
    const fonte = await fontes.inserir({ planoId: plano.id, titulo: 'a', conteudo: 'b', origem: TipoPlanoFonteOrigemEnum.COLADO, usuarioId: autor.id });
    await envelhecer(conexao, 'plano_fonte', fonte.id);
    await envelhecer(conexao, 'plano', plano.id);

    await fontes.excluir({ planoId: plano.id, id: fonte.id });
    await planos.excluir({ id: plano.id });

    for (const [tabela, id] of [['plano_fonte', fonte.id], ['plano', plano.id]] as const) {
        const datas = await datasDaLinha(conexao, tabela, id);
        assert.equal(datas.alterada.getTime(), datas.criada.getTime(), tabela);
    }
});

// --- Um UPDATE por repository

testarComBanco('tag.alterar', async (conexao) => {
    const tag = await criarTag(conexao);
    await envelhecer(conexao, 'tag', tag.id);
    await criarRepositorio(TagRepository, conexao).alterar({ id: tag.id, nome: 'Outro nome' });
    await assegurarAlterada(conexao, 'tag', tag.id);
});

testarComBanco('usuario: alterar (SET dinâmico), alterarCor e alterarSenha', async (conexao) => {
    const usuario = await criarDesenvolvedor(conexao);
    const repositorio = criarRepositorio(UsuarioRepository, conexao);
    for (const alterar of [
        () => repositorio.alterar({ id: usuario.id, nomeCompleto: 'Nome Novo' }),
        () => repositorio.alterarCor({ id: usuario.id, corAvatar: '#1E3A8A' }),
        () => repositorio.alterarSenha({ id: usuario.id, senhaEncriptada: 'outra' }),
    ]) {
        await envelhecer(conexao, 'usuario', usuario.id);
        await alterar();
        await assegurarAlterada(conexao, 'usuario', usuario.id);
    }
});

testarComBanco('tipo_usuario: alterar o texto de ajuda', async (conexao) => {
    const { rows } = await conexao.raw(`
        SELECT
            id
        FROM
            tipo_usuario
        WHERE
            codigo = :codigo
    `, { codigo: TipoUsuarioEnum.AUXILIAR });
    await envelhecer(conexao, 'tipo_usuario', rows[0].id);
    await criarRepositorio(TipoUsuarioAjudaRepository, conexao).alterar({ tipo: TipoUsuarioEnum.AUXILIAR, texto: 'Texto' });
    await assegurarAlterada(conexao, 'tipo_usuario', rows[0].id);
});

testarComBanco('projeto.alterar', async (conexao) => {
    const projeto = await criarProjeto(conexao);
    await envelhecer(conexao, 'projeto', projeto.id);
    await criarRepositorio(ProjetoRepository, conexao).alterar({ id: projeto.id, nome: 'Outro' });
    await assegurarAlterada(conexao, 'projeto', projeto.id);
});

testarComBanco('demanda: alterar e alterarTextos', async (conexao) => {
    const projeto = await criarProjeto(conexao);
    const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
    const repositorio = criarRepositorio(DemandaRepository, conexao);
    await envelhecer(conexao, 'demanda', demanda.id);
    await repositorio.alterarTextos({ id: demanda.id, documentacao: 'Doc', versao: 1 });
    await assegurarAlterada(conexao, 'demanda', demanda.id);
    await envelhecer(conexao, 'demanda', demanda.id);
    await repositorio.alterar({ id: demanda.id, nome: 'Outro' });
    await assegurarAlterada(conexao, 'demanda', demanda.id);
});

testarComBanco('atividade.alterar', async (conexao) => {
    const { atividade } = await criarCadeia(conexao);
    await envelhecer(conexao, 'atividade', atividade.id);
    await criarRepositorio(AtividadeRepository, conexao).alterar({ id: atividade.id, nome: 'Outro' });
    await assegurarAlterada(conexao, 'atividade', atividade.id);
});

testarComBanco('tipo_atividade_prioridade.alterarCor', async (conexao) => {
    const { rows } = await conexao.raw(`
        SELECT
            id
        FROM
            tipo_atividade_prioridade
        WHERE
            codigo = :codigo
    `, { codigo: TipoAtividadePrioridadeEnum.MEDIA });
    await envelhecer(conexao, 'tipo_atividade_prioridade', rows[0].id);
    await criarRepositorio(AtividadePrioridadeRepository, conexao).alterarCor(TipoAtividadePrioridadeEnum.MEDIA, '#123abc');
    await assegurarAlterada(conexao, 'tipo_atividade_prioridade', rows[0].id);
});

testarComBanco('dia_nao_util.alterar', async (conexao) => {
    const dia = await criarDiaNaoUtil(conexao);
    await envelhecer(conexao, 'dia_nao_util', dia.id);
    await criarRepositorio(CalendarioRepository, conexao).alterar({ id: dia.id, descricao: 'Outra' });
    await assegurarAlterada(conexao, 'dia_nao_util', dia.id);
});

testarComBanco('execucao: alterar e encerrarTodasAbertas', async (conexao) => {
    const { atividade } = await criarCadeia(conexao);
    const repositorio = criarRepositorio(ExecucaoRepository, conexao);
    const encerrada = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-02T08:00:00Z', fimData: '2026-01-02T09:00:00Z' });
    await envelhecer(conexao, 'execucao', encerrada.id);
    await repositorio.alterar({ id: encerrada.id, descricao: 'Outra', inicioData: new Date('2026-01-02T08:00:00Z'), fimData: new Date('2026-01-02T09:30:00Z') } as never);
    await assegurarAlterada(conexao, 'execucao', encerrada.id);

    const aberta = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-02T10:00:00Z', fimData: null });
    await envelhecer(conexao, 'execucao', aberta.id);
    await repositorio.encerrarTodasAbertas();
    await assegurarAlterada(conexao, 'execucao', aberta.id);
});

testarComBanco('execucao.encerrar', async (conexao) => {
    const { atividade } = await criarCadeia(conexao);
    const execucao = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-02T10:00:00Z', fimData: null });
    await envelhecer(conexao, 'execucao', execucao.id);
    await criarRepositorio(ExecucaoRepository, conexao).encerrar({ id: execucao.id, fimData: new Date('2026-01-02T11:00:00Z'), descricao: 'Feito' } as never);
    await assegurarAlterada(conexao, 'execucao', execucao.id);
});

testarComBanco('anotacao.modificarSecoes', async (conexao) => {
    const dono = await criarRepositorio(UsuarioRepository, conexao).inserir({ login: `dono.${randomUUID()}`, senhaEncriptada: 'x', nomeCompleto: 'Dono', cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR, horasDiariasNecessarias: 8 });
    await conexao.raw(`
        UPDATE anotacao
        SET
            created_date = '2020-01-01T00:00:00Z',
            updated_date = '2020-01-01T00:00:00Z'
        WHERE
            usuario_id = :usuarioId
    `, { usuarioId: dono.id });
    await criarRepositorio(AnotacaoRepository, conexao).modificarSecoes(
        { usuarioId: dono.id, tipos: [TipoAnotacaoEnum.PESSOAL] },
        () => [{ tipo: TipoAnotacaoEnum.PESSOAL, texto: 'novo' }],
    );
    const { rows } = await conexao.raw(`
        SELECT
            count(*)::int AS total
        FROM
            anotacao
        WHERE
            usuario_id = :usuarioId
            AND updated_date > created_date
    `, { usuarioId: dono.id });
    assert.equal(rows[0].total, 1);
});

testarComBanco('plano.alterar', async (conexao) => {
    const autor = await criarGestor(conexao);
    const repositorio = criarRepositorio(PlanoRepository, conexao);
    const plano = await repositorio.inserir({ titulo: 'Plano', projetoId: null, usuarioId: autor.id });
    await envelhecer(conexao, 'plano', plano.id);
    await repositorio.alterar({ id: plano.id, versao: 1, titulo: 'Outro' } as never);
    await assegurarAlterada(conexao, 'plano', plano.id);
});

testarComBanco('plano: marcarSolo, arquivar e atribuirProjeto; plano_ponto.alterarSituacao', async (conexao) => {
    const autor = await criarGestor(conexao);
    const projeto = await criarProjeto(conexao);
    const repositorio = criarRepositorio(PlanoRepository, conexao);
    const plano = await repositorio.inserir({ titulo: 'Plano', projetoId: null, usuarioId: autor.id });
    for (const alterar of [
        () => repositorio.marcarSolo({ id: plano.id, solo: true }),
        () => repositorio.arquivar({ id: plano.id, arquivado: true }),
        () => repositorio.atribuirProjeto({ id: plano.id, projetoId: projeto.id }),
    ]) {
        await envelhecer(conexao, 'plano', plano.id);
        await alterar();
        await assegurarAlterada(conexao, 'plano', plano.id);
    }

    const pontos = criarRepositorio(PlanoPontoRepository, conexao);
    const ponto = await pontos.inserir({ planoId: plano.id, rotulo: 'P1', texto: 'Dúvida' });
    await envelhecer(conexao, 'plano_ponto', ponto.id);
    await pontos.alterarSituacao({ planoId: plano.id, id: ponto.id, situacao: TipoPlanoPontoSituacaoEnum.RESOLVIDO, resolucaoTexto: 'Feito' });
    await assegurarAlterada(conexao, 'plano_ponto', ponto.id);
});

testarComBanco('prompt: salvarRascunho (de novo), ativarRascunho, restaurarPadrao e desativar a anterior', async (conexao) => {
    const autor = await criarAdministrador(conexao);
    const repositorio = criarRepositorio(PromptRepository, conexao);
    const tipo = TipoPromptEnum.PRIORIDADE;

    const rascunho = await repositorio.salvarRascunho(tipo, 'um', autor.id);
    await envelhecer(conexao, 'prompt', rascunho.id);
    await repositorio.salvarRascunho(tipo, 'dois', autor.id);
    await assegurarAlterada(conexao, 'prompt', rascunho.id);

    const anterior = await repositorio.recuperarAtivo(tipo);
    assert.ok(anterior);
    await envelhecer(conexao, 'prompt', rascunho.id);
    await envelhecer(conexao, 'prompt', anterior.id);
    await repositorio.ativarRascunho(tipo);
    await assegurarAlterada(conexao, 'prompt', rascunho.id);
    await assegurarAlterada(conexao, 'prompt', anterior.id);

    await envelhecer(conexao, 'prompt', anterior.id);
    await repositorio.restaurarPadrao(tipo);
    await assegurarAlterada(conexao, 'prompt', anterior.id);
});

testarComBanco('proposta_ia: transitar e registrarResultado', async (conexao) => {
    const dono = await criarDesenvolvedor(conexao);
    const repositorio = criarRepositorio(PropostaIaRepository, conexao);
    const proposta = await repositorio.criar({ usuarioId: dono.id, tipo: TipoPropostaIaEnum.INICIAR_EXECUCAO, dados: { atividadeId: 1 } });
    await envelhecer(conexao, 'proposta_ia', proposta.id);
    await repositorio.transitar({ id: proposta.id, usuarioId: dono.id, de: [StatusPropostaIaEnum.PENDENTE], para: StatusPropostaIaEnum.CONFIRMADA });
    await assegurarAlterada(conexao, 'proposta_ia', proposta.id);
    await envelhecer(conexao, 'proposta_ia', proposta.id);
    await repositorio.registrarResultado(proposta.id, { criada: 1 } as never);
    await assegurarAlterada(conexao, 'proposta_ia', proposta.id);
});

testarComBanco('configuracao_ia.alterarPrecoDaVersaoAtiva', async (conexao) => {
    const repositorio = criarRepositorio(ConfiguracaoIaRepository, conexao);
    const ativa = await repositorio.recuperarAtiva();
    assert.ok(ativa);
    await envelhecer(conexao, 'configuracao_ia', ativa.id);
    await repositorio.alterarPrecoDaVersaoAtiva({ modelo: 'modelo-x', precoEntradaMilhao: 1, precoSaidaMilhao: 2, precoCacheMilhao: 0.5 });
    await assegurarAlterada(conexao, 'configuracao_ia', ativa.id);
});

testarComBanco('modelagem: alterar grupo e regravar a tabela (upsert)', async (conexao) => {
    const grupos = criarRepositorio(ModelagemGrupoRepository, conexao);
    const grupo = await grupos.inserir({ titulo: 'T', rotulo: 'Teste Updated', ordem: (await grupos.obterMaiorOrdem()) + 1, corIndice: 0 });
    await envelhecer(conexao, 'modelagem_grupo', grupo.id);
    await grupos.alterar({ id: grupo.id, titulo: 'Depois', rotulo: 'Teste Updated 2' });
    await assegurarAlterada(conexao, 'modelagem_grupo', grupo.id);

    const tabelas = criarRepositorio(ModelagemTabelaRepository, conexao);
    await tabelas.gravar({ nomeTabela: 'tabela_de_teste', grupoId: grupo.id, x: 1, y: 2 });
    await envelhecer(conexao, 'modelagem_tabela', 'tabela_de_teste', 'nome_tabela');
    await tabelas.gravar({ nomeTabela: 'tabela_de_teste', grupoId: grupo.id, x: 3, y: 4 });
    await assegurarAlterada(conexao, 'modelagem_tabela', 'tabela_de_teste', 'nome_tabela');
});

async function criarConversa(conexao: ConexaoTeste) {
    const [pessoaA, pessoaB] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const [menor, maior] = pessoaA.id < pessoaB.id ? [pessoaA, pessoaB] : [pessoaB, pessoaA];
    return { menor, maior, conversaId: `${menor.id}-${maior.id}` };
}

testarComBanco('mensagem_direta_leitura: regravar a leitura e o silêncio (upsert)', async (conexao) => {
    const { menor, maior, conversaId } = await criarConversa(conexao);
    const repositorio = criarRepositorio(MensagemDiretaLeituraRepository, conexao);
    const dto = { conversaId, usuarioId: menor.id, outroUsuarioId: maior.id };
    await repositorio.alterarLeitura({ ...dto, lidaAteDate: new Date('2026-10-21T14:00:00Z') });
    await envelhecer(conexao, 'mensagem_direta_leitura', conversaId, 'conversa_id');
    await repositorio.alterarLeitura({ ...dto, lidaAteDate: new Date('2026-10-21T15:00:00Z') });
    await assegurarAlterada(conexao, 'mensagem_direta_leitura', conversaId, 'conversa_id');

    await envelhecer(conexao, 'mensagem_direta_leitura', conversaId, 'conversa_id');
    await repositorio.alterarSilencio({ ...dto, silenciada: true });
    await assegurarAlterada(conexao, 'mensagem_direta_leitura', conversaId, 'conversa_id');
});

testarComBanco('mensagem_direta_preferencia: regravar (upsert)', async (conexao) => {
    const dono = await criarDesenvolvedor(conexao);
    const repositorio = criarRepositorio(MensagemDiretaPreferenciaRepository, conexao);
    const preferencia = {
        usuarioId: dono.id, avisosAtivos: true, avisoDesktopAtivo: false, somAtivo: true, silenciadoAteDate: null,
        atalhoGlobal: 'Alt+F1', posicaoPopup: PosicaoPopupChatEnum.CENTRO, posicaoBarra: PosicaoBarraChatEnum.DIREITA,
    };
    await repositorio.alterar(preferencia);
    await envelhecer(conexao, 'mensagem_direta_preferencia', dono.id, 'usuario_id');
    await repositorio.alterar({ ...preferencia, somAtivo: false });
    await assegurarAlterada(conexao, 'mensagem_direta_preferencia', dono.id, 'usuario_id');
});

testarComBanco('mensagem_direta_supervisao.marcarAvisoDado', async (conexao) => {
    const { menor, maior, conversaId } = await criarConversa(conexao);
    const gestor = await criarGestor(conexao);
    const repositorio = criarRepositorio(MensagemDiretaSupervisaoRepository, conexao);
    const abertura = await repositorio.registrarLeitura({ leitorUsuarioId: gestor.id, conversaId, usuarioMenorId: menor.id, usuarioMaiorId: maior.id } as never);
    await envelhecer(conexao, 'mensagem_direta_supervisao', abertura.id);
    await repositorio.marcarAvisoDado({ supervisaoId: abertura.id });
    await assegurarAlterada(conexao, 'mensagem_direta_supervisao', abertura.id);
});

testarComBanco('mensagem_direta.alterarMensagem (armazenamento provisório)', async (conexao) => {
    const { menor, conversaId } = await criarConversa(conexao);
    const repositorio = criarRepositorio(MensagemDiretaPostgresRepository, conexao);
    const mensagemId = randomUUID();
    await repositorio.gravar({ mensagemId, conversaId, autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: menor.id, texto: 'Oi', contemCodigo: false, mencoes: [], referencias: [] });
    await envelhecer(conexao, 'mensagem_direta', mensagemId, 'mensagem_id');
    await repositorio.alterarMensagem({ mensagemId, conversaId, autorUsuarioId: menor.id, texto: 'Editada', contemCodigo: false, mencoes: [], referencias: [] });
    await assegurarAlterada(conexao, 'mensagem_direta', mensagemId, 'mensagem_id');
});

testarComBanco('chat_conversa.gravarTitulo (upsert)', async (conexao) => {
    const dono = await criarDesenvolvedor(conexao);
    const conversaId = randomUUID();
    const repositorio = criarRepositorio(ChatMensagemPostgresRepository, conexao);
    await repositorio.gravarTitulo({ conversaId, usuarioId: dono.id, titulo: 'Um', editado: false });
    await envelhecer(conexao, 'chat_conversa', conversaId, 'conversa_id');
    await repositorio.gravarTitulo({ conversaId, usuarioId: dono.id, titulo: 'Dois', editado: true });
    await assegurarAlterada(conexao, 'chat_conversa', conversaId, 'conversa_id');
});
