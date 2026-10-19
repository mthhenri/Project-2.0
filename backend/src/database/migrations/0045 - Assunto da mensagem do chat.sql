-- UP

-- Assunto da mensagem do chat (task 191): SISTEMA ou CODIGO (AssuntoChatEnum do shared; sem tabela nem CHECK). Anulável: mensagem
-- antiga, do sistema (erro, aviso) ou do check-in fica sem assunto e é lida como SISTEMA. PROVISÓRIO como a tabela (task 162): sai
-- junto com chat_mensagem; no OpenSearch e no Elasticsearch o campo é uma propriedade `keyword` do documento.
ALTER TABLE chat_mensagem ADD COLUMN assunto VARCHAR(20);

-- DOWN

ALTER TABLE chat_mensagem DROP COLUMN assunto;
