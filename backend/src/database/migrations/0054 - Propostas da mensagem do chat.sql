-- UP

-- Todas as propostas do turno da IA numa mensagem do chat (task 225); antes só a primeira ficava em `proposta_id`. Anulável: mensagem antiga
-- fica sem a lista e é lida como [proposta_id]. `proposta_id` segue gravado com a primeira. PROVISÓRIO como a tabela (task 162): sai junto com
-- chat_mensagem; no OpenSearch e no Elasticsearch o campo é uma propriedade `integer` do documento (`propostas_ids`).
ALTER TABLE chat_mensagem ADD COLUMN propostas_ids INTEGER[];

-- DOWN

ALTER TABLE chat_mensagem DROP COLUMN propostas_ids;
