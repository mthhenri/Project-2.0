import type { Knex } from 'knex';

// Tabelas que possuem o trigger BEFORE UPDATE de manutenção de updated_date (BaseEntity).
// O nome do trigger segue trg_<tabela>_updated_date — apenas a FUNÇÃO mudou de idioma.
const TABELAS_COM_TRIGGER_UPDATED_DATE = [
  'usuario',
  'projeto',
  'tag',
  'demanda',
  'demanda_usuario',
  'demanda_conexao',
  'demanda_tag',
  'atividade',
  'atividade_tag',
  'execucao',
  'dia_nao_util',
];

/**
 * Renomeia a função genérica de BaseEntity de fn_atualizar_updated_date (idioma misto)
 * para fn_set_updated_date (inglês) — objetos genéricos/arquiteturais de banco são em
 * inglês (§4/§16 #12). Os triggers de cada tabela são recriados apontando para a nova
 * função; em seguida a função antiga é removida.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_set_updated_date()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_date = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const tabela of TABELAS_COM_TRIGGER_UPDATED_DATE) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trg_${tabela}_updated_date ON ${tabela};
      CREATE TRIGGER trg_${tabela}_updated_date
        BEFORE UPDATE ON ${tabela}
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
    `);
  }

  await knex.raw(`
    DROP FUNCTION IF EXISTS fn_atualizar_updated_date() CASCADE;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_atualizar_updated_date()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_date = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const tabela of TABELAS_COM_TRIGGER_UPDATED_DATE) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trg_${tabela}_updated_date ON ${tabela};
      CREATE TRIGGER trg_${tabela}_updated_date
        BEFORE UPDATE ON ${tabela}
        FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();
    `);
  }

  await knex.raw(`
    DROP FUNCTION IF EXISTS fn_set_updated_date() CASCADE;
  `);
}
