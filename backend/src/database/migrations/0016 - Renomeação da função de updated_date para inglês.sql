-- UP

CREATE OR REPLACE FUNCTION fn_set_updated_date()
RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_date = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuario_updated_date ON usuario;
CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_projeto_updated_date ON projeto;
CREATE TRIGGER trg_projeto_updated_date
  BEFORE UPDATE ON projeto
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_tag_updated_date ON tag;
CREATE TRIGGER trg_tag_updated_date
  BEFORE UPDATE ON tag
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_demanda_updated_date ON demanda;
CREATE TRIGGER trg_demanda_updated_date
  BEFORE UPDATE ON demanda
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_demanda_usuario_updated_date ON demanda_usuario;
CREATE TRIGGER trg_demanda_usuario_updated_date
  BEFORE UPDATE ON demanda_usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_demanda_conexao_updated_date ON demanda_conexao;
CREATE TRIGGER trg_demanda_conexao_updated_date
  BEFORE UPDATE ON demanda_conexao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_demanda_tag_updated_date ON demanda_tag;
CREATE TRIGGER trg_demanda_tag_updated_date
  BEFORE UPDATE ON demanda_tag
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_atividade_updated_date ON atividade;
CREATE TRIGGER trg_atividade_updated_date
  BEFORE UPDATE ON atividade
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_atividade_tag_updated_date ON atividade_tag;
CREATE TRIGGER trg_atividade_tag_updated_date
  BEFORE UPDATE ON atividade_tag
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_execucao_updated_date ON execucao;
CREATE TRIGGER trg_execucao_updated_date
  BEFORE UPDATE ON execucao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_dia_nao_util_updated_date ON dia_nao_util;
CREATE TRIGGER trg_dia_nao_util_updated_date
  BEFORE UPDATE ON dia_nao_util
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP FUNCTION IF EXISTS fn_atualizar_updated_date() CASCADE;

-- DOWN

CREATE OR REPLACE FUNCTION fn_atualizar_updated_date()
RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_date = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuario_updated_date ON usuario;
CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_projeto_updated_date ON projeto;
CREATE TRIGGER trg_projeto_updated_date
  BEFORE UPDATE ON projeto
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_tag_updated_date ON tag;
CREATE TRIGGER trg_tag_updated_date
  BEFORE UPDATE ON tag
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_demanda_updated_date ON demanda;
CREATE TRIGGER trg_demanda_updated_date
  BEFORE UPDATE ON demanda
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_demanda_usuario_updated_date ON demanda_usuario;
CREATE TRIGGER trg_demanda_usuario_updated_date
  BEFORE UPDATE ON demanda_usuario
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_demanda_conexao_updated_date ON demanda_conexao;
CREATE TRIGGER trg_demanda_conexao_updated_date
  BEFORE UPDATE ON demanda_conexao
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_demanda_tag_updated_date ON demanda_tag;
CREATE TRIGGER trg_demanda_tag_updated_date
  BEFORE UPDATE ON demanda_tag
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_atividade_updated_date ON atividade;
CREATE TRIGGER trg_atividade_updated_date
  BEFORE UPDATE ON atividade
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_atividade_tag_updated_date ON atividade_tag;
CREATE TRIGGER trg_atividade_tag_updated_date
  BEFORE UPDATE ON atividade_tag
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_execucao_updated_date ON execucao;
CREATE TRIGGER trg_execucao_updated_date
  BEFORE UPDATE ON execucao
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP TRIGGER IF EXISTS trg_dia_nao_util_updated_date ON dia_nao_util;
CREATE TRIGGER trg_dia_nao_util_updated_date
  BEFORE UPDATE ON dia_nao_util
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

DROP FUNCTION IF EXISTS fn_set_updated_date() CASCADE;
