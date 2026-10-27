-- UP

-- Alterar trecho com a IA só na seleção (task 255): o texto abaixo é acrescentado ao padrão (versão 1) do prompt de PLANEJAMENTO, que é o que "restaurar
-- padrão" devolve. Versões que o administrador já editou e ativou não mudam.

UPDATE prompt SET conteudo = conteudo || E'\n\n' || 'Seleção dentro de um bloco: quando o pedido trouxer uma seleção e o bloco que a contém, a seleção é o único alvo da mudança. Proponha a alteração com o bloco inteiro, em Markdown exato, como trecho antigo e o mesmo bloco com somente a seleção alterada como trecho novo; o que está fora da seleção volta idêntico, caractere por caractere, com a marcação (negrito, links, listas) intacta. Se a seleção atravessar dois blocos, os dois vão como contexto e só a seleção muda. Nunca reescreva o bloco além do que foi marcado.'
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'PLANEJAMENTO' AND is_deleted = false);

-- DOWN

UPDATE prompt SET conteudo = REPLACE(conteudo, E'\n\n' || 'Seleção dentro de um bloco: quando o pedido trouxer uma seleção e o bloco que a contém, a seleção é o único alvo da mudança. Proponha a alteração com o bloco inteiro, em Markdown exato, como trecho antigo e o mesmo bloco com somente a seleção alterada como trecho novo; o que está fora da seleção volta idêntico, caractere por caractere, com a marcação (negrito, links, listas) intacta. Se a seleção atravessar dois blocos, os dois vão como contexto e só a seleção muda. Nunca reescreva o bloco além do que foi marcado.', '')
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'PLANEJAMENTO' AND is_deleted = false);
