# Task 185 — Testes: chat

> Task 15/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md). `chat.service` já tem 34 testes.

## Objetivo

Completar o chat nas camadas que faltam: a resposta em `text/event-stream`, o armazenamento provisório no Postgres contra
banco real, o documento de mensagem e a tela do chat com cartões de proposta.

## Entregáveis

### Backend

1. **Controller e `event-stream.response`:** cada rota de §12 (`mensagem`, `retomada`, `bom-dia`, `hoje`, `conversas`,
   `conversa/:data`, `busca`); o dono vem sempre do token; formato dos eventos (`trecho`, `ferramenta`, `proposta`,
   `fim`, `erro`, `sugestoes`); 409 antes de qualquer evento quando cabível; cliente que fecha a conexão não interrompe
   a geração.
2. **`chat-mensagem.documento`:** montagem e leitura do documento (regra pura).
3. **`chat-mensagem-postgres.repository` (integração):** busca `tsvector` em português com `unaccent` (com e sem acento
   acham o mesmo), mesma ordem, filtros e limites do índice; agregação de conversas só do contexto `CHAT`; mensagens
   nunca alteradas; título por conversa.
4. **`chat-mensagem-indice.repository`:** a lógica comum a OpenSearch e Elasticsearch com o cliente em dublê (os dois
   específicos já têm testes).
5. **Separação de contextos:** teste que prova que chat e check-in não se leem (histórico, bom dia, título e contexto do
   modelo só do `CHAT`) — conferir se `chat.service.test` já cobre.

### Frontend

6. **Lógica:** `chat/services/chat.service` (leitura do stream sobre `POST`, eventos parciais) e `proposta-ia.service`;
   `chat.util` já testado — só lacuna.
7. **Componentes:** página `chat` (envio, trechos chegando, ferramenta executando, erro, sugestões, retomada após queda,
   IA desligada), `proposta-cartao` (Confirmar, Ajustar, Recusar, Desfazer; 409 de corrida), `historico` (lista de
   conversas, busca, abrir dia anterior).

## Critérios de Aceite

- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- OpenSearch e Elasticsearch reais. Chamadas reais à IA.

## Dependências

171, 172, 173, 184. Fontes: `SYSTEM.SPEC.md` §2 (armazenamento), §12 (`chat`).
