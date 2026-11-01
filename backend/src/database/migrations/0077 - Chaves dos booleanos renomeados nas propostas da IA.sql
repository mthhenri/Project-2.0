-- UP

-- A migration 0076 tirou o prefixo dos booleanos `isEstrutural` e `ehBidirecional`. As propostas da IA guardam esses campos nas chaves de
-- `proposta_ia.dados` e `proposta_ia.resultado` (o cartão, a regra de criar demanda e o desfazer de uma desconexão leem pela chave), então as
-- propostas já gravadas passam para os nomes novos. A chave no JSON sempre vem entre aspas e seguida de dois-pontos.
UPDATE proposta_ia
SET dados = replace(replace(dados::text, '"isEstrutural":', '"estrutural":'), '"ehBidirecional":', '"bidirecional":')::jsonb
WHERE dados::text LIKE '%"isEstrutural":%'
   OR dados::text LIKE '%"ehBidirecional":%';

UPDATE proposta_ia
SET resultado = replace(replace(resultado::text, '"isEstrutural":', '"estrutural":'), '"ehBidirecional":', '"bidirecional":')::jsonb
WHERE resultado::text LIKE '%"isEstrutural":%'
   OR resultado::text LIKE '%"ehBidirecional":%';

-- DOWN

UPDATE proposta_ia
SET dados = replace(replace(dados::text, '"estrutural":', '"isEstrutural":'), '"bidirecional":', '"ehBidirecional":')::jsonb
WHERE dados::text LIKE '%"estrutural":%'
   OR dados::text LIKE '%"bidirecional":%';

UPDATE proposta_ia
SET resultado = replace(replace(resultado::text, '"estrutural":', '"isEstrutural":'), '"bidirecional":', '"ehBidirecional":')::jsonb
WHERE resultado::text LIKE '%"estrutural":%'
   OR resultado::text LIKE '%"bidirecional":%';
