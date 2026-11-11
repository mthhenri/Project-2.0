-- UP

-- O banco não carrega lógica (spec 277): quem grava updated_date é a aplicação.
DO $$
DECLARE
  gatilho RECORD;
BEGIN
  FOR gatilho IN
    SELECT
      pg_trigger.tgname AS nome,
      pg_trigger.tgrelid::regclass AS tabela
    FROM pg_trigger
    WHERE pg_trigger.tgname LIKE 'trg\_%\_updated\_date'
      AND pg_trigger.tgisinternal = false
  LOOP
    EXECUTE format('DROP TRIGGER %I ON %s', gatilho.nome, gatilho.tabela);
  END LOOP;
END;
$$;

DROP FUNCTION fn_set_updated_date();

-- DOWN

CREATE OR REPLACE FUNCTION fn_set_updated_date()
RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_date = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

-- A mensagem_direta_reacao nasceu sem trigger (migration 0083): o rollback devolve o banco como estava.
DO $$
DECLARE
  tabela_com_data RECORD;
BEGIN
  FOR tabela_com_data IN
    SELECT columns.table_name AS nome
    FROM information_schema.columns
    WHERE columns.table_schema = 'public'
      AND columns.column_name = 'updated_date'
      AND columns.table_name <> 'mensagem_direta_reacao'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date()',
      'trg_' || tabela_com_data.nome || '_updated_date',
      tabela_com_data.nome
    );
  END LOOP;
END;
$$;
