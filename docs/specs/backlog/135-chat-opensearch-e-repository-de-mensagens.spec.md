# Task 135 — Chat: OpenSearch e repository de mensagens

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5 (1 de 6), e a seção "OpenSearch" da
> [`modelagem.md`](rework-chat-ia/modelagem.md). **Só armazenamento das mensagens.** Nada chama a IA aqui.

## Objetivo

Subir o OpenSearch no ambiente de desenvolvimento e criar o módulo `chat` do backend com o **repository único** que grava e
lê as mensagens do chat (índice `chat-mensagem`), de modo que trocar para Elasticsearch seja mexer num lugar só.

## Entregáveis

### 1. Ambiente

- `docker-compose.yml`: serviço `opensearch` (imagem `opensearchproject/opensearch:2`, nó único, segurança desligada **só em
  dev**, porta `9200`, volume próprio, limite de memória da JVM baixo, `healthcheck`). `npm run db:up` passa a subir os dois.
- `ConfigService`: `OPENSEARCH_URL` (obrigatória) e `OPENSEARCH_USUARIO`/`OPENSEARCH_SENHA` (opcionais, para ambiente com
  segurança ligada). `.env.example` e a tabela do `README.md` atualizados.

### 2. Shared

- Enums `AutorChatEnum` (`USUARIO`, `IA`, `SISTEMA`) e `ContextoChatEnum` (`CHAT`, `CHECKIN`); `NivelIaEnum` já existe (task 130).
- DTO de saída da mensagem (`ChatMensagemResumoDto`, conforme a skill `project20-dto-conventions`) com os campos da modelagem
  (autor, contexto, texto, nível, modelo, tokens, referências opcionais, data).

### 3. Backend (módulo `chat`)

- `ChatMensagemRepository`: **o único arquivo que importa o cliente do OpenSearch** (`@opensearch-project/opensearch`).
  - criação **idempotente** do índice `chat-mensagem` na subida, com o mapeamento da modelagem (`texto` com analisador
    `brazilian` mais subcampo `keyword`; `conteudo_bruto` com `enabled: false`);
  - `gravar(mensagem)` (documento gravado uma vez, nunca reescrito; sem método de exclusão por documento);
  - `listarConversa(conversaId)` em ordem de `created_date`;
  - `buscar(usuarioId, texto, inicio?, fim?)` com busca textual em português, sempre filtrada pelo dono;
  - `conversaId` é `<usuario_id>-<yyyy-mm-dd>` no fuso `APP_TIMEZONE`; a montagem fica numa função pura testada.
- OpenSearch fora do ar vira `BusinessException` com mensagem clara; **não derruba o backend** na subida (o chat fica
  indisponível, o resto do sistema segue).
- Testes (node:test): função do `conversaId` (virada de dia e fuso), montagem do documento e da consulta de busca com cliente
  falso; verificação real contra o container (gravar, listar, buscar com acento: "descricao" acha "descrição").

### 4. Documentação

- `docs/SYSTEM.SPEC.md` (módulo e variáveis), `docs/CONVENTIONS.md` se surgir convenção, `README.md` e `docs/context/`.

## Critérios de Aceite

- `npm run db:up` sobe Postgres e OpenSearch; o backend cria o índice uma vez (subir de novo não falha nem duplica).
- Gravar duas mensagens e listar a conversa devolve as duas, na ordem; buscar sem acento encontra texto acentuado.
- Com o OpenSearch parado, o backend sobe e responde às demais rotas; o repository falha com mensagem clara.
- Testes de `shared` e `backend` e builds passam; frontend sem alteração.

## Fora de Escopo

- Qualquer rota HTTP do chat (task 138), propostas (136) e a IA.
- Retenção, agregações de custo e o painel de tokens (ideias futuras da guarda-chuva).
- Configuração de produção do OpenSearch (segurança, réplicas): o `docker-compose` é de desenvolvimento.

## Dependências

Nenhuma (independente de 136 e 137). Bloqueia a 138 e a 140.

## Riscos e Mitigação

- O `docker-compose.yml` e o `scripts/db-up.mjs` já têm alterações locais do autor, ainda não commitadas: editar por cima delas
  e commitar só o que esta task muda, sem sobrescrever o resto.
- Máquinas com pouca memória: a JVM do OpenSearch pede heap fixo; deixar `OPENSEARCH_JAVA_OPTS` explícito no compose.
