# Task 163 — Chat: armazenamento Elasticsearch pronto para a produção de verdade

> Origem: pedido do autor em 2026-10-18, na sequência da [162](162-chat-armazenamento-trocavel-e-postgres-provisorio.spec.md): deixar
> o Elasticsearch (stack final) já implementado e verificado, para que a troca de OpenSearch (dev) e Postgres (teste) para ele seja só
> configuração. A 162 deixou o valor `elasticsearch` reservado e fora de escopo; esta task o implementa.

## Objetivo

Implementar `CHAT_ARMAZENAMENTO=elasticsearch` como terceira implementação do contrato `ArmazenamentoDeChat`, com a mesma lógica,
consultas e mapeamentos do OpenSearch, verificada contra um Elasticsearch de verdade.

## Entregáveis

1. Cliente `@elastic/elasticsearch` 9 (a versão atual do Elastic Cloud) no backend, importado só em
   `chat-mensagem-elasticsearch.repository.ts`.
2. A lógica comum de OpenSearch e Elasticsearch extraída para `ChatMensagemIndiceRepository` (garantir índice de forma idempotente,
   gravar uma vez, consultas e mapeamentos de `chat-consultas.ts`, erro vira "chat indisponível"); cada serviço implementa só quatro
   métodos de acesso. O comportamento do OpenSearch não muda.
3. `ChatMensagemElasticsearchRepository` e o ramo `elasticsearch` do provider; `lerArmazenamentoDoChat` passa a aceitar o valor.
4. Configuração: `ELASTICSEARCH_URL` (obrigatória só com esse armazenamento), `ELASTICSEARCH_API_KEY` (Elastic Cloud, tem prioridade) ou
   `ELASTICSEARCH_USUARIO`/`ELASTICSEARCH_SENHA`; sem credencial, conecta sem autenticar (só dev). `.env.example` e `README.md`.
5. `docker-compose.yml`: serviço `elasticsearch` 9.1 em um **perfil opcional** (`--profile elasticsearch`, porta 9201), que não sobe com
   `npm run db:up`, para testar a implementação localmente.
6. A suíte de contrato da 162 roda também contra o Elasticsearch (`CHAT_INTEGRACAO=1`); testes unitários com cliente falso do
   formato do Elasticsearch (sem `body`, mapeamento e consulta espalhados nos parâmetros, `document`).
7. Docs: `SYSTEM.SPEC.md`, `CONTEXT.md`, `HISTORY.md`; `CLAUDE.md`/`AGENTS.md` (maior spec em uso: 163).

## Critérios de Aceite

1. `npm run test --workspace=backend` e `npm run build --workspace=backend` passam; os testes do OpenSearch seguem verdes.
2. Com `CHAT_INTEGRACAO=1`, os mesmos 6 cenários passam contra OpenSearch, Elasticsearch e Postgres reais.
3. Ao vivo com `CHAT_ARMAZENAMENTO=elasticsearch`: o backend sobe, uma conversa real com a IA grava as mensagens no Elasticsearch (e em
   nenhum outro armazenamento), e histórico, busca sem acento e título automático funcionam.
4. `CHAT_ARMAZENAMENTO=elasticsearch` sem `ELASTICSEARCH_URL` falha na subida com mensagem clara.
5. `npm run repo:verificar` passa.

## Fora de Escopo

- Deploy, provisionamento do Elastic Cloud, criação de chave de API, política de retenção e backup do Elasticsearch.
- Migrar mensagens de um armazenamento para outro.
- Ajustes finos de analisadores além do que o OpenSearch já usa (`brazilian` com `asciifolding`).
- Segurança do servidor local do perfil de teste (fica desligada, só dev).

## Dependências

- 135 e 162 em `done/`.
