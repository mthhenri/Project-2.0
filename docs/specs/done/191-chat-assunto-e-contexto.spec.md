# Task 191 — Assunto das mensagens e contexto do chat

> Task 4/4 da guarda-chuva [`chat-duvidas-de-codigo.spec.md`](chat-duvidas-de-codigo.spec.md). Fecha a guarda-chuva.

## Objetivo

Com as dúvidas de código ligadas, o chat responde perguntas de programação usando o prompt `DUVIDA_CODIGO`, marca cada mensagem
pelo assunto (sistema ou código) e monta o contexto enviado à IA conforme o modo `MISTURADO`/`SEPARADO`. Desligadas, a IA
recusa com educação a pergunta de programação que não é sobre o sistema.

## Entregáveis

1. **Assunto da mensagem.** Enum novo no `shared` (ex.: `AssuntoChatEnum`: `SISTEMA`, `CODIGO`) e campo `assunto` (anulável) nas
   mensagens do chat, nos três armazenamentos: coluna em `chat_mensagem` (migration a partir da seguinte à da task 190; tabela
   provisória, mas o ambiente de teste precisa dela), propriedade `keyword` no mapeamento de OpenSearch e Elasticsearch
   (`chat-consultas.ts`, inclusive para um índice que já existe) e no documento (`chat-mensagem.documento.ts`). Mensagem antiga,
   do sistema (erro, aviso) ou do check-in fica `null`, lida como `SISTEMA`.
2. **Classificação antes de gravar.** As mensagens nunca são reescritas, então o assunto é decidido **antes** de gravar a mensagem
   do usuário: com `duvidasCodigo` ligado e contexto `CHAT`, uma chamada no nível `RAPIDO`, sem ferramentas e com teto pequeno de
   tokens, classifica a pergunta olhando também as últimas mensagens (para "e em C#?" seguir o assunto anterior). Instruções da
   classificação numa função pura do domínio do chat, como as de sugestões. A mensagem do usuário e a resposta da IA do turno
   gravam o mesmo assunto. Falha da classificação nunca derruba o chat: usa o assunto da última mensagem marcada do dia, ou
   `SISTEMA`. Com a flag desligada não há chamada e o assunto é `SISTEMA`.
3. **Instruções da conversa.** Ligado: prompt `CONVERSA` + prompt ativo `DUVIDA_CODIGO`. Desligado: prompt `CONVERSA` + uma
   instrução fixa (função pura) para recusar com educação perguntas de programação que não são sobre o uso do sistema. As
   ferramentas continuam disponíveis nos dois casos.
4. **Contexto enviado à IA.** `MISTURADO`: como hoje, as últimas `JANELA_DE_MENSAGENS` do dia. `SEPARADO`: só as mensagens do
   mesmo assunto da pergunta atual (`null` conta como `SISTEMA`), e então a janela. Regra pura com teste. A retomada segue o mesmo
   modo.
5. **Teto de tokens.** `MAXIMO_TOKENS_DO_CHAT` sobe de 2048 para 4096, para a resposta de código não cortar no meio; confirmar o
   valor com respostas reais na verificação e registrar no fecho.
6. **Documentação.** A seção do chat em `docs/SYSTEM.SPEC.md` (assunto, classificação, modos de contexto, recusa com a flag
   desligada) e a tabela provisória em `docs/SCHEMA.md`.

## Critérios de Aceite

- Testes de `chat.service`: flag desligada não classifica e grava `SISTEMA`; ligada grava o assunto devolvido nas duas mensagens
  do turno; falha da classificação cai no assunto anterior; `SEPARADO` manda só o histórico do assunto, `MISTURADO` manda tudo;
  instruções certas para cada valor da flag; check-in não classifica.
- O contrato comum dos armazenamentos (`armazenamento-de-chat.contrato.ts`) grava e lê `assunto` nos três; teste de integração do
  repository Postgres (`npm run test:integracao`).
- `npm test` e builds de backend e frontend verdes.
- Ao vivo (skill `verify`), com a flag ligada: "como faço um loop em PHP?" volta com bloco realçado e copiável (task 189) e marcado
  `CODIGO`; em seguida "e em C#?" segue como `CODIGO`; "quais minhas atividades de hoje?" usa a ferramenta e fica `SISTEMA`;
  repetir em `SEPARADO`. Com a flag desligada, a pergunta de PHP é recusada. Conferir o assunto gravado no armazenamento em uso.
  Telas do chat em 1920×1080, 1366×768 e 1080×1920.

## Fora de Escopo

- Mostrar ou filtrar o assunto na tela do chat ou do histórico; leitura das dúvidas pelo gestor (`IDEAS.md` I-006).
- Escalada de dúvida complexa para nível mais forte (`IDEAS.md` I-007).
- Marcar o assunto das mensagens antigas.

## Dependências

- Task **190** em `done/` (flags e prompt `DUVIDA_CODIGO`).
- Task **189** recomendada antes da verificação ao vivo (bloco realçado); sem ela, o critério visual do bloco fica pendente.

## Riscos e Mitigação

- **Latência extra:** a classificação roda antes de cada pergunta com a flag ligada. Teto pequeno de tokens, nível rápido e
  medir o tempo até o primeiro trecho no fecho (antes e depois).
- **Mapeamento de índice já criado:** OpenSearch/Elasticsearch não aceitam mudar tipo de campo existente; adicionar o campo novo
  e confirmar que a subida não falha com o índice antigo.
