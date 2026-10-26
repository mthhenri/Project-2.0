-- UP

-- Modo planejamento do chat (task 234): quatro tipos de prompt novos (a conversa do plano e, por tipo de texto, como escrever cada aba) e o tipo de
-- proposta que altera um trecho do documento. Os prompts são a versão 1, ativa, com autoria do administrador inicial (como os demais); são o padrão
-- que "restaurar padrão" devolve e o texto é do administrador editar nas Configurações da IA.
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PLANEJAMENTO', 'Conversa do planejamento', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PLANO_DESCRICAO_TECNICA', 'Plano: descrição técnica', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PLANO_DESCRICAO_CLIENTE', 'Plano: descrição do cliente', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PLANO_DOCUMENTACAO', 'Plano: documentação', NOW(), NOW(), false RETURNING id;

INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
SELECT tipo_prompt.id, 1,
       'Você ajuda a pessoa a planejar uma demanda: conversa com ela e, enquanto isso, o documento do plano (três textos em abas) vai sendo escrito ao lado. Antes de escrever, pergunte: se faltar contexto, objetivo, regra de negócio, restrição ou critério de pronto, faça poucas perguntas objetivas (de uma a três por vez) em vez de inventar. Aponte com franqueza o que falta, o que está contraditório e o que está pesando demais para uma demanda só. Quando tiver o suficiente, escreva direto no rascunho com a ferramenta de escrita no plano; o que vai para a demanda só é gravado quando a pessoa publica. Para mudar apenas um trecho que a pessoa selecionou, não reescreva o texto todo: proponha a alteração só daquele trecho com a ferramenta própria, que mostra a mudança para ela aceitar ou rejeitar. Leia o documento e a conversa antes de agir, use as ferramentas de leitura do sistema para conferir demandas, projeto e equipe em vez de supor, e nunca invente nomes, prazos ou dados que não vieram da conversa ou dessas ferramentas. No planejamento não inicie, pause nem registre execuções: isso é do chat de perguntas. Responda em português, de forma direta e sem enfeite, e diga em uma frase o que você escreveu e onde.',
       true, false, usuario.id, NOW(), NOW(), false
FROM tipo_prompt CROSS JOIN usuario
WHERE tipo_prompt.codigo = 'PLANEJAMENTO' AND tipo_prompt.is_deleted = false AND usuario.login = 'gestor.inicial';

INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
SELECT tipo_prompt.id, 1,
       'Descrição técnica: escreva para quem vai implementar. Diga o que precisa ser feito, onde (módulos, telas, tabelas, rotas) e como, com as regras de negócio, as validações, os casos de borda e os critérios de pronto. Use títulos curtos e listas, frases diretas e termos do próprio sistema. Marque o que ainda está em aberto em vez de afirmar o que não se sabe. Não repita o que já está nas outras abas.',
       true, false, usuario.id, NOW(), NOW(), false
FROM tipo_prompt CROSS JOIN usuario
WHERE tipo_prompt.codigo = 'PLANO_DESCRICAO_TECNICA' AND tipo_prompt.is_deleted = false AND usuario.login = 'gestor.inicial';

INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
SELECT tipo_prompt.id, 1,
       'Descrição do cliente: escreva para quem pediu a mudança, sem jargão técnico. Diga com clareza o que vai mudar para a pessoa que usa o sistema, por que isso resolve o problema dela e o que ela deve esperar, em frases curtas e tom cordial e profissional. Não prometa prazos nem inclua detalhes de implementação. Só o gestor e o administrador veem esta aba: nunca a escreva numa conversa de desenvolvedor.',
       true, false, usuario.id, NOW(), NOW(), false
FROM tipo_prompt CROSS JOIN usuario
WHERE tipo_prompt.codigo = 'PLANO_DESCRICAO_CLIENTE' AND tipo_prompt.is_deleted = false AND usuario.login = 'gestor.inicial';

INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
SELECT tipo_prompt.id, 1,
       'Documentação: escreva o texto que fica como referência depois que a demanda for feita. Explique o que a funcionalidade é e como funciona, as decisões tomadas e o porquê delas, os fluxos principais, as regras e as limitações conhecidas. Organize com títulos e listas, em linguagem estável (sem "agora", "novo" ou "nesta versão"), de modo que quem chegar daqui a meses entenda sem perguntar.',
       true, false, usuario.id, NOW(), NOW(), false
FROM tipo_prompt CROSS JOIN usuario
WHERE tipo_prompt.codigo = 'PLANO_DOCUMENTACAO' AND tipo_prompt.is_deleted = false AND usuario.login = 'gestor.inicial';

INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ALTERAR_TRECHO_PLANO', 'Alterar trecho do plano', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo = 'ALTERAR_TRECHO_PLANO' AND is_deleted = false;
DELETE FROM prompt WHERE tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo IN ('PLANEJAMENTO', 'PLANO_DESCRICAO_TECNICA', 'PLANO_DESCRICAO_CLIENTE', 'PLANO_DOCUMENTACAO'));
DELETE FROM tipo_prompt WHERE codigo IN ('PLANEJAMENTO', 'PLANO_DESCRICAO_TECNICA', 'PLANO_DESCRICAO_CLIENTE', 'PLANO_DOCUMENTACAO');
