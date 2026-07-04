-- UP

ALTER TABLE demanda      RENAME CONSTRAINT demanda_status_check     TO chk_demanda_status;
ALTER TABLE dia_nao_util RENAME CONSTRAINT ck_dia_nao_util_duracao  TO chk_dia_nao_util_duracao;

-- DOWN

ALTER TABLE demanda      RENAME CONSTRAINT chk_demanda_status        TO demanda_status_check;
ALTER TABLE dia_nao_util RENAME CONSTRAINT chk_dia_nao_util_duracao  TO ck_dia_nao_util_duracao;
