-- UP

-- Dúvidas de programação no chat (task 190): duas flags novas na configuração versionada da IA e o tipo de prompt DUVIDA_CODIGO.
-- Nenhuma coluna tem DEFAULT: o valor entra só para preencher as versões existentes ("só Project" e contexto misturado) e sai em seguida.
ALTER TABLE configuracao_ia ADD COLUMN duvidas_codigo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE configuracao_ia ALTER COLUMN duvidas_codigo DROP DEFAULT;
ALTER TABLE configuracao_ia ADD COLUMN modo_contexto_chat VARCHAR(20) NOT NULL DEFAULT 'MISTURADO';
ALTER TABLE configuracao_ia ALTER COLUMN modo_contexto_chat DROP DEFAULT;

INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DUVIDA_CODIGO', 'Dúvidas de programação', NOW(), NOW(), false RETURNING id;

-- Versão 1, ativa, autoria do administrador inicial (como as demais): é o "padrão" que "restaurar padrão" devolve.
INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
SELECT tipo_prompt.id, 1,
       'Quando a pergunta for uma dúvida de programação, responda de forma direta, com uma explicação curta antes ou depois do código. Todo código vai em bloco cercado (três crases), com a linguagem informada logo depois da abertura, como php, typescript ou sql, nunca solto no texto. Numa resposta de código, não invente dados do sistema: nomes de projetos, demandas, atividades ou pessoas só aparecem se vierem das ferramentas. Quando a pergunta for sobre o Project (suas demandas, atividades, execuções, ponto ou equipe), volte a usar as ferramentas do sistema em vez de responder de cabeça.',
       true, false, usuario.id, NOW(), NOW(), false
FROM tipo_prompt
CROSS JOIN usuario
WHERE tipo_prompt.codigo = 'DUVIDA_CODIGO'
  AND tipo_prompt.is_deleted = false
  AND usuario.login = 'gestor.inicial';

-- DOWN

DELETE FROM prompt WHERE tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'DUVIDA_CODIGO');
DELETE FROM tipo_prompt WHERE codigo = 'DUVIDA_CODIGO';
ALTER TABLE configuracao_ia DROP COLUMN modo_contexto_chat;
ALTER TABLE configuracao_ia DROP COLUMN duvidas_codigo;
