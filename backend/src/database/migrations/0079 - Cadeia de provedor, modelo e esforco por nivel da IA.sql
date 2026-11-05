-- UP

-- Cadeia de provedor, modelo e esforço por nível da IA (spec 261). A configuração versionada deixa de ter um provedor padrão global,
-- fallbacks globais, um mapa de modelos por provedor e o esforço só do analítico. Passa a ter, em cada nível, a sua própria cadeia:
--   * `cadeia_rapido`, `cadeia_padrao` e `cadeia_analitico` (JSONB): array de itens `{ provedor, modelo, esforco }`, na ordem em que
--     são tentados. O primeiro item é o principal do nível e os seguintes são a contingência. Tamanho livre, no mínimo 1.
-- O `provedor` é o código do `TipoProvedorIaEnum` e o `esforco` o do `EsforcoIaEnum`; ambos são validados pela service e pelo `shared`
-- (como `fallbacks` e `esforco_analitico` já eram), sem FK nem tabela de referência. A tabela `tipo_provedor_ia` e o seu seed permanecem.
--
-- Conversão: cada versão histórica vira três cadeias iguais, copiando a que ela já tinha (o provedor padrão e depois os fallbacks, na
-- ordem, cada um com o modelo daquele nível). O esforço dos itens do analítico é o `esforco_analitico` da versão; rápido e padrão
-- recebem 'MEDIO' explícito (antes dependiam do padrão do SDK de cada provedor). Os modelos de provedores fora da cadeia da versão não
-- têm onde morar e se perdem. Nenhuma outra coluna (inclusive `precos_modelo`) muda.
--
-- `updated_date`: converter é alterar, então a linha viva grava `updated_date = NOW()`. A linha excluída (`is_deleted = true`) também
-- precisa ser convertida, porque sem cadeia o NOT NULL falharia (exceção ao filtro de exclusão, só neste UPDATE), mas excluído é morto:
-- o `updated_date` dela não muda. O trigger legado `trg_configuracao_ia_updated_date` sobrescreveria isso, então fica desligado só
-- durante o UPDATE (a spec 277 remove os triggers). Esta migration não cria trigger nem função.
ALTER TABLE configuracao_ia ADD COLUMN cadeia_rapido JSONB;
ALTER TABLE configuracao_ia ADD COLUMN cadeia_padrao JSONB;
ALTER TABLE configuracao_ia ADD COLUMN cadeia_analitico JSONB;

ALTER TABLE configuracao_ia DISABLE TRIGGER trg_configuracao_ia_updated_date;

WITH cadeia AS (
  SELECT configuracao_ia.id,
         0 AS ordem,
         tipo_provedor_ia.codigo AS provedor,
         configuracao_ia.modelos_provedor,
         configuracao_ia.esforco_analitico
  FROM configuracao_ia
  INNER JOIN tipo_provedor_ia ON tipo_provedor_ia.id = configuracao_ia.tipo_provedor_ia_id
    AND tipo_provedor_ia.is_deleted = false
  UNION ALL
  SELECT configuracao_ia.id,
         fallback.ordem,
         fallback.provedor,
         configuracao_ia.modelos_provedor,
         configuracao_ia.esforco_analitico
  FROM configuracao_ia
  CROSS JOIN LATERAL jsonb_array_elements_text(configuracao_ia.fallbacks) WITH ORDINALITY AS fallback(provedor, ordem)
),
montada AS (
  SELECT cadeia.id,
         jsonb_agg(
           jsonb_build_object(
             'provedor', cadeia.provedor,
             'modelo',   cadeia.modelos_provedor -> cadeia.provedor ->> 'modeloRapido',
             'esforco',  'MEDIO')
           ORDER BY cadeia.ordem) AS rapido,
         jsonb_agg(
           jsonb_build_object(
             'provedor', cadeia.provedor,
             'modelo',   cadeia.modelos_provedor -> cadeia.provedor ->> 'modeloPadrao',
             'esforco',  'MEDIO')
           ORDER BY cadeia.ordem) AS padrao,
         jsonb_agg(
           jsonb_build_object(
             'provedor', cadeia.provedor,
             'modelo',   cadeia.modelos_provedor -> cadeia.provedor ->> 'modeloAnalitico',
             'esforco',  cadeia.esforco_analitico)
           ORDER BY cadeia.ordem) AS analitico
  FROM cadeia
  WHERE cadeia.modelos_provedor -> cadeia.provedor IS NOT NULL
  GROUP BY cadeia.id
)
UPDATE configuracao_ia
SET cadeia_rapido    = montada.rapido,
    cadeia_padrao    = montada.padrao,
    cadeia_analitico = montada.analitico,
    updated_date     = CASE WHEN configuracao_ia.is_deleted = false THEN NOW() ELSE configuracao_ia.updated_date END
FROM montada
WHERE montada.id = configuracao_ia.id;

ALTER TABLE configuracao_ia ENABLE TRIGGER trg_configuracao_ia_updated_date;

ALTER TABLE configuracao_ia ALTER COLUMN cadeia_rapido SET NOT NULL;
ALTER TABLE configuracao_ia ALTER COLUMN cadeia_padrao SET NOT NULL;
ALTER TABLE configuracao_ia ALTER COLUMN cadeia_analitico SET NOT NULL;

ALTER TABLE configuracao_ia ADD CONSTRAINT chk_configuracao_ia_cadeia_rapido CHECK (jsonb_typeof(cadeia_rapido) = 'array' AND jsonb_array_length(cadeia_rapido) >= 1);
ALTER TABLE configuracao_ia ADD CONSTRAINT chk_configuracao_ia_cadeia_padrao CHECK (jsonb_typeof(cadeia_padrao) = 'array' AND jsonb_array_length(cadeia_padrao) >= 1);
ALTER TABLE configuracao_ia ADD CONSTRAINT chk_configuracao_ia_cadeia_analitico CHECK (jsonb_typeof(cadeia_analitico) = 'array' AND jsonb_array_length(cadeia_analitico) >= 1);

ALTER TABLE configuracao_ia DROP CONSTRAINT chk_configuracao_ia_fallbacks;
ALTER TABLE configuracao_ia DROP CONSTRAINT chk_configuracao_ia_modelos_provedor;
ALTER TABLE configuracao_ia DROP CONSTRAINT fk_configuracao_ia_tipo_provedor_ia;
ALTER TABLE configuracao_ia DROP COLUMN fallbacks;
ALTER TABLE configuracao_ia DROP COLUMN modelos_provedor;
ALTER TABLE configuracao_ia DROP COLUMN esforco_analitico;
ALTER TABLE configuracao_ia DROP COLUMN tipo_provedor_ia_id;

-- DOWN

-- Devolve as quatro colunas antigas a partir das três cadeias, e a conversão PERDE INFORMAÇÃO. O que o DOWN faz:
--   * provedor padrão e fallbacks: o primeiro item da cadeia do padrão é o provedor padrão e os seguintes, os fallbacks, na ordem;
--   * esforço do analítico: o esforço do primeiro item da cadeia do analítico;
--   * modelos por provedor: para cada provedor que aparece em qualquer das três cadeias, o modelo de cada nível vem do item daquele nível.
--     Regra explícita para o provedor ausente de algum nível: o nível sem item usa o modelo do padrão; sem este, o do rápido; sem este,
--     o do analítico (o primeiro que existir, nesta ordem).
-- O que se perde: as diferenças entre as cadeias dos três níveis (provedores, ordem e esforço de cada item além dos citados acima),
-- então uma configuração híbrida (por exemplo rápido na Anthropic e padrão na OpenAI) volta como uma cadeia só, a do padrão.
-- Antes de qualquer rollback em produção, apresente ao autor o que seria perdido.
ALTER TABLE configuracao_ia ADD COLUMN tipo_provedor_ia_id INTEGER;
ALTER TABLE configuracao_ia ADD COLUMN fallbacks JSONB;
ALTER TABLE configuracao_ia ADD COLUMN modelos_provedor JSONB;
ALTER TABLE configuracao_ia ADD COLUMN esforco_analitico VARCHAR(20);

ALTER TABLE configuracao_ia DISABLE TRIGGER trg_configuracao_ia_updated_date;

WITH item AS (
  SELECT configuracao_ia.id, 'RAPIDO' AS nivel, cadeia.item ->> 'provedor' AS provedor, cadeia.item ->> 'modelo' AS modelo
  FROM configuracao_ia
  CROSS JOIN LATERAL jsonb_array_elements(configuracao_ia.cadeia_rapido) AS cadeia(item)
  UNION ALL
  SELECT configuracao_ia.id, 'PADRAO', cadeia.item ->> 'provedor', cadeia.item ->> 'modelo'
  FROM configuracao_ia
  CROSS JOIN LATERAL jsonb_array_elements(configuracao_ia.cadeia_padrao) AS cadeia(item)
  UNION ALL
  SELECT configuracao_ia.id, 'ANALITICO', cadeia.item ->> 'provedor', cadeia.item ->> 'modelo'
  FROM configuracao_ia
  CROSS JOIN LATERAL jsonb_array_elements(configuracao_ia.cadeia_analitico) AS cadeia(item)
),
por_provedor AS (
  SELECT item.id,
         item.provedor,
         jsonb_build_object(
           'modeloRapido',
             COALESCE(MAX(item.modelo) FILTER (WHERE item.nivel = 'RAPIDO'),
                      MAX(item.modelo) FILTER (WHERE item.nivel = 'PADRAO'),
                      MAX(item.modelo) FILTER (WHERE item.nivel = 'ANALITICO')),
           'modeloPadrao',
             COALESCE(MAX(item.modelo) FILTER (WHERE item.nivel = 'PADRAO'),
                      MAX(item.modelo) FILTER (WHERE item.nivel = 'RAPIDO'),
                      MAX(item.modelo) FILTER (WHERE item.nivel = 'ANALITICO')),
           'modeloAnalitico',
             COALESCE(MAX(item.modelo) FILTER (WHERE item.nivel = 'ANALITICO'),
                      MAX(item.modelo) FILTER (WHERE item.nivel = 'PADRAO'),
                      MAX(item.modelo) FILTER (WHERE item.nivel = 'RAPIDO'))) AS modelos
  FROM item
  GROUP BY item.id, item.provedor
),
mapa AS (
  SELECT por_provedor.id, jsonb_object_agg(por_provedor.provedor, por_provedor.modelos) AS modelos_provedor
  FROM por_provedor
  GROUP BY por_provedor.id
)
UPDATE configuracao_ia
SET tipo_provedor_ia_id = (
      SELECT tipo_provedor_ia.id
      FROM tipo_provedor_ia
      WHERE tipo_provedor_ia.codigo = configuracao_ia.cadeia_padrao -> 0 ->> 'provedor'
        AND tipo_provedor_ia.is_deleted = false),
    fallbacks = COALESCE(
      (SELECT jsonb_agg(fallback.item ->> 'provedor' ORDER BY fallback.ordem)
       FROM jsonb_array_elements(configuracao_ia.cadeia_padrao) WITH ORDINALITY AS fallback(item, ordem)
       WHERE fallback.ordem > 1),
      CAST('[]' AS jsonb)),
    modelos_provedor  = mapa.modelos_provedor,
    esforco_analitico = configuracao_ia.cadeia_analitico -> 0 ->> 'esforco',
    updated_date      = CASE WHEN configuracao_ia.is_deleted = false THEN NOW() ELSE configuracao_ia.updated_date END
FROM mapa
WHERE mapa.id = configuracao_ia.id;

ALTER TABLE configuracao_ia ENABLE TRIGGER trg_configuracao_ia_updated_date;

ALTER TABLE configuracao_ia ALTER COLUMN tipo_provedor_ia_id SET NOT NULL;
ALTER TABLE configuracao_ia ALTER COLUMN fallbacks SET NOT NULL;
ALTER TABLE configuracao_ia ALTER COLUMN modelos_provedor SET NOT NULL;
ALTER TABLE configuracao_ia ALTER COLUMN esforco_analitico SET NOT NULL;

ALTER TABLE configuracao_ia ADD CONSTRAINT fk_configuracao_ia_tipo_provedor_ia FOREIGN KEY (tipo_provedor_ia_id) REFERENCES tipo_provedor_ia(id);
ALTER TABLE configuracao_ia ADD CONSTRAINT chk_configuracao_ia_modelos_provedor CHECK (jsonb_typeof(modelos_provedor) = 'object');
ALTER TABLE configuracao_ia ADD CONSTRAINT chk_configuracao_ia_fallbacks CHECK (jsonb_typeof(fallbacks) = 'array');

ALTER TABLE configuracao_ia DROP CONSTRAINT chk_configuracao_ia_cadeia_analitico;
ALTER TABLE configuracao_ia DROP CONSTRAINT chk_configuracao_ia_cadeia_padrao;
ALTER TABLE configuracao_ia DROP CONSTRAINT chk_configuracao_ia_cadeia_rapido;
ALTER TABLE configuracao_ia DROP COLUMN cadeia_analitico;
ALTER TABLE configuracao_ia DROP COLUMN cadeia_padrao;
ALTER TABLE configuracao_ia DROP COLUMN cadeia_rapido;
