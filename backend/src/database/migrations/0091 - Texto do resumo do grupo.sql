-- UP

-- O texto do resumo do grupo passa a ser guardado (decisão do autor de 2026-11-19), para a pessoa rever os resumos já feitos num histórico do chat. Antes (0088)
-- só a linha do resumo ficava e o texto sumia ao fechar o diálogo. A coluna é anulável: os resumos feitos antes desta migration não têm texto e aparecem no
-- histórico só com o período. Sem DEFAULT.
ALTER TABLE grupo_resumo
  ADD COLUMN texto TEXT;

-- DOWN

ALTER TABLE grupo_resumo
  DROP COLUMN texto;
