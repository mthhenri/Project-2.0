import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfiguracaoIaCadeiaItemDto, ConfiguracaoIaCriarDto, EsforcoIaEnum, IaModeloPrecoDto, ModoContextoChatEnum, PropostaIaNivelEnum, TipoProvedorIaEnum, TipoPropostaIaEnum } from '@project20/shared';
import { testarComBanco, obterConexaoBancoTeste, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarAdministrador } from '../../../testes/fabricas';
import { ConfiguracaoIaRepository } from './configuracao-ia.repository';

// Configuração da IA no SQL real (SYSTEM.SPEC.md §12 "configuracao-ia"): uma linha por versão, a ativa é a de maior `versao`,
// a antiga nunca é alterada e a versão seguinte é serializada por lock consultivo. A migration 0033 deixa a versão 1 gravada.

const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(ConfiguracaoIaRepository, conexao);

const A = TipoProvedorIaEnum.ANTHROPIC;
const G = TipoProvedorIaEnum.GOOGLE;
const O = TipoProvedorIaEnum.OPENAI;

const item = (provedor: TipoProvedorIaEnum, modelo: string, esforco: EsforcoIaEnum = EsforcoIaEnum.MEDIO): ConfiguracaoIaCadeiaItemDto => ({ provedor, modelo, esforco });

/** A criação com outro modelo no item principal do padrão (o repositório não confere o prefixo: isso é da service). */
const comModeloPadrao = (modelo: string): ConfiguracaoIaCriarDto => ({ ...NOVA, cadeiaPadrao: [item(A, modelo)] });

const NOVA: ConfiguracaoIaCriarDto = {
    cadeiaRapido: [item(A, 'modelo-rapido', EsforcoIaEnum.BAIXO)],
    cadeiaPadrao: [item(A, 'modelo-padrao')],
    cadeiaAnalitico: [item(A, 'modelo-analitico', EsforcoIaEnum.ALTO)],
    checkinMinimoMinutos: 20, checkinMaximoMinutos: 60, duracaoRecomendadaMinutos: 45,
    checkinInteligente: false, rigorProporcional: false, deteccaoAutomatica: false,
    duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO, iaDesligada: true,
};

testarComBanco('recuperarAtiva: a versão de maior número, com provedor e nome de quem gravou', async (conexao) => {
    const administrador = await criarAdministrador(conexao, { nomeCompleto: 'Admin Teste' });
    const anterior = await repositorioDe(conexao).recuperarAtiva();
    const gravada = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);

    const ativa = await repositorioDe(conexao).recuperarAtiva();
    assert.equal(ativa?.id, gravada.id);
    assert.equal(ativa?.versao, (anterior?.versao ?? 0) + 1);
    assert.deepEqual(ativa?.cadeiaRapido, NOVA.cadeiaRapido);
    assert.deepEqual(ativa?.cadeiaPadrao, NOVA.cadeiaPadrao);
    assert.deepEqual(ativa?.cadeiaAnalitico, NOVA.cadeiaAnalitico);
    assert.equal(ativa?.duvidasCodigo, true);
    assert.equal(ativa?.modoContextoChat, ModoContextoChatEnum.SEPARADO);
    assert.equal(ativa?.iaDesligada, true);
    assert.equal(ativa?.usuarioId, administrador.id);
    assert.equal(ativa?.usuarioNome, 'Admin Teste');
});

testarComBanco('migration 0044: as versões que já existiam ficam "só Project" e com contexto misturado', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
    const { itens } = await repositorioDe(conexao).listar({ itensPorPagina: 100 });
    const primeira = itens.find((item) => item.versao === 1)!;
    assert.equal(primeira.duvidasCodigo, false);
    assert.equal(primeira.modoContextoChat, ModoContextoChatEnum.MISTURADO);
});

testarComBanco('inserirNovaVersao: a anterior continua intacta e o histórico lista as duas, da mais nova para a mais antiga', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const anterior = (await repositorioDe(conexao).recuperarAtiva())!;
    const nova = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);

    const { itens, total } = await repositorioDe(conexao).listar({});
    assert.equal(total >= 2, true);
    assert.deepEqual(itens.slice(0, 2).map((item) => item.id), [nova.id, anterior.id]);
    const anteriorDepois = itens.find((item) => item.id === anterior.id)!;
    assert.deepEqual(anteriorDepois.cadeiaPadrao, anterior.cadeiaPadrao);
    assert.equal(anteriorDepois.versao, anterior.versao);
});

testarComBanco('inserirNovaVersao: duas gravações em sequência geram versões consecutivas', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const primeira = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
    const segunda = await repositorioDe(conexao).inserirNovaVersao(comModeloPadrao('outro'), administrador.id);
    assert.equal(segunda.versao, primeira.versao + 1);
    assert.equal((await repositorioDe(conexao).recuperarAtiva())?.cadeiaPadrao[0].modelo, 'outro');
});

testarComBanco('versão excluída (soft delete) não é a ativa nem aparece no histórico', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const anterior = (await repositorioDe(conexao).recuperarAtiva())!;
    const nova = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
    await conexao.raw(`
        UPDATE configuracao_ia
        SET
            is_deleted = true,
            deleted_date = NOW()
        WHERE
            id = :id
    `, { id: nova.id });

    assert.equal((await repositorioDe(conexao).recuperarAtiva())?.id, anterior.id);
    assert.equal((await repositorioDe(conexao).listar({})).itens.some((item) => item.id === nova.id), false);
});

testarComBanco('listar: pagina o histórico e o total conta todas as versões', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
    await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
    const { total } = await repositorioDe(conexao).listar({});
    const primeiraPagina = await repositorioDe(conexao).listar({ pagina: 1, itensPorPagina: 1 });
    const segundaPagina = await repositorioDe(conexao).listar({ pagina: 2, itensPorPagina: 1 });
    assert.equal(primeiraPagina.itens.length, 1);
    assert.equal(segundaPagina.itens.length, 1);
    assert.equal(primeiraPagina.total, total);
    assert.equal(primeiraPagina.itens[0].versao, segundaPagina.itens[0].versao + 1);
});

// Corrida real: duas conexões do pool, cada uma com a sua transação, sem o rollback do teste. O lock consultivo serializa.
test('inserirNovaVersao: duas gravações concorrentes geram versões consecutivas, sem repetir número', async () => {
    const banco = obterConexaoBancoTeste();
    const usuario = await banco.raw(`
        SELECT
            usuario.id
        FROM
            usuario
        WHERE
            usuario.login = 'gestor.inicial'
            AND usuario.is_deleted = false
    `);
    const usuarioId = usuario.rows[0].id as number;
    const repositorio = new ConfiguracaoIaRepository(banco);
    const gravadas: number[] = [];
    try {
        const resultados = await Promise.all([
            repositorio.inserirNovaVersao(comModeloPadrao('concorrente-a'), usuarioId),
            repositorio.inserirNovaVersao(comModeloPadrao('concorrente-b'), usuarioId),
        ]);
        gravadas.push(...resultados.map((resultado) => resultado.id));
        const versoes = resultados.map((resultado) => resultado.versao).sort((itemAtual, segundo) => itemAtual - segundo);
        assert.equal(versoes[1], versoes[0] + 1);
        assert.equal((await repositorio.recuperarAtiva())?.versao, versoes[1]);
    } finally {
        if (gravadas.length > 0) await banco.raw(`
            DELETE FROM configuracao_ia
            WHERE
                id = ANY (:ids)
        `, { ids: gravadas });
    }
});

const esperar = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

// Determinístico: uma transação segura o lock consultivo; a gravação em outra conexão tem de esperar por ele.
test('inserirNovaVersao espera o lock consultivo e só grava depois que a outra transação termina', async () => {
    const banco = obterConexaoBancoTeste();
    const usuario = await banco.raw(`
        SELECT
            usuario.id
        FROM
            usuario
        WHERE
            usuario.login = 'gestor.inicial'
            AND usuario.is_deleted = false
    `);
    const usuarioId = usuario.rows[0].id as number;
    const repositorio = new ConfiguracaoIaRepository(banco);
    let terminou = false;
    let pendente: Promise<{ id: number }> | undefined;
    try {
        await banco.transaction(async (segurando) => {
            await segurando.raw(`
                SELECT
                    pg_advisory_xact_lock(hashtext ('configuracao_ia'))
            `);
            pendente = repositorio.inserirNovaVersao(comModeloPadrao('esperou'), usuarioId).then((gravada) => { terminou = true; return gravada; });
            await esperar(300);
            assert.equal(terminou, false, 'a gravação não deveria passar enquanto outra transação segura o lock');
        });
        const gravada = await pendente;
        assert.equal(terminou, true);
        await banco.raw(`
            DELETE FROM configuracao_ia
            WHERE
                id = :id
        `, { id: gravada!.id });
    } finally {
        await pendente?.catch(() => undefined);
    }
});

// Preços por modelo no JSONB `precos_modelo` (task 202, migration 0048): vivem na versão ativa e são copiados para a versão seguinte.

const PRECO_A = { modelo: 'modelo-preco-a', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 };
const doModelo = (precos: IaModeloPrecoDto[], modelo: string) => precos.find((preco) => preco.modelo === modelo);

testarComBanco('alterarPrecoDaVersaoAtiva cria o preço do modelo, troca na segunda vez e não cria versão', async (conexao) => {
    const repositorio = repositorioDe(conexao);
    const versaoAntes = (await repositorio.recuperarAtiva())!;

    assert.deepEqual(await repositorio.alterarPrecoDaVersaoAtiva(PRECO_A), PRECO_A);
    assert.deepEqual(doModelo(await repositorio.listarPrecos(), 'modelo-preco-a'), PRECO_A);

    await repositorio.alterarPrecoDaVersaoAtiva({ ...PRECO_A, precoEntradaMilhao: 4.5, precoCacheMilhao: 0.45 });
    const trocado = (await repositorio.listarPrecos()).filter((preco) => preco.modelo === 'modelo-preco-a');
    assert.deepEqual(trocado, [{ modelo: 'modelo-preco-a', precoEntradaMilhao: 4.5, precoSaidaMilhao: 15, precoCacheMilhao: 0.45 }]);

    const versaoDepois = (await repositorio.recuperarAtiva())!;
    assert.equal(versaoDepois.id, versaoAntes.id);
    assert.equal(versaoDepois.versao, versaoAntes.versao);
});

testarComBanco('inserirNovaVersao copia os preços da versão anterior; a anterior continua com os dela', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const repositorio = repositorioDe(conexao);
    await repositorio.alterarPrecoDaVersaoAtiva(PRECO_A);
    const anterior = (await repositorio.recuperarAtiva())!;

    const nova = await repositorio.inserirNovaVersao(NOVA, administrador.id);
    assert.notEqual(nova.id, anterior.id);
    assert.deepEqual(doModelo(await repositorio.listarPrecos(), 'modelo-preco-a'), PRECO_A);

    // Trocar o preço agora altera só a versão ativa (a nova).
    await repositorio.alterarPrecoDaVersaoAtiva({ ...PRECO_A, precoSaidaMilhao: 20 });
    const { rows } = await conexao.raw(`
        SELECT
            precos_modelo -> 'modelo-preco-a' ->> 'precoSaidaMilhao' AS saida
        FROM
            configuracao_ia
        WHERE
            id = :id
    `, { id: anterior.id });
    assert.equal(Number(rows[0].saida), 15);
    assert.equal(doModelo(await repositorio.listarPrecos(), 'modelo-preco-a')?.precoSaidaMilhao, 20);
});

const CADEIAS_HIBRIDAS = {
    cadeiaRapido: [item(O, 'gpt-5-mini', EsforcoIaEnum.ALTO), item(A, 'claude-haiku-5-5', EsforcoIaEnum.BAIXO)],
    cadeiaPadrao: [item(O, 'gpt-6.1-sol')],
    cadeiaAnalitico: [item(A, 'claude-opus-5-5', EsforcoIaEnum.ALTO), item(G, 'gemini-pro'), item(O, 'o3', EsforcoIaEnum.BAIXO)],
};

testarComBanco('as três cadeias voltam como foram gravadas (itens, ordem e esforço), na criada, na ativa e na listagem', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const criada = await repositorioDe(conexao).inserirNovaVersao({ ...NOVA, ...CADEIAS_HIBRIDAS }, administrador.id);
    for (const lida of [criada, (await repositorioDe(conexao).recuperarAtiva())!, (await repositorioDe(conexao).listar({})).itens[0]]) {
        assert.deepEqual([lida.cadeiaRapido, lida.cadeiaPadrao, lida.cadeiaAnalitico], [CADEIAS_HIBRIDAS.cadeiaRapido, CADEIAS_HIBRIDAS.cadeiaPadrao, CADEIAS_HIBRIDAS.cadeiaAnalitico]);
    }
});

testarComBanco('cada nível pode ter uma cadeia de tamanho próprio, inclusive de um item só', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const criada = await repositorioDe(conexao).inserirNovaVersao({ ...NOVA, ...CADEIAS_HIBRIDAS }, administrador.id);
    assert.deepEqual([criada.cadeiaRapido.length, criada.cadeiaPadrao.length, criada.cadeiaAnalitico.length], [2, 1, 3]);
});

testarComBanco('o banco recusa cadeia vazia (CHECK de lista com ao menos um item) e não grava versão', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const antes = (await repositorioDe(conexao).listar({})).total;
    for (const campo of ['cadeiaRapido', 'cadeiaPadrao', 'cadeiaAnalitico'] as const) {
        await assert.rejects(() => repositorioDe(conexao).inserirNovaVersao({ ...NOVA, [campo]: [] }, administrador.id), /chk_configuracao_ia_cadeia_/);
    }
    assert.equal((await repositorioDe(conexao).listar({})).total, antes);
});

// Migration 0079: as colunas antigas saíram e as versões que já existiam viraram três cadeias iguais.

testarComBanco('migration 0079: as colunas antigas deixaram de existir e as três cadeias são NOT NULL, sem DEFAULT', async (conexao) => {
    const { rows } = await conexao.raw(`
        SELECT
            information_schema.columns.column_name AS coluna,
            information_schema.columns.is_nullable AS anulavel,
            information_schema.columns.column_default AS padrao
        FROM
            information_schema.columns
        WHERE
            information_schema.columns.table_name = 'configuracao_ia'
            AND information_schema.columns.table_schema = current_schema()
    `);
    const colunas = new Map(rows.map((linha: { coluna: string; anulavel: string; padrao: string | null }) => [linha.coluna, linha]));
    for (const antiga of ['tipo_provedor_ia_id', 'fallbacks', 'modelos_provedor', 'esforco_analitico']) assert.equal(colunas.has(antiga), false, `${antiga} saiu`);
    for (const nova of ['cadeia_rapido', 'cadeia_padrao', 'cadeia_analitico']) {
        const coluna = colunas.get(nova) as { anulavel: string; padrao: string | null };
        assert.deepEqual([coluna.anulavel, coluna.padrao], ['NO', null], `${nova} é NOT NULL e sem DEFAULT`);
    }
});

testarComBanco('migration 0079: a versão 1 do seed virou três cadeias iguais com o trio da Anthropic e MEDIO explícito em todos os itens', async (conexao) => {
    const { itens } = await repositorioDe(conexao).listar({ itensPorPagina: 100 });
    const versaoUm = itens.find((versao) => versao.versao === 1)!;
    assert.deepEqual(versaoUm.cadeiaRapido, [item(A, 'claude-haiku-5-5')]);
    assert.deepEqual(versaoUm.cadeiaPadrao, [item(A, 'claude-sonnet-5-5')]);
    assert.deepEqual(versaoUm.cadeiaAnalitico, [item(A, 'claude-opus-5-5')]);
});

testarComBanco('migration 0055: as versões que já existiam ficam sem o mapa de níveis (nulo = padrão do shared)', async (conexao) => {
    const { itens } = await repositorioDe(conexao).listar({});
    const versaoUm = itens.find((item) => item.versao === 1);
    assert.equal(versaoUm?.niveisProposta, null);
});

testarComBanco('inserirNovaVersao grava o mapa de níveis e uma versão sem mapa copia o da anterior (task 228)', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const niveis = { [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA, [TipoPropostaIaEnum.CRIAR_ATIVIDADE]: PropostaIaNivelEnum.FAZ_E_AVISA };
    const comMapa = await repositorioDe(conexao).inserirNovaVersao({ ...NOVA, niveisProposta: niveis }, administrador.id);
    assert.deepEqual(comMapa.niveisProposta, niveis);

    const semMapa = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
    assert.deepEqual(semMapa.niveisProposta, niveis, 'a versão nova sem o mapa herda o da anterior');
    assert.deepEqual((await repositorioDe(conexao).recuperarAtiva())?.niveisProposta, niveis);
    const { itens } = await repositorioDe(conexao).listar({ itensPorPagina: 100 });
    assert.deepEqual(itens.find((item) => item.id === comMapa.id)?.niveisProposta, niveis, 'a versão anterior continua com o mapa dela');
});

testarComBanco('inserirNovaVersao sem mapa depois de uma versão antiga (nula) segue nula', async (conexao) => {
    const administrador = await criarAdministrador(conexao);
    const nova = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
    assert.equal(nova.niveisProposta, null);
});
