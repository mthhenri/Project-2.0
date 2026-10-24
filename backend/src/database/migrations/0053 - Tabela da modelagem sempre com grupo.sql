-- UP

-- Uma tabela está "na modelagem" quando tem linha ativa em modelagem_tabela, e toda tabela na modelagem tem grupo. Tabela do banco sem
-- linha (nova, ou tirada da modelagem pelo gestor) aparece no canto do diagrama, em "Fora da modelagem". Tirar uma tabela da modelagem
-- é excluir (soft delete) a linha dela: a tabela do banco nunca é tocada.
-- Linhas sem grupo (a tela da 0052 permitia "Sem grupo") passam a ser "fora da modelagem": saem da modelagem por soft delete.
UPDATE modelagem_tabela
   SET is_deleted = true,
       deleted_date = NOW()
 WHERE modelagem_grupo_id IS NULL
   AND is_deleted = false;

ALTER TABLE modelagem_tabela ALTER COLUMN modelagem_grupo_id SET NOT NULL;

-- DOWN

ALTER TABLE modelagem_tabela ALTER COLUMN modelagem_grupo_id DROP NOT NULL;
