-- UP

-- Modelo planejado da mensagem da IA (spec 261): o modelo do item principal da cadeia do nível na chamada que gerou a resposta, ao lado de
-- `modelo` (o que de fato respondeu). Quando diferem, a tela mostra o alerta "Fallback utilizado". Anulável e sem DEFAULT: a mensagem
-- antiga e a que não é da IA ficam com NULL e não mostram alerta. Tabela provisória (task 162): no Elasticsearch o campo é `modelo_planejado`.
ALTER TABLE chat_mensagem ADD COLUMN modelo_planejado VARCHAR(100);

-- DOWN

-- Perde o modelo planejado de todas as mensagens (o alerta de fallback deixa de existir para o histórico).
ALTER TABLE chat_mensagem DROP COLUMN modelo_planejado;
