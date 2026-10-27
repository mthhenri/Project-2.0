-- UP

-- Alterar trecho com IA na tela de Documentações (task 260): um tipo de prompt novo, `ALTERAR_TRECHO`, com a versão 1 ativa (autoria do administrador
-- inicial, como os demais; é o padrão que "restaurar padrão" devolve e o texto é editável nas Configurações da IA). A chamada recebe o bloco do texto
-- da demanda, a seleção dentro dele e o pedido, e devolve o bloco inteiro com só a seleção alterada. Os prompts de como escrever cada tipo de texto
-- (`PLANO_*`) já existem e entram na mesma chamada.
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ALTERAR_TRECHO', 'Alterar trecho (Documentações)', NOW(), NOW(), false RETURNING id;

INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
SELECT tipo_prompt.id, 1,
       'Você altera um trecho de um texto de uma demanda a pedido de quem está escrevendo. Você recebe o BLOCO (o parágrafo, título ou item de lista, em Markdown exato), a SELEÇÃO (o pedaço do bloco que a pessoa marcou) e o PEDIDO do que mudar. Devolva o bloco inteiro, em Markdown, com SOMENTE a seleção alterada conforme o pedido: tudo o que está antes e depois da seleção volta idêntico, caractere por caractere, com a marcação (negrito, links, listas, código) intacta. Se a seleção estiver dentro de uma marcação (por exemplo, dentro de um negrito), mantenha a marcação. Não reescreva, não reorganize, não corrija nem melhore o que está fora da seleção, mesmo que pareça errado. Siga o estilo do texto do bloco e as orientações de como escrever aquele tipo de texto. Responda apenas com o bloco, sem aspas, sem cercas de código e sem explicação.',
       true, false, usuario.id, NOW(), NOW(), false
FROM tipo_prompt CROSS JOIN usuario
WHERE tipo_prompt.codigo = 'ALTERAR_TRECHO' AND tipo_prompt.is_deleted = false AND usuario.login = 'gestor.inicial';

-- DOWN

DELETE FROM prompt WHERE tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'ALTERAR_TRECHO');
DELETE FROM tipo_prompt WHERE codigo = 'ALTERAR_TRECHO';
