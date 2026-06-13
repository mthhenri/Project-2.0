# 00 — Monorepo + Docker

**Depende de:** nenhuma
**Entrega:** estrutura raiz do repositório funcional com banco rodando via Docker

---

## Objetivo

Configurar o monorepo com npm workspaces, Docker Compose com PostgreSQL 16
e os arquivos de configuração raiz. Nenhum código de aplicação nesta task.

---

## Arquivos a Criar

```
project-2.0/
  package.json
  docker-compose.yml
  .env
  .env.example
  .gitignore
  README.md
```

---

## Implementação

### package.json (raiz)

```json
{
  "name": "project-2.0",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["shared", "backend", "frontend"],
  "scripts": {
    "backend:dev": "npm run start:dev --workspace=backend",
    "frontend:dev": "npm run start --workspace=frontend",
    "db:up": "docker-compose up -d",
    "db:down": "docker-compose down"
  }
}
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: project20-postgres
    environment:
      POSTGRES_DB: ${DB_NOME}
      POSTGRES_USER: ${DB_USUARIO}
      POSTGRES_PASSWORD: ${DB_SENHA}
    ports:
      - "${DB_PORT}:5432"
    volumes:
      - postgres_dados:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_dados:
```

### .env e .env.example

Mesmo conteúdo — `.env` é ignorado pelo git, `.env.example` é versionado:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NOME=project20
DB_USUARIO=postgres
DB_SENHA=postgres

JWT_SECRETO=troque-em-producao-por-valor-seguro
JWT_EXPIRACAO=8h

INTERVALO_MINIMO_MINUTOS=15

ANTHROPIC_API_KEY=sk-ant-coloque-sua-chave-aqui
ANTHROPIC_MODELO=claude-sonnet-4-6
ANTHROPIC_MAXIMO_TOKENS=1024

APP_PORTA=3000
APP_AMBIENTE=development
```

### .gitignore

```
node_modules/
dist/
.env
*.js.map
coverage/
.DS_Store
```

### README.md

Apenas título, descrição de uma linha e comandos para rodar:
```
# Project 2.0
Sistema de controle de ponto e gestão de projetos.

## Iniciar
npm install
npm run db:up
npm run backend:dev
```

---

## NÃO implementar nesta task

- Nenhum código TypeScript
- Nenhuma configuração de NestJS ou Angular
- Nenhuma migration
- Nenhuma pasta `backend/`, `frontend/` ou `shared/` (criadas nas tasks seguintes)
