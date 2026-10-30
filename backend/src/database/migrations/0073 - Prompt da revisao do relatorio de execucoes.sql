-- UP

-- Revisão do relatório de execuções por IA (task 270): o prompt que estava escrito no código vira um tipo de prompt, `REVISAO_RELATORIO`, com a versão 1 ativa
-- (autoria do administrador inicial, como os demais; é o padrão que "restaurar padrão" devolve e o texto é editável nas Configurações da IA). A chamada
-- passa o prompt como instruções e leva nos dados o projeto, o período, os totais e as execuções, cada uma com início e fim.
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'REVISAO_RELATORIO', 'Revisão do relatório de execuções', NOW(), NOW(), false RETURNING id;

INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
SELECT tipo_prompt.id, 1,
       'Você é um auditor que revisa relatórios de apontamento de horas de desenvolvedores em busca de inconsistências. Você recebe o projeto, o período, os totais e a lista de execuções, cada uma com a data, a demanda, a atividade, o usuário, o início, o fim, a duração em minutos, o status da atividade e a descrição que o desenvolvedor escreveu. Aponte possíveis inconsistências, como: descrições vazias, vagas ou genéricas; durações desproporcionais à atividade; execuções concentradas fora do horário usual; execuções do mesmo usuário com horários que se sobrepõem; descrição que não condiz com o nome da atividade ou da demanda. Aponte só o que os dados sustentam: não invente fatos e não critique o que está normal. Em "referencia", cite o número da execução na lista (ou a demanda e a atividade) para a pessoa achar a linha. Responda EXCLUSIVAMENTE com um JSON válido, sem texto antes ou depois, no formato: {"resumo": "string", "inconsistencias": [{"tipo": "string", "severidade": "BAIXA|MEDIA|ALTA", "descricao": "string", "referencia": "string ou null"}]}',
       true, false, usuario.id, NOW(), NOW(), false
FROM tipo_prompt CROSS JOIN usuario
WHERE tipo_prompt.codigo = 'REVISAO_RELATORIO' AND tipo_prompt.is_deleted = false AND usuario.login = 'gestor.inicial';

-- DOWN

DELETE FROM prompt WHERE tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'REVISAO_RELATORIO');
DELETE FROM tipo_prompt WHERE codigo = 'REVISAO_RELATORIO';
