# Project 2.0

Sistema de controle de ponto e gestão de projetos para times de desenvolvimento.
Permite o registro de execuções com controle de tempo, gestão hierárquica de projetos
e demandas, e visualização de conexões entre demandas em grafo interativo.

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
| IA | Anthropic Claude (auxílio de descrições) |
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
| `npm run backend:dev` | Inicia o backend em modo watch |
| `npm run frontend:dev` | Inicia o frontend com proxy para o backend |
| `npm run db:migrate --workspace=backend` | Executa todas as migrations pendentes |
| `npm run db:rollback --workspace=backend` | Desfaz a última migration |

---

## Estrutura do Repositório

```
project-2.0/
  backend/          ← API NestJS
  frontend/         ← Aplicação Angular 21
  shared/           ← DTOs, Enums e Interfaces compartilhados
  docs/
    SYSTEM.SPEC.md  ← Constituição do projeto (leia antes de qualquer coisa)
    CONVENTIONS.md  ← Referência rápida de convenções de código
    SCHEMA.md       ← Schema SQL completo do banco de dados
    CONTEXT.md      ← Estado atual do projeto (atualizado após cada sessão)
    specs/
      backlog/      ← Tasks a implementar
      active/       ← Task em andamento
      done/         ← Tasks concluídas
```

---

## Arquitetura

O projeto é um monorepo com três pacotes independentes conectados via npm workspaces:

- **`shared/`** — pacote `@project20/shared` com DTOs, enums e interfaces. Importado pelo backend e pelo frontend, garantindo consistência de tipos entre as duas camadas sem duplicação.
- **`backend/`** — API REST em NestJS seguindo DDD simplificado: controller (burra) → service (inteligência de negócio) → repository (SQL bruto via Knex). Sem ORM.
- **`frontend/`** — SPA Angular 21 com standalone components, Signals para estado e PrimeNG para UI.

---

## Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `DB_HOST` | Host do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_NOME` | Nome do banco | `project20` |
| `DB_USUARIO` | Usuário do banco | `postgres` |
| `DB_SENHA` | Senha do banco | `postgres` |
| `JWT_SECRETO` | Secret do JWT (troque em produção) | `sua-chave-segura` |
| `JWT_EXPIRACAO` | Tempo de expiração do token | `8h` |
| `INTERVALO_MINIMO_MINUTOS` | Gap mínimo entre execuções para ser considerado intervalo | `15` |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic | `sk-ant-...` |
| `ANTHROPIC_MODELO` | Modelo Anthropic a usar | `claude-sonnet-4-6` |
| `ANTHROPIC_MAXIMO_TOKENS` | Máximo de tokens na resposta | `1024` |
| `APP_PORTA` | Porta do backend | `3000` |
| `APP_AMBIENTE` | Ambiente de execução | `development` |

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
6. Confirmar que o CONTEXT.md foi atualizado
7. Repetir para a próxima task
```

### Prompt padrão para o Claude Code

```
Leia os seguintes arquivos antes de qualquer coisa:
- docs/SYSTEM.SPEC.md
- docs/CONVENTIONS.md
- docs/CONTEXT.md

Task a implementar: docs/specs/active/[nome-da-task].spec.md

Ao finalizar, atualize docs/CONTEXT.md com o que foi feito
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
