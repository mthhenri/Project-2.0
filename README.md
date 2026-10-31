# Project 2.0

Plataforma interna para gestão de times de desenvolvimento, com controle de acesso por papel
(administrador, gestor e desenvolvedor).

- **Projetos, demandas e atividades:** hierarquia de demandas com grafo interativo de conexões,
  documentação em Markdown, tags, volume de trabalho esperado × gasto e planejamento de demandas.
- **Execuções e ponto:** registro de execuções com controle de tempo, ponto diário com meta,
  justificativas, calendário de dias não úteis e relatórios.
- **Chat com IA:** assistente (Claude, com fallback para Gemini e OpenAI) que responde dúvidas,
  planeja demandas, propõe alterações com diff para aprovação e faz check-in durante a execução.
- **Chat entre colaboradores:** mensagens diretas com tempo real, menções, referências a
  demandas/atividades e blocos de código.
- **Project Desktop:** app Electron com janela própria, bandeja, atalho global e janelinha de check-in.

**Stack:** NestJS + Angular 21 + PostgreSQL, em monorepo com npm workspaces, desenvolvido com
Spec-Driven Development e agentes de código (Claude Code e Codex).

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Angular 21 + PrimeNG 21 |
| Banco de Dados | PostgreSQL 16 |
| Query Layer | Knex.js (SQL bruto — sem ORM) |
| Pacote Compartilhado | npm workspaces (`@project20/shared`) |
| Estilos | SCSS + Tailwind CSS + BEM |
| Visualização | D3.js (force simulation) |
| IA | Anthropic Claude, com fallback para Google Gemini e OpenAI |
| Armazenamento do chat | OpenSearch (dev), PostgreSQL (provisório) ou Elasticsearch (produção) |
| Desktop | Electron (`desktop/`) |
| Testes | Node test runner (shared, backend, desktop) e Vitest (frontend) |
| Containers | Docker + Docker Compose |

---

## Pré-requisitos

- Node.js 20+
- Docker + Docker Compose
- npm 10+

---

## Como Rodar

### 1. Clone e instale as dependências

```bash
git clone <url-do-repositorio>
cd project-2.0
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com os valores do seu ambiente
```

### 3. Suba o banco de dados

```bash
npm run db:up
```

### 4. Execute as migrations

```bash
npm run db:migrate --workspace=backend
```

> **Usuário gestor inicial:** as migrations criam (via seed idempotente) um gestor
> para o primeiro acesso ao sistema:
>
> | Login | Senha |
> |---|---|
> | `gestor.inicial` | `project2026` |
>
> Troque a senha após o primeiro login. Em produção, recomenda-se remover ou
> desativar esse usuário.

> **Dados de teste (opcional, só dev):** `npm run db:seed-dev` cria o projeto `DEMO` com demandas,
> atividades e uma conexão, e o desenvolvedor `dev.teste` / `project2026` já atribuído a elas.
> É idempotente e recusa rodar com `APP_AMBIENTE=production` ou `DB_SSL=true`.

**Histórico fictício completo (manual, só development):** depois das migrations, execute
`npm run db:seed-historico --workspace=backend`. Exige `APP_AMBIENTE=development` no `.env`,
recusa `NODE_ENV=production` e `DB_SSL=true`. Não roda automaticamente.
Cria `DEV-PORTAL`, `DEV-ESTOQUE`, `DEV-AGENDA`, seis devs, 21 demandas, 108 atividades,
15 conexões e execuções encerradas dos últimos 90 dias (dias úteis, dois períodos de 3h).
Logins: `dev.mateus.henrique`, `dev.mateus.caranguejo`, `dev.mateus.nebuloso`,
`dev.mateus.parafuso`, `dev.mateus.trovao`, `dev.mateus.abacaxi`; senha fictícia: `project2026`.
Preserva o gestor inicial e o seed mínimo. Se projetos, usuários, demandas e atividades já existem, não faz nada;
colisões parciais cancelam toda a transação. Não repara um cenário alterado manualmente.
O SQL fica em `backend/src/database/scripts/seed-historico-desenvolvimento.sql`;
o executor passa uma indicação de ambiente válida somente na transação. Essa indicação
não autentica o ambiente do servidor: use o executor com a configuração do banco local.

O comando de histórico também semeia **12 conversas e 72 mensagens entre colaboradores** no
OpenSearch: seis entre devs e seis com o administrador inicial, incluindo Markdown, código e respostas.
Exige OpenSearch HTTP local na porta 9200 (`OPENSEARCH_URL`) e PostgreSQL local;
`CHAT_ARMAZENAMENTO` deve ser `opensearch` ou omitido (padrão). Mensagens usam IDs estáveis,
e a repetição confere o conteúdo existente. Se o PostgreSQL tiver sido recriado e houver conflito
com o histórico antigo, o comando recusa a divergência em vez de ocultá-la.
As datas fictícias se ancoram no cadastro histórico dos devs, inclusive na conversa com o
administrador de bootstrap, que as migrations recriam com data atual.

Para carregar somente as conversas, depois do cenário SQL:

```bash
npm run db:seed-conversas --workspace=backend
```

Para **apagar o histórico local de chat e recriar seus índices**, explicitamente:

```bash
npm run db:seed-conversas --workspace=backend -- --limpar-opensearch
```

Essa opção apaga somente `chat-mensagem`, `chat-conversa` e `mensagem-direta`, recria os
mapeamentos canônicos e semeia as conversas fictícias. O histórico de IA fica vazio.
Não apaga volumes, índices internos do OpenSearch nem altera o PostgreSQL. A execução comum
nunca limpa índices. PostgreSQL e OpenSearch não compartilham transação: em falha, corrigir
a causa e repetir o seed; a limpeza explícita pode apagar mensagens já carregadas.

### 5. Inicie o backend e o frontend

```bash
# Em terminais separados
npm run backend:dev
npm run frontend:dev
```

O backend sobe em `http://localhost:3000` e o frontend em `http://localhost:4200`.

---

## Scripts Disponíveis

| Script | O que faz |
|---|---|
| `npm run db:up` | Sobe o PostgreSQL via Docker Compose |
| `npm run db:down` | Para o PostgreSQL |
| `npm run dev` | Inicia backend e frontend juntos |
| `npm test` | Testes do shared, do backend e dos scripts de repositório |
| `npm run test:integracao` | Testes dos repositories contra o PostgreSQL de teste (precisa do banco no ar) |
| `npm run repo:verificar` | Confere a organização de specs/artefatos e os espelhos `AGENTS.md`/`CLAUDE.md` e `.claude/.agents` |
| `npm run backend:dev` | Inicia o backend em modo watch |
| `npm run frontend:dev` | Inicia o frontend com proxy para o backend |
| `npm run start --workspace=desktop` | Abre o Project Desktop (Electron) apontando para o front |
| `npm run pack --workspace=desktop` | Gera o executável portátil do Project Desktop em `desktop/release/` |
| `npm run db:migrate --workspace=backend` | Executa todas as migrations pendentes |
| `npm run db:rollback --workspace=backend` | Desfaz a última migration |
| `npm run db:converter-descricoes --workspace=backend` | Conversão única do HTML do Quill para Markdown (task 123): dry-run por padrão; veja o procedimento abaixo |

### Conversão do HTML do Quill para Markdown (uma vez por ambiente)

Os campos de texto rico (`demanda.descricao_cliente`, `descricao_tecnica`, `documentacao` e o pad, `anotacao.texto`) eram HTML
do Quill e passam a ser Markdown. A conversão **não é reversível** e deve ser aplicada **junto com a publicação da task 124**
(com o código novo no ar e dados em HTML, o HTML aparece como texto; com os dados convertidos e o código antigo, o Quill mostra
Markdown cru).

1. `npm run db:converter-descricoes --workspace=backend` — dry-run: conta, mostra antes/depois e lista as perdas
   (sublinhado, imagens e links com esquema fora de `http`/`https`/`mailto`). Não altera nada.
2. Backup: `pg_dump` do banco.
3. `npm run db:converter-descricoes --workspace=backend -- --aplicar --confirmo-backup` — converte numa transação
   (cada `UPDATE` confere o valor lido).
4. Rodar de novo converte zero linhas (só converte o que parece saída do Quill).

**Ordem em ambiente com dados antigos:** a migration `0031` (task 126) copia `usuario.anotacoes` para a seção "Pessoal" do pad e a `0032`
(task 128) remove a coluna, **parando com erro** se algum texto ficaria sem cópia. Ambas rodam no `db:migrate`. O pad que veio em HTML é
convertido pelo mesmo script (alvo `anotacao.texto`), antes ou depois das migrations; a coluna antiga deixou de ser alvo.

---

## Estrutura do Repositório

```
project-2.0/
  backend/          ← API NestJS
  frontend/         ← Aplicação Angular 21
  desktop/          ← Project Desktop (Electron): janela própria para o front
  scripts/          ← repo:verificar, impacto e hook de agente
  shared/           ← DTOs, Enums e Interfaces compartilhados
  docs/
    SYSTEM.SPEC.md  ← Constituição do projeto (leia antes de qualquer coisa)
    CONVENTIONS.md  ← Referência rápida de convenções de código
    SCHEMA.md       ← Schema SQL completo do banco de dados
    DEPLOY.md       ← Publicação e operação
    context/        ← CONTEXT (estado atual), HISTORY, PROBLEMS, MEMORY e IDEAS
    specs/
      backlog/      ← Tasks a implementar
      active/       ← Task em andamento
      done/         ← Tasks concluídas
```

---

## Arquitetura

O projeto é um monorepo com quatro workspaces conectados via npm workspaces:

- **`shared/`** — pacote `@project20/shared` com DTOs, enums e interfaces. Importado pelo backend e pelo frontend, garantindo consistência de tipos entre as duas camadas sem duplicação.
- **`backend/`** — API REST em NestJS seguindo DDD simplificado: controller (burra) → service (inteligência de negócio) → repository (SQL bruto via Knex). Sem ORM.
- **`frontend/`** — SPA Angular 21 com standalone components, Signals para estado e PrimeNG para UI.
- **`desktop/`** — Project Desktop (Electron): abre o front numa janela própria, com bandeja, atalho global do chat e janelinha de check-in. Veja `desktop/README.md`.

---

## Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `DB_HOST` | Host do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL | `5433` |
| `DB_NOME` | Nome do banco | `project20` |
| `DB_USUARIO` | Usuário do banco | `postgres` |
| `DB_SENHA` | Senha do banco | `postgres` |
| `DB_SSL` | Opcional: `true` liga SSL na conexão (bancos gerenciados); omitido = sem SSL | `false` |
| `DB_NOME_TESTE` | Opcional: banco dos testes de integração (`npm run test:integracao`); omitido = `<DB_NOME>_teste`, criado e migrado sozinho no mesmo PostgreSQL. O helper recusa o banco de desenvolvimento | `project20_teste` |
| `JWT_SECRETO` | Secret do JWT (troque em produção) | `sua-chave-segura` |
| `JWT_EXPIRACAO` | Tempo de expiração do token | `7d` |
| `INTERVALO_MINIMO_MINUTOS` | Gap mínimo entre execuções para ser considerado intervalo | `15` |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (opcional: sem ela a IA fica "fora do ar"). O modelo de cada nível e o resto da configuração da IA ficam na tela Configurações da IA, não no `.env` | `sk-ant-...` |
| `GOOGLE_API_KEY` / `OPENAI_API_KEY` | Chaves do Gemini e da OpenAI (opcionais): só servem para o fallback entre provedores, escolhido em Configurações da IA. Sem a chave, o provedor é pulado na cadeia | `sk-...` |
| `CHAT_ARMAZENAMENTO` | Onde ficam as mensagens do chat: `opensearch` (desenvolvimento, padrão) ou `postgres` (tabelas **provisórias** para a produção de teste, sem serviço de busca) ou `elasticsearch` (produção de verdade) | `opensearch` |
| `CHAT_EVENTOS` | Por onde os eventos do chat entre colaboradores (mensagem nova, "Lida", online) chegam a todas as instâncias da API: `memoria` (desenvolvimento, padrão; só uma instância) ou `postgres` (`LISTEN`/`NOTIFY`; obrigatório com mais de uma instância). |
| `OPENSEARCH_URL` | Endereço do OpenSearch (sobe com `npm run db:up`); obrigatório só com `CHAT_ARMAZENAMENTO=opensearch` | `http://localhost:9200` |
| `OPENSEARCH_USUARIO` / `OPENSEARCH_SENHA` | Opcionais: só se o servidor tiver segurança ligada | — |
| `ELASTICSEARCH_URL` | Endereço do Elasticsearch; obrigatório só com `CHAT_ARMAZENAMENTO=elasticsearch`. Para testar localmente: `docker compose --profile elasticsearch up -d elasticsearch` (porta 9201, não sobe com `npm run db:up`) | `http://localhost:9201` |
| `ELASTICSEARCH_API_KEY` / `ELASTICSEARCH_USUARIO` / `ELASTICSEARCH_SENHA` | Autenticação do Elasticsearch: chave de API (Elastic Cloud, tem prioridade) ou usuário e senha; sem nenhuma, conecta sem autenticar | — |
| `PORT` | Opcional: porta injetada pela plataforma de hospedagem; tem prioridade sobre `APP_PORTA` | `10000` |
| `APP_PORTA` | Porta do backend | `3000` |
| `APP_AMBIENTE` | Ambiente de execução | `development` |
| `APP_TIMEZONE` | Fuso da aplicação — fixa a sessão do banco (colunas `timestamptz`) e determina o horário local (23:59:59) do disparo do auto-stop de execuções na virada do dia; default `America/Sao_Paulo` | `America/Sao_Paulo` |
| `TZ` | Opcional: fuso do processo Node (logs e exibição local); a correção de fuso do banco depende de `APP_TIMEZONE`, não dela | `America/Sao_Paulo` |
| `APP_CORS_ORIGEM` | Opcional: origem permitida no CORS (URL do frontend); vazio libera qualquer origem (só em dev) | `https://seu-front.pages.dev` |

---

## Workflow de Desenvolvimento — SDD

Este projeto usa **Spec-Driven Development**: toda funcionalidade é especificada
antes de ser implementada. O Claude Code lê as specs e implementa. O Claude.ai
(esta conversa) escreve e revisa as specs.

### Fluxo por task

```
1. Revisar a próxima spec em docs/specs/backlog/
2. Mover a spec para docs/specs/active/
3. Abrir o Claude Code na raiz do projeto com o prompt padrão abaixo
4. Revisar o código gerado
5. Mover a spec para docs/specs/done/
6. Confirmar que o docs/context/ foi atualizado (HISTORY e as seções afetadas do CONTEXT)
7. Repetir para a próxima task
```

### Prompt padrão para o Claude Code

```
Leia os seguintes arquivos antes de qualquer coisa:
- docs/SYSTEM.SPEC.md
- docs/CONVENTIONS.md
- docs/context/CONTEXT.md

Task a implementar: docs/specs/active/[nome-da-task].spec.md

Ao finalizar, registre a narrativa em docs/context/HISTORY.md e atualize as seções afetadas de docs/context/CONTEXT.md
e mova a spec de active/ para done/.
```

### Regra principal

O `SYSTEM.SPEC.md` é a constituição do projeto — toda decisão técnica relevante
está documentada lá. Em caso de dúvida durante a implementação, o arquivo tem
precedência sobre qualquer outra fonte.

---

## Convenções Rápidas

- **Idioma:** português para código de negócio, inglês para padrões genéricos/arquiteturais
- **DTOs:** `EntidadeComplementoVerboDto` (ex: `UsuarioSenhaAlterarDto`)
- **SQL:** parâmetros nomeados (`:nome`), INSERT com SELECT, sem DEFAULT, sem aliases abreviados
- **Banco:** soft delete em tudo (`is_deleted`), campos de data seguem `[contexto]_date` ou `[contexto]_data`
- **Controllers:** burras — só repassa para a service
- **Estilos:** SCSS + Tailwind + BEM

Para a referência completa: `docs/CONVENTIONS.md`
