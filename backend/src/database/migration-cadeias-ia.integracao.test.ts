import { after, before, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'path';
import Knex, { Knex as KnexTipos } from 'knex';
import { ConfiguracaoIaCadeiaItemDto, EsforcoIaEnum, TipoProvedorIaEnum } from '@project20/shared';
import { lerConfiguracaoBancoTeste, montarConfiguracaoKnex } from '../testes/configuracao-banco-teste';
import { SqlMigrationSource } from './sql-migration-source';

// Migration 0079 (spec 261): a conversão das versões antigas em três cadeias (UP) e o caminho de volta com perda (DOWN). O DDL da migration
// trava a tabela `configuracao_ia` até o fim da transação, o que bloquearia os outros testes de integração que rodam em paralelo no banco de
// teste. Por isso este teste usa um banco descartável próprio: migra até a 0078, grava versões no formato antigo, aplica a 0079 de verdade
// (com `migrate.latest`) e reverte (com `migrate.down`). O banco é criado e removido pelo próprio teste.

const PRIMEIRA = 79;
const ULTIMA_DO_ESCOPO = 80; // a 0080 (modelo planejado do chat) vem junto: o DOWN do teste reverte as duas, na ordem.
const DATA_ANTIGA = '2020-01-15T12:00:00.000Z';

const A = TipoProvedorIaEnum.ANTHROPIC;
const G = TipoProvedorIaEnum.GOOGLE;
const O = TipoProvedorIaEnum.OPENAI;

const item = (provedor: TipoProvedorIaEnum, modelo: string, esforco: EsforcoIaEnum = EsforcoIaEnum.MEDIO): ConfiguracaoIaCadeiaItemDto => ({ provedor, modelo, esforco });

/** O diretório de migrations limitado a um intervalo de números (a ordem e o parse são os da fonte real). */
class FonteDeMigrationsAte extends SqlMigrationSource {
    constructor(diretorio: string, private readonly ultima: number) {
        super(diretorio);
    }

    override async getMigrations(): Promise<string[]> {
        return (await super.getMigrations()).filter((arquivo) => Number(arquivo.match(/^(\d+)/)![1]) <= this.ultima);
    }
}

const configuracao = lerConfiguracaoBancoTeste();
const nomeDoBanco = `${configuracao.nomeDesenvolvimento}_migracao_teste`;
const diretorio = path.join(__dirname, 'migrations');

let banco: KnexTipos;

function conectar(ultima: number): KnexTipos {
    return Knex({ ...montarConfiguracaoKnex(configuracao, nomeDoBanco), migrations: { migrationSource: new FonteDeMigrationsAte(diretorio, ultima) } });
}

const modelos = (prefixo: string) => ({ modeloRapido: `${prefixo}-rapido`, modeloPadrao: `${prefixo}-padrao`, modeloAnalitico: `${prefixo}-analitico` });

interface VersaoLegada {
    versao: number;
    provedor: TipoProvedorIaEnum;
    fallbacks: TipoProvedorIaEnum[];
    modelosProvedor: Record<string, unknown>;
    esforcoAnalitico: EsforcoIaEnum;
    excluida?: boolean;
}

/** Grava uma versão no formato antigo, copiando as demais colunas da versão 1 (a do seed). A data de alteração fica antiga e fixa. */
async function gravarVersaoLegada(banco: KnexTipos, legada: VersaoLegada): Promise<void> {
    // Numa transação só: a tabela temporária precisa viver na mesma conexão dos comandos que a usam.
    await banco.transaction(async (conexao) => {
        await conexao.raw('ALTER TABLE configuracao_ia DISABLE TRIGGER trg_configuracao_ia_updated_date');
        await conexao.raw(`
            CREATE TEMP TABLE linha_modelo AS
            SELECT
                *
            FROM
                configuracao_ia
            WHERE
                configuracao_ia.versao = 1
        `);
        await conexao.raw(`
            UPDATE linha_modelo
            SET
                id = nextval(pg_get_serial_sequence('configuracao_ia', 'id')),
                versao = :versao,
                tipo_provedor_ia_id = (
                    SELECT
                        tipo_provedor_ia.id
                    FROM
                        tipo_provedor_ia
                    WHERE
                        tipo_provedor_ia.codigo = :provedor
                ),
                fallbacks = CAST(:fallbacks AS jsonb),
                modelos_provedor = CAST(:modelos AS jsonb),
                esforco_analitico = :esforco,
                updated_date = :data,
                is_deleted = :excluida,
                deleted_date = CASE
                    WHEN :excluida THEN CAST(:data AS timestamptz)
                    ELSE NULL
                END
        `, {
            versao: legada.versao, provedor: legada.provedor, fallbacks: JSON.stringify(legada.fallbacks), modelos: JSON.stringify(legada.modelosProvedor),
            esforco: legada.esforcoAnalitico, data: DATA_ANTIGA, excluida: legada.excluida ?? false,
        });
        await conexao.raw(`
            INSERT INTO
                configuracao_ia
            SELECT
                *
            FROM
                linha_modelo
        `);
        await conexao.raw('DROP TABLE linha_modelo');
        await conexao.raw('ALTER TABLE configuracao_ia ENABLE TRIGGER trg_configuracao_ia_updated_date');
    });
}

const TODOS = { [G]: modelos('gemini'), [O]: modelos('gpt'), [A]: modelos('claude') };

before(async () => {
    const administrativo = Knex(montarConfiguracaoKnex(configuracao, 'postgres'));
    try {
        await administrativo.raw('DROP DATABASE IF EXISTS ??', [nomeDoBanco]);
        await administrativo.raw('CREATE DATABASE ??', [nomeDoBanco]);
    } finally {
        await administrativo.destroy();
    }
    banco = conectar(PRIMEIRA - 1);
    await banco.migrate.latest();
});

after(async () => {
    await banco?.destroy();
    const administrativo = Knex(montarConfiguracaoKnex(configuracao, 'postgres'));
    try {
        await administrativo.raw('DROP DATABASE IF EXISTS ??', [nomeDoBanco]);
    } finally {
        await administrativo.destroy();
    }
});

async function lerCadeias(conexao: KnexTipos, versao: number) {
    const { rows } = await conexao.raw(`
        SELECT
            configuracao_ia.cadeia_rapido AS "cadeiaRapido",
            configuracao_ia.cadeia_padrao AS "cadeiaPadrao",
            configuracao_ia.cadeia_analitico AS "cadeiaAnalitico",
            configuracao_ia.updated_date AS "atualizadaEm"
        FROM
            configuracao_ia
        WHERE
            configuracao_ia.versao = :versao
    `, { versao });
    return rows[0] as { cadeiaRapido: ConfiguracaoIaCadeiaItemDto[]; cadeiaPadrao: ConfiguracaoIaCadeiaItemDto[]; cadeiaAnalitico: ConfiguracaoIaCadeiaItemDto[]; atualizadaEm: Date };
}

async function lerLegada(conexao: KnexTipos, versao: number) {
    const { rows } = await conexao.raw(`
        SELECT
            tipo_provedor_ia.codigo AS provedor,
            configuracao_ia.fallbacks,
            configuracao_ia.modelos_provedor AS modelos,
            configuracao_ia.esforco_analitico AS esforco,
            configuracao_ia.updated_date AS "atualizadaEm"
        FROM
            configuracao_ia
            INNER JOIN tipo_provedor_ia ON tipo_provedor_ia.id = configuracao_ia.tipo_provedor_ia_id
        WHERE
            configuracao_ia.versao = :versao
    `, { versao });
    return rows[0] as { provedor: string; fallbacks: string[]; modelos: Record<string, ReturnType<typeof modelos>>; esforco: string; atualizadaEm: Date };
}

test('UP converte cada versão antiga em três cadeias iguais; DOWN devolve o formato antigo com a perda documentada', { timeout: 240_000 }, async () => {
    // Versões no formato antigo: 1 é a do seed (Anthropic só); 2 tem três provedores; 3 tem dois; 4 está excluída.
    await gravarVersaoLegada(banco, { versao: 2, provedor: G, fallbacks: [O, A], modelosProvedor: TODOS, esforcoAnalitico: EsforcoIaEnum.BAIXO });
    await gravarVersaoLegada(banco, { versao: 3, provedor: O, fallbacks: [G], modelosProvedor: TODOS, esforcoAnalitico: EsforcoIaEnum.ALTO });
    await gravarVersaoLegada(banco, { versao: 4, provedor: A, fallbacks: [O], modelosProvedor: TODOS, esforcoAnalitico: EsforcoIaEnum.MEDIO, excluida: true });
    const precosAntes = (await banco.raw(`
        SELECT
            configuracao_ia.versao,
            configuracao_ia.precos_modelo
        FROM
            configuracao_ia
        ORDER BY
            configuracao_ia.versao
    `)).rows;
    const antesDaMigration = (await banco.raw(`
        SELECT
            NOW() AS agora
    `)).rows[0].agora as Date;

    // --- UP: a 0079 de verdade, pelo migrador, sobre as versões antigas ---
    const aplicando = conectar(ULTIMA_DO_ESCOPO);
    try {
        await aplicando.migrate.latest();

        const seed = await lerCadeias(aplicando, 1);
        assert.deepEqual(seed.cadeiaRapido, [item(A, 'claude-haiku-5-5')]);
        assert.deepEqual(seed.cadeiaPadrao, [item(A, 'claude-sonnet-5-5')]);
        assert.deepEqual(seed.cadeiaAnalitico, [item(A, 'claude-opus-5-5')], 'a versão 1 mantém o esforço MEDIO que tinha');

        const tres = await lerCadeias(aplicando, 2);
        assert.deepEqual(tres.cadeiaRapido, [item(G, 'gemini-rapido'), item(O, 'gpt-rapido'), item(A, 'claude-rapido')], 'padrão, depois os fallbacks, na ordem, com o modelo do nível; MEDIO explícito');
        assert.deepEqual(tres.cadeiaPadrao, [item(G, 'gemini-padrao'), item(O, 'gpt-padrao'), item(A, 'claude-padrao')]);
        assert.deepEqual(tres.cadeiaAnalitico, [
            item(G, 'gemini-analitico', EsforcoIaEnum.BAIXO),
            item(O, 'gpt-analitico', EsforcoIaEnum.BAIXO),
            item(A, 'claude-analitico', EsforcoIaEnum.BAIXO),
        ], 'o esforço do analítico é o que a versão tinha');
        assert.ok(tres.atualizadaEm.getTime() >= antesDaMigration.getTime(), 'converter é alterar: a linha viva grava updated_date');

        const dois = await lerCadeias(aplicando, 3);
        assert.deepEqual(dois.cadeiaRapido, [item(O, 'gpt-rapido'), item(G, 'gemini-rapido')]);
        assert.deepEqual(dois.cadeiaAnalitico, [item(O, 'gpt-analitico', EsforcoIaEnum.ALTO), item(G, 'gemini-analitico', EsforcoIaEnum.ALTO)]);

        const excluida = await lerCadeias(aplicando, 4);
        assert.deepEqual(excluida.cadeiaPadrao, [item(A, 'claude-padrao'), item(O, 'gpt-padrao')], 'a linha excluída também é convertida (senão o NOT NULL falharia)');
        assert.equal(excluida.atualizadaEm.toISOString(), DATA_ANTIGA, 'mas excluído é morto: o updated_date dela não muda');

        // Nenhuma outra coluna mudou: os preços por modelo seguem iguais.
        const precosDepois = (await aplicando.raw(`
            SELECT
                configuracao_ia.versao,
                configuracao_ia.precos_modelo
            FROM
                configuracao_ia
            ORDER BY
                configuracao_ia.versao
        `)).rows;
        assert.deepEqual(precosDepois, precosAntes);

        // O estado final do esquema: colunas antigas fora, cadeias NOT NULL sem DEFAULT e com CHECK de lista não vazia.
        const { rows: colunas } = await aplicando.raw(`
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
        const porNome = new Map(colunas.map((coluna: { coluna: string; anulavel: string; padrao: string | null }) => [coluna.coluna, coluna]));
        for (const antiga of ['tipo_provedor_ia_id', 'fallbacks', 'modelos_provedor', 'esforco_analitico']) assert.equal(porNome.has(antiga), false, `${antiga} saiu`);
        for (const nova of ['cadeia_rapido', 'cadeia_padrao', 'cadeia_analitico']) {
            const coluna = porNome.get(nova) as { anulavel: string; padrao: string | null };
            assert.deepEqual([coluna.anulavel, coluna.padrao], ['NO', null], `${nova} é NOT NULL e sem DEFAULT`);
        }
        for (const nome of ['chk_configuracao_ia_cadeia_rapido', 'chk_configuracao_ia_cadeia_padrao', 'chk_configuracao_ia_cadeia_analitico']) {
            const { rows } = await aplicando.raw(`
                SELECT
                    1
                FROM
                    pg_constraint
                WHERE
                    pg_constraint.conname = :nome
            `, { nome });
            assert.equal(rows.length, 1, `${nome} existe`);
        }
        await assert.rejects(() => aplicando.raw(`
            UPDATE configuracao_ia
            SET
                cadeia_rapido = CAST('[]' AS jsonb)
            WHERE
                versao = 1
        `), /chk_configuracao_ia_cadeia_rapido/);

        // --- Uma versão híbrida (cadeias diferentes entre os níveis), para o DOWN com perda ---
        await aplicando.raw(`
            UPDATE configuracao_ia
            SET
                cadeia_rapido = CAST(:rapido AS jsonb),
                cadeia_padrao = CAST(:padrao AS jsonb),
                cadeia_analitico = CAST(:analitico AS jsonb)
            WHERE
                configuracao_ia.versao = 1
        `, {
            rapido: JSON.stringify([item(O, 'gpt-5-mini', EsforcoIaEnum.ALTO), item(A, 'claude-haiku-5-5', EsforcoIaEnum.BAIXO)]),
            padrao: JSON.stringify([item(O, 'gpt-6.1-sol')]),
            analitico: JSON.stringify([item(A, 'claude-opus-5-5', EsforcoIaEnum.ALTO), item(G, 'gemini-pro')]),
        });
        const antesDoDown = (await aplicando.raw(`
            SELECT
                NOW() AS agora
        `)).rows[0].agora as Date;

        // --- DOWN: a 0080 e depois a 0079 ---
        await aplicando.migrate.down();
        await aplicando.migrate.down();

        const hibrida = await lerLegada(aplicando, 1);
        assert.equal(hibrida.provedor, O, 'o primeiro item da cadeia do padrão é o provedor padrão');
        assert.deepEqual(hibrida.fallbacks, [], 'a cadeia do padrão tinha um item só');
        assert.equal(hibrida.esforco, EsforcoIaEnum.ALTO, 'o esforço do primeiro item do analítico');
        assert.deepEqual(hibrida.modelos[O], { modeloRapido: 'gpt-5-mini', modeloPadrao: 'gpt-6.1-sol', modeloAnalitico: 'gpt-6.1-sol' }, 'nível sem item usa o do padrão');
        assert.deepEqual(hibrida.modelos[A], { modeloRapido: 'claude-haiku-5-5', modeloPadrao: 'claude-haiku-5-5', modeloAnalitico: 'claude-opus-5-5' }, 'provedor fora do padrão: o do rápido');
        assert.deepEqual(hibrida.modelos[G], { modeloRapido: 'gemini-pro', modeloPadrao: 'gemini-pro', modeloAnalitico: 'gemini-pro' }, 'provedor só no analítico: o trio inteiro vem dele');
        assert.ok(hibrida.atualizadaEm.getTime() >= antesDoDown.getTime(), 'o DOWN também altera a linha viva');

        // Cadeias iguais nos três níveis voltam ao que eram (o esforço de rápido e padrão não tem onde morar e se perde).
        const voltou = await lerLegada(aplicando, 2);
        assert.equal(voltou.provedor, G);
        assert.deepEqual(voltou.fallbacks, [O, A]);
        assert.equal(voltou.esforco, EsforcoIaEnum.BAIXO);
        assert.deepEqual(voltou.modelos, TODOS);
        assert.equal((await lerLegada(aplicando, 4)).atualizadaEm.toISOString(), DATA_ANTIGA, 'no DOWN a linha excluída também não tem o updated_date tocado');

        // Aplicar de novo depois do DOWN também funciona (rollback testado de verdade).
        await aplicando.migrate.latest();
        const reaplicada = await lerCadeias(aplicando, 2);
        assert.deepEqual(reaplicada.cadeiaRapido, tres.cadeiaRapido);
        assert.deepEqual(reaplicada.cadeiaAnalitico, tres.cadeiaAnalitico);
    } finally {
        await aplicando.destroy();
    }
});
