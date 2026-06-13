# 02 — Backend Scaffold

**Depende de:** 00, 01
**Entrega:** projeto NestJS estruturado com Knex configurado e pronto para receber módulos

---

## Objetivo

Criar o projeto NestJS dentro de `backend/` com toda a estrutura de pastas definida
no SYSTEM.SPEC.md, instalar dependências e configurar o Knex como query layer.
Nenhum módulo de negócio implementado — apenas o esqueleto.

---

## Dependências a Instalar

```bash
# Produção
npm install @nestjs/core @nestjs/common @nestjs/platform-express reflect-metadata rxjs
npm install @nestjs/passport @nestjs/jwt passport passport-jwt
npm install knex pg
npm install class-validator class-transformer
npm install bcrypt
npm install @anthropic-ai/sdk
npm install @project20/shared

# Dev
npm install -D @nestjs/cli @nestjs/testing typescript ts-node
npm install -D @types/node @types/pg @types/bcrypt @types/passport-jwt
```

---

## Estrutura a Criar

```
backend/
  package.json
  tsconfig.json
  nest-cli.json
  knexfile.ts
  src/
    app.module.ts
    main.ts
    modules/
      autenticacao/
        autenticacao.module.ts         ← módulo vazio, será implementado na task 07
      usuario/
        usuario.module.ts              ← vazio
      projeto/
        projeto.module.ts              ← vazio
      demanda/
        demanda.module.ts              ← vazio
      atividade/
        atividade.module.ts            ← vazio
      execucao/
        execucao.module.ts             ← vazio
      ponto/
        ponto.module.ts                ← vazio
      calendario/
        calendario.module.ts           ← vazio
      tag/
        tag.module.ts                  ← vazio
      assistente/
        assistente.module.ts           ← vazio
    core/
      base/
        base.entity.ts                 ← implementado na task 04
        base.repository.ts             ← implementado na task 04
      exceptions/
        business.exception.ts          ← implementado na task 04
        resource-not-found.exception.ts
        unauthorized-access.exception.ts
      filters/
        global-exception.filter.ts     ← implementado na task 04
      interceptors/
        response-format.interceptor.ts ← implementado na task 04
      interfaces/
        standard-response.interface.ts ← importa do shared
        paginated-result.interface.ts  ← importa do shared
      database/
        database.module.ts             ← implementado nesta task
        database.provider.ts           ← implementado nesta task
    config/
      config.module.ts                 ← implementado na task 05
      config.service.ts                ← implementado na task 05
      config.interface.ts              ← implementado na task 05
```

---

## Implementação do Banco (Knex)

### knexfile.ts

```typescript
import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

const configuracao: Knex.Config = {
  client: 'pg',
  connection: {
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT),
    database: process.env.DB_NOME,
    user:     process.env.DB_USUARIO,
    password: process.env.DB_SENHA,
  },
  migrations: {
    directory: './src/database/migrations',
    extension: 'ts',
  },
};

export default configuracao;
```

### database.provider.ts

```typescript
import Knex from 'knex';
import configuracao from '../../../knexfile';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider = {
  provide: DATABASE_CONNECTION,
  useFactory: () => Knex(configuracao),
};
```

### database.module.ts

```typescript
import { Module, Global } from '@nestjs/common';
import { databaseProvider } from './database.provider';

@Global()
@Module({
  providers: [databaseProvider],
  exports:   [databaseProvider],
})
export class DatabaseModule {}
```

### main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function inicializar(): Promise<void> {
  const aplicacao = await NestFactory.create(AppModule);

  aplicacao.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  aplicacao.setGlobalPrefix('api/v1');

  const porta = process.env.APP_PORTA ?? 3000;
  await aplicacao.listen(porta);
}

inicializar();
```

### app.module.ts

Importa apenas DatabaseModule por enquanto. Os módulos de negócio
serão adicionados nas tasks seguintes:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './core/database/database.module';

@Module({
  imports: [DatabaseModule],
})
export class AppModule {}
```

---

## package.json do Backend

```json
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "db:migrate": "knex --knexfile knexfile.ts migrate:latest",
    "db:rollback": "knex --knexfile knexfile.ts migrate:rollback"
  },
  "dependencies": {
    "@project20/shared": "*"
  }
}
```

---

## NÃO implementar nesta task

- Nenhuma lógica de módulo de negócio
- Nenhuma migration (task 03)
- Nenhum core module além do DatabaseModule (task 04)
- Nenhum ConfigService (task 05)
- Os arquivos de módulo criados são apenas esqueletos com `@Module({})` vazio
