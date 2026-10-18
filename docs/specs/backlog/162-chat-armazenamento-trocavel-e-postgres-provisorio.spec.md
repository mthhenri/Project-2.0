# Task 162 — Chat: armazenamento trocável e tabela provisória no Postgres

> Origem: conversa do autor em 2026-10-18 sobre o deploy de teste (Render + Cloudflare Pages + Supabase, sem custo mensal
> extra). Evolui a task 135 ([`135-chat-opensearch-e-repository-de-mensagens.spec.md`](../done/135-chat-opensearch-e-repository-de-mensagens.spec.md)),
> que já previa "trocar para Elasticsearch é mexer num lugar só".

## Objetivo

Deixar o armazenamento das mensagens do chat **trocável por configuração**, com três destinos que correspondem às três fases do
projeto, e entregar o segundo agora:

| Fase | Armazenamento | Valor de `CHAT_ARMAZENAMENTO` | Situação |
|---|---|---|---|
| Desenvolvimento | OpenSearch | `opensearch` (padrão) | existe (task 135) |
| Produção de teste (Render + Supabase) | tabelas **provisórias** no Postgres | `postgres` | **entrega desta task** |
| Produção de verdade | Elasticsearch | `elasticsearch` | **fora desta task** (só o ponto de troca fica pronto) |

A stack final do projeto é Angular + PrimeNG, NestJS, **Elasticsearch** (busca e histórico das conversas) e PostgreSQL. As tabelas
do Postgres existem só para manter a feature no ar no ambiente de teste sem custo e **devem ser removidas** na produção final.

## Entregáveis

### 1. Contrato único de armazenamento

- Uma interface `ArmazenamentoDeChat` (em `chat/repositories/`) com os métodos que o `ChatService` já usa do
  `ChatMensagemRepository`: `gravar`, `listarConversa`, `listarConversas`, `gravarTitulo`, `listarTitulos`, `buscar`. Sem método de
  exclusão nem de alteração de mensagem (mensagens continuam gravadas uma vez e nunca reescritas).
- Token de injeção `ARMAZENAMENTO_DE_CHAT`; `ChatService` e demais consumidores passam a depender do contrato, nunca de uma
  implementação. O tipo de retorno continua `ChatMensagemLida`/`BaldeConversa` (os de `chat-mensagem.documento.ts` e
  `chat-consultas.ts`); o Postgres devolve exatamente a mesma forma.
- A implementação atual vira `ChatMensagemOpenSearchRepository` (renomeada, **sem mudar comportamento**).
- Um provider escolhe a implementação por `CHAT_ARMAZENAMENTO` (`opensearch` | `postgres`). Valor desconhecido ou `elasticsearch`
  derruba a subida com mensagem clara ("armazenamento do chat não suportado"), não cai em outro silenciosamente.

### 2. Configuração

- `ConfigService`/`config.interface.ts`: `chat.armazenamento` (`CHAT_ARMAZENAMENTO`, padrão `opensearch`). `OPENSEARCH_URL` passa a
  ser obrigatória **só** quando o armazenamento é `opensearch`; com `postgres` o backend sobe sem nenhuma variável do OpenSearch.
- `.env.example` e a tabela de variáveis do `README.md` atualizados, com a nota de que `postgres` é provisório.

### 3. Tabelas provisórias (migration `0038`)

- Migration `0038 - Armazenamento provisório do chat em Postgres.sql` (`-- UP/-- DOWN`) criando `chat_mensagem` e `chat_conversa`,
  seguindo `docs/CONVENTIONS.md` (colunas de `BaseEntity`, sem `DEFAULT`, datas `created_date`). Colunas equivalentes aos campos dos
  índices (`mensagem_id` uuid, `conversa_id`, `usuario_id`, `contexto`, `autor`, `texto`, `nivel`, `modelo`, tokens, referências
  opcionais, `conteudo_bruto` jsonb) e `titulo` em `chat_conversa`.
- **Busca em português sem acento**, como no OpenSearch (`descricao` acha `descrição`): extensão `unaccent` (disponível no Supabase)
  e índice GIN sobre `to_tsvector('portuguese', ...)` com função `IMMUTABLE` própria para o `unaccent`. Índices por
  (`usuario_id`, `conversa_id`, `created_date`).
- **Marcação de provisório, em três lugares**: (a) comentário no topo da migration e `COMMENT ON TABLE` nas duas tabelas
  ("PROVISÓRIA: não existe na produção final, o histórico fica no Elasticsearch"); (b) seção própria em `docs/SCHEMA.md`
  ("Tabelas provisórias") dizendo que **não entram no modelo definitivo**; (c) nota em `docs/SYSTEM.SPEC.md` na seção da stack.
- **Remoção prevista:** no fim, uma migration nova derruba as duas tabelas (e a extensão, se nada mais a usar), apaga
  `ChatMensagemPostgresRepository` e o ramo `postgres` do provider. O `DOWN` desta migration já faz o drop. O procedimento
  fica escrito no README do módulo ou em `docs/SCHEMA.md`.

### 4. Implementação Postgres

- `ChatMensagemPostgresRepository` (SQL puro, parâmetros nomeados, aliases descritivos), no mesmo arquivo de contrato de testes
  da implementação do OpenSearch. Equivalências obrigatórias:
  - `listarConversa`: só do dono, ordem crescente de data, limite `LIMITE_CONVERSA`.
  - `listarConversas`: uma por `conversa_id` (contexto `CHAT`), da mais recente, com total, última data e primeira mensagem,
    limite `LIMITE_CONVERSAS`.
  - `buscar`: só do dono, todas as palavras (`AND`), mais relevante primeiro e depois mais recente, filtro opcional de período,
    limite `LIMITE_BUSCA`.
  - `gravarTitulo`/`listarTitulos`: título por conversa, só do dono; gravar de novo troca o título.
- Erro de banco vira a mesma `BusinessException` de "chat indisponível" do OpenSearch (o backend não cai).

### 5. Docs

- `SYSTEM.SPEC.md`: a stack final (Elasticsearch para as conversas) e a tabela das três fases acima. `CONTEXT.md`, `HISTORY.md`.
- `CLAUDE.md`/`AGENTS.md` (idênticos): ao fechar, tirar a menção de "no backlog" da 162.

## Critérios de Aceite

1. **Contrato**: uma suíte de testes de contrato roda **a mesma lista de cenários** contra as duas implementações (OpenSearch com
   cliente falso, como hoje; Postgres com repositório sobre banco de teste ou executor falso): isolamento por usuário, ordem,
   busca sem acento, filtro de período, conversas agrupadas por dia, título trocado.
2. `npm run test --workspace=backend` e `npm run build --workspace=backend` passam; os testes do `ChatService` não mudam de
   comportamento.
3. **Ao vivo com `CHAT_ARMAZENAMENTO=postgres`** (OpenSearch desligado, sem `OPENSEARCH_URL`): o backend sobe; conversa do dia,
   histórico lateral, busca "Buscar nas minhas conversas" (com e sem acento), título automático e retomada funcionam como com o
   OpenSearch; mensagens gravadas aparecem nas tabelas e **nenhuma** vai ao OpenSearch.
4. **Ao vivo com `opensearch`** (padrão): nada mudou para quem desenvolve.
5. Subir com `CHAT_ARMAZENAMENTO=elasticsearch` ou valor inválido falha com a mensagem clara.
6. `npm run db:migrate` aplica e `db:rollback` reverte a `0038` sem deixar rastro; `docs/SCHEMA.md` lista as tabelas como provisórias.
7. `npm run repo:verificar` passa.

## Fora de Escopo

- **Implementar o armazenamento Elasticsearch.** Fica para a hora da produção de verdade (spec própria): o cliente é outro
  (`@elastic/elasticsearch`, não o do OpenSearch), e a diferença de versão da API tem de ser avaliada lá. Esta task só deixa o
  ponto de troca (contrato + `CHAT_ARMAZENAMENTO`) e o valor reservado.
- Migrar mensagens entre armazenamentos (o ambiente de teste começa zerado) e usar dois armazenamentos ao mesmo tempo.
- Mudar o formato das mensagens, as ferramentas da IA ou a tela do chat.
- Qualquer configuração de deploy (Render, Cloudflare, Supabase); a task só garante que o backend sobe com `postgres`.

## Dependências

- 135 (repository atual), 138 e 141 (consumidores: conversa do dia, histórico, busca e título) em `done/`.
- `docs/CONVENTIONS.md` e `docs/SCHEMA.md` para a migration; skill `sql-migrations`.

## Riscos e Mitigação

- **A busca do Postgres ficar diferente da do OpenSearch** (radical, relevância): aceitável no ambiente de teste, mas os critérios
  de aceite fixam o comportamento observável (sem acento, todas as palavras, ordem); diferenças de relevância fina vão ao fecho.
- **A tabela provisória virar definitiva por esquecimento**: por isso a marcação tripla e o procedimento de remoção escritos junto
  da migration.
- **`unaccent` indisponível** no Postgres do ambiente: o `CREATE EXTENSION` falha na migration, o que é o sinal certo (a migration
  não finge funcionar sem busca sem acento).
