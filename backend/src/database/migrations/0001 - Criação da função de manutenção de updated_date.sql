-- UP

CREATE OR REPLACE FUNCTION fn_atualizar_updated_date()
RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_date = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

-- DOWN

DROP FUNCTION IF EXISTS fn_atualizar_updated_date() CASCADE;
