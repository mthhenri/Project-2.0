import type { Knex } from 'knex';

/**
 * Converte todos os enums de domínio fechado (hoje `VARCHAR + CHECK`) em tabelas de
 * referência `tipo_<tabela>_<complemento?>`, com a coluna de negócio passando a ser um
 * `INTEGER` FK para o `id` da tabela de referência. Os enums TypeScript de `shared/`
 * permanecem como contrato tipado e espelham os `codigo`; o repositório traduz
 * `codigo ⇄ id` no SQL.
 *
 * São 7 colunas de enum em 5 tabelas de negócio. Os `codigo` seedados são os valores
 * **reais** vigentes no banco — para `tipo_demanda_status`, PENDENTE/PLANEJADA/CONCLUIDA
 * (estado pós-migration 20240013), e não EM_DESENVOLVIMENTO.
 */

/** Definição de uma tabela de referência e seus seeds (codigo → descricao). */
interface TabelaReferencia {
  tabela: string;
  seeds: { codigo: string; descricao: string }[];
}

/** Conversão de uma coluna de enum de negócio para FK na tabela de referência. */
interface ConversaoColuna {
  tabelaNegocio: string;
  colunaAntiga: string;
  varcharTamanho: number;
  valores: string[];
  /** Nome real do CHECK antigo no banco (auto-gerado ou renomeado pela task 70). */
  checkAntigo: string;
  tabelaReferencia: string;
  colunaFk: string;
  fkConstraint: string;
  /** Índice antigo sobre a coluna VARCHAR (null quando não existia). */
  indiceAntigo: string | null;
  /** Índice novo sobre a coluna FK (null quando não há índice para esta coluna). */
  indiceNovo: string | null;
}

const TABELAS_REFERENCIA: TabelaReferencia[] = [
  {
    tabela: 'tipo_usuario',
    seeds: [
      { codigo: 'DESENVOLVEDOR', descricao: 'Desenvolvedor' },
      { codigo: 'GESTOR', descricao: 'Gestor' },
    ],
  },
  {
    tabela: 'tipo_usuario_status',
    seeds: [
      { codigo: 'ATIVO', descricao: 'Ativo' },
      { codigo: 'INATIVO', descricao: 'Inativo' },
    ],
  },
  {
    tabela: 'tipo_projeto_status',
    seeds: [
      { codigo: 'ATIVO', descricao: 'Ativo' },
      { codigo: 'PAUSADO', descricao: 'Pausado' },
      { codigo: 'CONCLUIDO', descricao: 'Concluído' },
      { codigo: 'CANCELADO', descricao: 'Cancelado' },
    ],
  },
  {
    tabela: 'tipo_demanda_status',
    seeds: [
      { codigo: 'PENDENTE', descricao: 'Pendente' },
      { codigo: 'PLANEJADA', descricao: 'Planejada' },
      { codigo: 'CONCLUIDA', descricao: 'Concluída' },
    ],
  },
  {
    tabela: 'tipo_atividade_status',
    seeds: [
      { codigo: 'PLANEJADA', descricao: 'Planejada' },
      { codigo: 'PENDENTE', descricao: 'Pendente' },
      { codigo: 'DESENVOLVENDO', descricao: 'Desenvolvendo' },
      { codigo: 'DESENVOLVIDA', descricao: 'Desenvolvida' },
    ],
  },
  {
    tabela: 'tipo_dia_nao_util',
    seeds: [
      { codigo: 'FERIADO', descricao: 'Feriado' },
      { codigo: 'RECESSO', descricao: 'Recesso' },
      { codigo: 'PONTO_FACULTATIVO', descricao: 'Ponto facultativo' },
    ],
  },
  {
    tabela: 'tipo_dia_nao_util_duracao',
    seeds: [
      { codigo: 'INTEGRAL', descricao: 'Integral' },
      { codigo: 'MEIO_PERIODO', descricao: 'Meio período' },
    ],
  },
];

const CONVERSOES: ConversaoColuna[] = [
  {
    tabelaNegocio: 'usuario',
    colunaAntiga: 'tipo',
    varcharTamanho: 20,
    valores: ['DESENVOLVEDOR', 'GESTOR'],
    checkAntigo: 'usuario_tipo_check',
    tabelaReferencia: 'tipo_usuario',
    colunaFk: 'tipo_usuario_id',
    fkConstraint: 'fk_usuario_tipo_usuario',
    indiceAntigo: 'ix_usuario_tipo',
    indiceNovo: 'ix_usuario_tipo_usuario_id',
  },
  {
    tabelaNegocio: 'usuario',
    colunaAntiga: 'status',
    varcharTamanho: 20,
    valores: ['ATIVO', 'INATIVO'],
    checkAntigo: 'usuario_status_check',
    tabelaReferencia: 'tipo_usuario_status',
    colunaFk: 'tipo_usuario_status_id',
    fkConstraint: 'fk_usuario_tipo_usuario_status',
    indiceAntigo: null,
    indiceNovo: null,
  },
  {
    tabelaNegocio: 'projeto',
    colunaAntiga: 'status',
    varcharTamanho: 20,
    valores: ['ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'],
    checkAntigo: 'projeto_status_check',
    tabelaReferencia: 'tipo_projeto_status',
    colunaFk: 'tipo_projeto_status_id',
    fkConstraint: 'fk_projeto_tipo_projeto_status',
    indiceAntigo: 'ix_projeto_status',
    indiceNovo: 'ix_projeto_tipo_projeto_status_id',
  },
  {
    tabelaNegocio: 'demanda',
    colunaAntiga: 'status',
    varcharTamanho: 30,
    valores: ['PENDENTE', 'PLANEJADA', 'CONCLUIDA'],
    checkAntigo: 'chk_demanda_status',
    tabelaReferencia: 'tipo_demanda_status',
    colunaFk: 'tipo_demanda_status_id',
    fkConstraint: 'fk_demanda_tipo_demanda_status',
    indiceAntigo: 'ix_demanda_status',
    indiceNovo: 'ix_demanda_tipo_demanda_status_id',
  },
  {
    tabelaNegocio: 'atividade',
    colunaAntiga: 'status',
    varcharTamanho: 20,
    valores: ['PLANEJADA', 'PENDENTE', 'DESENVOLVENDO', 'DESENVOLVIDA'],
    checkAntigo: 'atividade_status_check',
    tabelaReferencia: 'tipo_atividade_status',
    colunaFk: 'tipo_atividade_status_id',
    fkConstraint: 'fk_atividade_tipo_atividade_status',
    indiceAntigo: 'ix_atividade_status',
    indiceNovo: 'ix_atividade_tipo_atividade_status_id',
  },
  {
    tabelaNegocio: 'dia_nao_util',
    colunaAntiga: 'tipo',
    varcharTamanho: 30,
    valores: ['FERIADO', 'RECESSO', 'PONTO_FACULTATIVO'],
    checkAntigo: 'dia_nao_util_tipo_check',
    tabelaReferencia: 'tipo_dia_nao_util',
    colunaFk: 'tipo_dia_nao_util_id',
    fkConstraint: 'fk_dia_nao_util_tipo_dia_nao_util',
    indiceAntigo: null,
    indiceNovo: null,
  },
  {
    tabelaNegocio: 'dia_nao_util',
    colunaAntiga: 'duracao',
    varcharTamanho: 20,
    valores: ['INTEGRAL', 'MEIO_PERIODO'],
    checkAntigo: 'chk_dia_nao_util_duracao',
    tabelaReferencia: 'tipo_dia_nao_util_duracao',
    colunaFk: 'tipo_dia_nao_util_duracao_id',
    fkConstraint: 'fk_dia_nao_util_tipo_dia_nao_util_duracao',
    indiceAntigo: null,
    indiceNovo: null,
  },
];

/** Lista de valores como literais SQL para o CHECK do `down`. */
function valoresParaCheck(valores: string[]): string {
  return valores.map((valor) => `'${valor}'`).join(', ');
}

export async function up(knex: Knex): Promise<void> {
  // 1. Criar as 7 tabelas de referência (BaseEntity + codigo + descricao) com índice
  //    único parcial e trigger de updated_date.
  for (const { tabela } of TABELAS_REFERENCIA) {
    await knex.raw(`
      CREATE TABLE ${tabela} (
        id            SERIAL      PRIMARY KEY,
        created_date  TIMESTAMPTZ NOT NULL,
        updated_date  TIMESTAMPTZ NOT NULL,
        is_deleted    BOOLEAN     NOT NULL,
        deleted_date  TIMESTAMPTZ,

        codigo        VARCHAR(40)  NOT NULL,
        descricao     VARCHAR(100) NOT NULL
      );

      CREATE UNIQUE INDEX uix_${tabela}_codigo
        ON ${tabela}(codigo)
        WHERE is_deleted = false;

      CREATE TRIGGER trg_${tabela}_updated_date
        BEFORE UPDATE ON ${tabela}
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
    `);
  }

  // 2. Seedar as 7 tabelas (INSERT ... SELECT ... RETURNING — sem VALUES/DEFAULT).
  for (const { tabela, seeds } of TABELAS_REFERENCIA) {
    for (const seed of seeds) {
      await knex.raw(
        `INSERT INTO ${tabela} (codigo, descricao, created_date, updated_date, is_deleted)
         SELECT :codigo, :descricao, NOW(), NOW(), false
         RETURNING id`,
        { codigo: seed.codigo, descricao: seed.descricao },
      );
    }
  }

  // 3. Para cada coluna de enum: adicionar FK, popular, tornar NOT NULL, criar FK
  //    constraint, dropar CHECK/índice antigos, criar índice novo e dropar a coluna VARCHAR.
  for (const conversao of CONVERSOES) {
    const {
      tabelaNegocio,
      colunaAntiga,
      tabelaReferencia,
      colunaFk,
      fkConstraint,
      checkAntigo,
      indiceAntigo,
      indiceNovo,
    } = conversao;

    await knex.raw(`ALTER TABLE ${tabelaNegocio} ADD COLUMN ${colunaFk} INTEGER;`);

    await knex.raw(`
      UPDATE ${tabelaNegocio}
      SET ${colunaFk} = ${tabelaReferencia}.id
      FROM ${tabelaReferencia}
      WHERE ${tabelaReferencia}.codigo = ${tabelaNegocio}.${colunaAntiga}
        AND ${tabelaReferencia}.is_deleted = false;
    `);

    await knex.raw(`ALTER TABLE ${tabelaNegocio} ALTER COLUMN ${colunaFk} SET NOT NULL;`);

    await knex.raw(`
      ALTER TABLE ${tabelaNegocio}
        ADD CONSTRAINT ${fkConstraint}
        FOREIGN KEY (${colunaFk}) REFERENCES ${tabelaReferencia}(id);
    `);

    await knex.raw(
      `ALTER TABLE ${tabelaNegocio} DROP CONSTRAINT IF EXISTS ${checkAntigo};`,
    );

    if (indiceAntigo !== null) {
      await knex.raw(`DROP INDEX IF EXISTS ${indiceAntigo};`);
    }

    if (indiceNovo !== null) {
      await knex.raw(`
        CREATE INDEX ${indiceNovo}
          ON ${tabelaNegocio}(${colunaFk})
          WHERE is_deleted = false;
      `);
    }

    await knex.raw(`ALTER TABLE ${tabelaNegocio} DROP COLUMN ${colunaAntiga};`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // 1. Reverter cada coluna: recriar VARCHAR + CHECK + índice antigo, repopular via JOIN
  //    pela tabela de referência, dropar índice novo, FK constraint e coluna FK.
  for (const conversao of CONVERSOES) {
    const {
      tabelaNegocio,
      colunaAntiga,
      varcharTamanho,
      valores,
      tabelaReferencia,
      colunaFk,
      fkConstraint,
      checkAntigo,
      indiceAntigo,
      indiceNovo,
    } = conversao;

    await knex.raw(
      `ALTER TABLE ${tabelaNegocio} ADD COLUMN ${colunaAntiga} VARCHAR(${varcharTamanho});`,
    );

    await knex.raw(`
      UPDATE ${tabelaNegocio}
      SET ${colunaAntiga} = ${tabelaReferencia}.codigo
      FROM ${tabelaReferencia}
      WHERE ${tabelaReferencia}.id = ${tabelaNegocio}.${colunaFk};
    `);

    await knex.raw(`ALTER TABLE ${tabelaNegocio} ALTER COLUMN ${colunaAntiga} SET NOT NULL;`);

    await knex.raw(`
      ALTER TABLE ${tabelaNegocio}
        ADD CONSTRAINT ${checkAntigo}
        CHECK (${colunaAntiga} IN (${valoresParaCheck(valores)}));
    `);

    if (indiceAntigo !== null) {
      await knex.raw(`
        CREATE INDEX ${indiceAntigo}
          ON ${tabelaNegocio}(${colunaAntiga})
          WHERE is_deleted = false;
      `);
    }

    if (indiceNovo !== null) {
      await knex.raw(`DROP INDEX IF EXISTS ${indiceNovo};`);
    }

    await knex.raw(`ALTER TABLE ${tabelaNegocio} DROP CONSTRAINT IF EXISTS ${fkConstraint};`);
    await knex.raw(`ALTER TABLE ${tabelaNegocio} DROP COLUMN ${colunaFk};`);
  }

  // 2. Dropar as 7 tabelas de referência (triggers e índices junto).
  for (const { tabela } of TABELAS_REFERENCIA) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trg_${tabela}_updated_date ON ${tabela};
      DROP TABLE IF EXISTS ${tabela} CASCADE;
    `);
  }
}
