# 206-mensagem-direta-armazenamento-em-indice.spec.md

> Task 2/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md). Modelagem em
> [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md) (§3 e §7). Depende da [`205`](../done/205-mensagem-direta-fundacao.spec.md). No molde da
> [`162`](../done/162-chat-armazenamento-trocavel-e-postgres-provisorio.spec.md) e da [`163`](../done/163-chat-armazenamento-elasticsearch.spec.md), do chat com a IA.

## Objetivo

Dar às mensagens entre colaboradores um **contrato de armazenamento** (`ArmazenamentoDeMensagemDireta`) e as duas implementações que guardam num índice de busca, **OpenSearch**
(desenvolvimento) e **Elasticsearch** (produção final), com uma **suíte de contrato** única que roda contra o serviço real. O armazenamento em PostgreSQL provisório é a 207; a
service e as rotas são a 208.

## Entregáveis

1. **Módulo `backend/src/modules/mensagem-direta/`**, só com `domain/` e `repositories/` e um `MensagemDiretaModule` que provê e exporta o armazenamento. O módulo **não** entra
   no `AppModule` nesta task: sem service nem rota não há consumidor, e `CHAT_ARMAZENAMENTO=postgres` ainda não tem implementação (207). A 208 o registra.
2. **Índice próprio `mensagem-direta`** (nunca o `chat-mensagem` da IA), com o mesmo analisador de português sem acento do chat da IA e os campos da modelagem: `mensagem_id`,
   `conversa_id`, `participantes`, `autor_usuario_id`, `autor`, `texto`, `contem_codigo`, `mencoes`, `referencias` e `created_date`. Criado de forma idempotente na subida ou na
   primeira chamada; serviço fora do ar na subida não derruba o backend.
3. **O contrato**, sem exclusão nem alteração de mensagem e com objeto em toda assinatura (sem primitivo solto):
   - `gravar`: idempotente pelo `mensagemId` (que é o `_id` do documento, criado com `op_type=create`); devolve a mensagem gravada e `jaExistia`. Um `mensagemId` já usado por
     **outro autor ou em outra conversa** é recusado, nunca devolvido (senão o reenvio vazaria a mensagem de outra pessoa). Valida a coerência do documento (conversa válida,
     autor participante, mensagem do sistema sem autor) e define `created_date` no servidor.
   - `listarConversa`: da mais nova para a mais antiga, com **cursor opaco** (`search_after` por `created_date` e `mensagem_id`) e limite; busca `limite + 1` para saber se há página
     seguinte. Não filtra por pessoa: quem pode ler a conversa é decidido na service.
   - `listarConversasDoUsuario`: uma linha por conversa em que a pessoa participa, da que teve mensagem mais recente, com o total e a última mensagem.
   - `contarNaoLidas`: dado o marcador de cada conversa, quantas mensagens **do outro** (autor `USUARIO`, nunca as do sistema nem as minhas) vieram depois dele, numa única consulta.
   - `buscar`: texto (todas as palavras, sem acento), período e `somenteCodigo`, sempre restrito às conversas da pessoa.
   - `listarTodasConversas`: para a supervisão. Recebe os ids de gestores e administradores (`usuarioIdsExcluidos`) e devolve só as conversas em que **nenhum** participante está
     nessa lista, com texto, período, `somenteCodigo`, paginação e o total.
4. **`MensagemDiretaIndiceRepository`** (a lógica comum) e as duas subclasses finas, `MensagemDiretaOpenSearchRepository` e `MensagemDiretaElasticsearchRepository`, cada uma
   falando só com o cliente do seu serviço. Falha do serviço vira `BusinessException` com mensagem clara.
5. **Provider por `CHAT_ARMAZENAMENTO`**: `opensearch` e `elasticsearch` instanciam só o escolhido; `postgres` falha na subida com mensagem que aponta a task 207.
6. **Suíte de contrato** (`armazenamento-de-mensagem-direta.contrato.ts`), uma só para as duas implementações, ligada por `CHAT_INTEGRACAO=1` contra o serviço real, como a do chat da IA.
7. **Testes unitários** com o cliente em dublê: criação idempotente do índice, idempotência e recusa do `mensagemId` alheio, validações, cursor, formato de cada consulta, resposta
   de cada cliente (OpenSearch no envelope `body`, Elasticsearch direto) e a tradução de falha.
8. Documentação: `docs/SYSTEM.SPEC.md` (módulo e variáveis), `CONTEXT.md`, `HISTORY.md` e `MEMORY.md`.

## Critérios de Aceite

- `npm run test --workspace=backend` passa, com os testes novos; `npm run build --workspace=backend` compila.
- **A suíte de contrato passa contra um OpenSearch e contra um Elasticsearch de verdade** (`CHAT_INTEGRACAO=1`, serviços do `docker-compose`). É o que prova as consultas (ordem e
  `search_after`, agregação por conversa, `filters`, `bucket_sort`, `cardinality`); o dublê só prova a montagem. **Sem essa execução a task fica aberta.**
- `npm run repo:verificar` passa. `CLAUDE.md` e `AGENTS.md` continuam idênticos.

## Fora de Escopo

- Armazenamento em PostgreSQL (207), service, controller e rotas (208), stream de eventos (209), telas e Desktop.
- Alterar ou excluir mensagem; edição de mensagem é decisão futura.
- Mudar o chat da IA: nenhum arquivo do módulo `chat` é alterado.
- Registrar o módulo no `AppModule`.

## Dependências

`205-mensagem-direta-fundacao` (em `done/`). Fontes: `modelagem.md`, `docs/SYSTEM.SPEC.md` §12 (`chat`), o contrato `ArmazenamentoDeChat` e os repositories do módulo `chat`.

## Riscos e Mitigação

- **Consulta que só falha no serviço real** (ordenar um `terms` por sub-agregação, `bucket_sort` dentro de `terms`, `filters` nomeados, `search_after` com data): o dublê não vê.
  Mitigação: a suíte de contrato cobre cada uma e é critério de aceite; sem rodá-la a task não fecha.
- **Divergência entre OpenSearch e Elasticsearch** (envelope `body`, `op_type`, erro de conflito): cada subclasse é fina e testada com o seu formato de resposta.
- **Relógio entre instâncias:** `created_date` é do servidor da API; duas instâncias com relógios diferentes podem ordenar mensagens do mesmo instante de forma estável, mas não
  causal. Caso aceito (já registrado na guarda-chuva); o desempate é o `mensagem_id`.
- **Limite da supervisão:** a lista agrega até 1.000 conversas e pagina em cima disso; passar disso exige outra estratégia (agregação `composite`) e é fora de escopo.
