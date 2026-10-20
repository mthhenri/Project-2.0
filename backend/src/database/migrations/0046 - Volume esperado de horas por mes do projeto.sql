-- UP

-- Volume de trabalho esperado do projeto, em horas por mês (task 197). Opcional: nulo = não definido. O gestor edita no formulário do
-- projeto; a visão "Volume do mês" compara com as horas gastas (soma das execuções encerradas do mês). Sem DEFAULT: a aplicação grava.
ALTER TABLE projeto ADD COLUMN volume_esperado_horas_mes INTEGER;
ALTER TABLE projeto ADD CONSTRAINT chk_projeto_volume_esperado_horas_mes CHECK (volume_esperado_horas_mes IS NULL OR volume_esperado_horas_mes >= 0);

-- DOWN

ALTER TABLE projeto DROP CONSTRAINT chk_projeto_volume_esperado_horas_mes;
ALTER TABLE projeto DROP COLUMN volume_esperado_horas_mes;
