-- UP

-- Atividade é o checklist da demanda (task 242): o texto abaixo é acrescentado ao padrão (versão 1) dos prompts de CONVERSA e de CHECKIN, o que
-- "restaurar padrão" devolve. Versões que o administrador já editou e ativou não mudam: ele restaura o padrão ou copia o parágrafo se quiser.

UPDATE prompt SET conteudo = conteudo || E'\n\n' || 'Atividades e execuções: uma atividade é um bloco do trabalho (no cadastro de usuário, por exemplo: a tela, as services e controllers, o repositório, os scripts do banco e os testes) e tem várias execuções. Nunca crie uma atividade por execução nem para uma continuação. Antes de criar uma atividade, leia o checklist da demanda (consultar_checklist_da_demanda) e reaproveite o bloco que serve; crie só quando falta o bloco, com um nome que descreve a parte do trabalho. Se um bloco ficou grande demais, sugira quebrá-lo em atividades menores e deixe o desenvolvedor decidir. Atividade não é concluída: ela é desenvolvida. Quando o relato mostrar que o bloco inteiro foi desenvolvido, proponha o status DESENVOLVIDA.', updated_date = NOW()
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'CONVERSA' AND is_deleted = false);

UPDATE prompt SET conteudo = conteudo || E'\n\n' || 'Atividades e execuções: uma atividade é um bloco do trabalho (no cadastro de usuário, por exemplo: a tela, as services e controllers, o repositório, os scripts do banco e os testes) e tem várias execuções. Se o relato continua no mesmo bloco, a descrição continua na mesma atividade; não crie uma atividade por execução. Antes de criar uma atividade, leia o checklist da demanda (consultar_checklist_da_demanda) e reaproveite o bloco que serve; crie só quando falta o bloco. Atividade não é concluída: ela é desenvolvida. Quando o relato mostrar que o bloco inteiro foi desenvolvido, proponha o status DESENVOLVIDA.', updated_date = NOW()
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'CHECKIN' AND is_deleted = false);

-- DOWN

UPDATE prompt SET conteudo = REPLACE(conteudo, E'\n\n' || 'Atividades e execuções: uma atividade é um bloco do trabalho (no cadastro de usuário, por exemplo: a tela, as services e controllers, o repositório, os scripts do banco e os testes) e tem várias execuções. Nunca crie uma atividade por execução nem para uma continuação. Antes de criar uma atividade, leia o checklist da demanda (consultar_checklist_da_demanda) e reaproveite o bloco que serve; crie só quando falta o bloco, com um nome que descreve a parte do trabalho. Se um bloco ficou grande demais, sugira quebrá-lo em atividades menores e deixe o desenvolvedor decidir. Atividade não é concluída: ela é desenvolvida. Quando o relato mostrar que o bloco inteiro foi desenvolvido, proponha o status DESENVOLVIDA.', ''), updated_date = NOW()
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'CONVERSA' AND is_deleted = false);

UPDATE prompt SET conteudo = REPLACE(conteudo, E'\n\n' || 'Atividades e execuções: uma atividade é um bloco do trabalho (no cadastro de usuário, por exemplo: a tela, as services e controllers, o repositório, os scripts do banco e os testes) e tem várias execuções. Se o relato continua no mesmo bloco, a descrição continua na mesma atividade; não crie uma atividade por execução. Antes de criar uma atividade, leia o checklist da demanda (consultar_checklist_da_demanda) e reaproveite o bloco que serve; crie só quando falta o bloco. Atividade não é concluída: ela é desenvolvida. Quando o relato mostrar que o bloco inteiro foi desenvolvido, proponha o status DESENVOLVIDA.', ''), updated_date = NOW()
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'CHECKIN' AND is_deleted = false);
