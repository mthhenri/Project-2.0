-- UP

-- Planejamento no nível padrão com escalada (decisão do autor, 2026-10-27): a conversa do planejamento deixou de rodar inteira no nível analítico (caro) e
-- passou para o padrão; a ferramenta `aprofundar_analise_do_plano` chama o modelo mais forte só quando o trabalho pede. O texto abaixo é acrescentado ao
-- padrão (versão 1) do prompt de PLANEJAMENTO, que é o que "restaurar padrão" devolve. Versões que o administrador já editou e ativou não mudam.

UPDATE prompt SET conteudo = conteudo || E'\n\n' || 'Modelo mais forte: você roda num modelo de nível padrão, bom para conversar, perguntar e escrever. Quando o trabalho pedir raciocínio mais fundo, use a ferramenta de aprofundar a análise do plano, que chama o modelo mais forte (mais caro e mais lento): achar lacunas e contradições do documento todo, avaliar se a demanda está grande demais e como dividi-la, ou redigir um texto longo e delicado. Para o resto (perguntar, escrever um trecho, ajustar, anotar pontos em aberto) não use: resolva você mesmo. O que a ferramenta devolver é material para você: confira e escreva no plano com a ferramenta de escrita.'
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'PLANEJAMENTO' AND is_deleted = false);

-- DOWN

UPDATE prompt SET conteudo = REPLACE(conteudo, E'\n\n' || 'Modelo mais forte: você roda num modelo de nível padrão, bom para conversar, perguntar e escrever. Quando o trabalho pedir raciocínio mais fundo, use a ferramenta de aprofundar a análise do plano, que chama o modelo mais forte (mais caro e mais lento): achar lacunas e contradições do documento todo, avaliar se a demanda está grande demais e como dividi-la, ou redigir um texto longo e delicado. Para o resto (perguntar, escrever um trecho, ajustar, anotar pontos em aberto) não use: resolva você mesmo. O que a ferramenta devolver é material para você: confira e escreva no plano com a ferramenta de escrita.', '')
WHERE versao = 1 AND is_deleted = false
  AND tipo_prompt_id IN (SELECT id FROM tipo_prompt WHERE codigo = 'PLANEJAMENTO' AND is_deleted = false);
