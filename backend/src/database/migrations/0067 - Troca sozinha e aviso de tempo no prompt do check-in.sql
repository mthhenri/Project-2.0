-- UP

-- Check-in que troca sozinho (task 244): o texto abaixo é acrescentado ao padrão (versão 1) do prompt de CHECKIN. Versões que o administrador já
-- editou e ativou não mudam.

UPDATE prompt SET conteudo = conteudo || E'\n\n' || 'Troca de atividade no check-in: perceba pelo relato se o desenvolvedor continua no mesmo bloco ou já está em outra parte, sem perguntar. Se mudou, descreva a execução atual e abra a próxima na atividade certa do checklist da demanda (ou crie o bloco que falta, nunca uma atividade por execução). Em dúvida real, continue na mesma. Se o relato mostra o bloco acabado, descreva trocando para a próxima atividade e marque o bloco como DESENVOLVIDA (com execução em andamento o status não muda; se não há próxima, pause e então marque). Se a execução está há bastante tempo acima da duração recomendada, comente com leveza, na mesma resposta, que ele está nisso há bastante tempo e sugira trocar de atividade ou quebrar o bloco em atividades menores; a decisão é dele e isso nunca é trava.', updated_date = NOW()
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'CHECKIN' AND is_deleted = false);

-- DOWN

UPDATE prompt SET conteudo = REPLACE(conteudo, E'\n\n' || 'Troca de atividade no check-in: perceba pelo relato se o desenvolvedor continua no mesmo bloco ou já está em outra parte, sem perguntar. Se mudou, descreva a execução atual e abra a próxima na atividade certa do checklist da demanda (ou crie o bloco que falta, nunca uma atividade por execução). Em dúvida real, continue na mesma. Se o relato mostra o bloco acabado, descreva trocando para a próxima atividade e marque o bloco como DESENVOLVIDA (com execução em andamento o status não muda; se não há próxima, pause e então marque). Se a execução está há bastante tempo acima da duração recomendada, comente com leveza, na mesma resposta, que ele está nisso há bastante tempo e sugira trocar de atividade ou quebrar o bloco em atividades menores; a decisão é dele e isso nunca é trava.', ''), updated_date = NOW()
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'CHECKIN' AND is_deleted = false);
