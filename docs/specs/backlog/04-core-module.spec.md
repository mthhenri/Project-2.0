# 04 — Core Module

**Depende de:** 02
**Entrega:** BaseEntity, BaseRepository, exceptions, filtro global e interceptor de resposta

---

## Objetivo

Implementar toda a infraestrutura genérica que os módulos de negócio vão herdar e usar.
Tudo que está em `backend/src/core/` e não tem relação com nenhuma entidade específica.

---

## Arquivos a Implementar

```
backend/src/core/
  base/
    base.entity.ts
    base.repository.ts
  exceptions/
    business.exception.ts
    resource-not-found.exception.ts
    unauthorized-access.exception.ts
  filters/
    global-exception.filter.ts
  interceptors/
    response-format.interceptor.ts
  interfaces/
    standard-response.interface.ts   ← re-exporta do @project20/shared
    paginated-result.interface.ts     ← re-exporta do @project20/shared
  core.module.ts
```

---

## Implementação

### base.entity.ts

```typescript
export abstract class BaseEntity {
  id: number;
  createdDate: Date;
  updatedDate: Date;
  isDeleted: boolean;
  deletedDate: Date | null;
}
```

### base.repository.ts

```typescript
import { Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { DATABASE_CONNECTION } from '../database/database.provider';

export abstract class BaseRepository<TEntidade> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly conexaoBancoDados: Knex,
    protected readonly nomeTabela: string,
  ) {}

  /**
   * Executa uma query SQL e retorna os resultados tipados.
   */
  protected async executarConsulta<TResultado = TEntidade>(
    consultaSQL: string,
    parametros: Record<string, unknown> | unknown[] = {},
  ): Promise<TResultado[]> {
    const resultado = await this.conexaoBancoDados.raw(consultaSQL, parametros);
    return resultado.rows as TResultado[];
  }

  /**
   * Executa um comando SQL sem retorno de dados (INSERT sem RETURNING, UPDATE, etc).
   */
  protected async executarComando(
    consultaSQL: string,
    parametros: Record<string, unknown> | unknown[] = {},
  ): Promise<void> {
    await this.conexaoBancoDados.raw(consultaSQL, parametros);
  }

  /**
   * Executa soft delete na tabela do repositório.
   */
  protected async executarSoftDelete(identificador: number): Promise<void> {
    await this.executarComando(
      `UPDATE ${this.nomeTabela}
       SET is_deleted = true,
           deleted_date = NOW(),
           updated_date = NOW()
       WHERE id = :identificador`,
      { identificador },
    );
  }

  /**
   * Retorna cláusula SQL de paginação.
   */
  protected construirPaginacao(pagina: number, itensPorPagina: number): string {
    const deslocamento = (pagina - 1) * itensPorPagina;
    return `LIMIT ${itensPorPagina} OFFSET ${deslocamento}`;
  }

  /**
   * Retorna cláusula SQL de ordenação.
   */
  protected construirOrdenacao(
    campo: string,
    direcao: 'ASC' | 'DESC' = 'ASC',
  ): string {
    return `ORDER BY ${campo} ${direcao}`;
  }
}
```

### business.exception.ts

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(mensagem: string) {
    super(
      { sucesso: false, mensagem, dados: null, erros: [] },
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

### resource-not-found.exception.ts

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class ResourceNotFoundException extends HttpException {
  constructor(nomeEntidade: string) {
    super(
      { sucesso: false, mensagem: `${nomeEntidade} não encontrado`, dados: null, erros: [] },
      HttpStatus.NOT_FOUND,
    );
  }
}
```

### unauthorized-access.exception.ts

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class UnauthorizedAccessException extends HttpException {
  constructor(mensagem = 'Acesso não autorizado') {
    super(
      { sucesso: false, mensagem, dados: null, erros: [] },
      HttpStatus.FORBIDDEN,
    );
  }
}
```

### global-exception.filter.ts

Captura todas as exceções e formata na estrutura `StandardResponse`.
Trata especificamente:
- `HttpException` (BusinessException, ResourceNotFoundException, etc.)
- Erros de validação do `ValidationPipe` (array de mensagens em `erros`)
- Erros genéricos (500)

```typescript
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(excecao: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const resposta = contexto.getResponse<Response>();

    if (excecao instanceof HttpException) {
      const status = excecao.getStatus();
      const corpo = excecao.getResponse();

      if (typeof corpo === 'object' && 'sucesso' in (corpo as object)) {
        resposta.status(status).json(corpo);
        return;
      }

      // Erros de validação do ValidationPipe
      const erros = Array.isArray((corpo as any).message)
        ? (corpo as any).message
        : [(corpo as any).message];

      resposta.status(status).json({
        sucesso: false,
        dados: null,
        mensagem: 'Dados inválidos',
        erros,
      });
      return;
    }

    resposta.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      sucesso: false,
      dados: null,
      mensagem: 'Erro interno do servidor',
      erros: [],
    });
  }
}
```

### response-format.interceptor.ts

Encapsula respostas bem-sucedidas em `StandardResponse` automaticamente:

```typescript
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(contexto: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((dados) => {
        if (
          dados !== null &&
          typeof dados === 'object' &&
          'sucesso' in dados
        ) {
          return dados;
        }
        return {
          sucesso: true,
          dados,
          mensagem: 'Operação realizada com sucesso',
        };
      }),
    );
  }
}
```

### core.module.ts

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseFormatInterceptor } from './interceptors/response-format.interceptor';

@Module({
  providers: [
    { provide: APP_FILTER,      useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseFormatInterceptor },
  ],
})
export class CoreModule {}
```

Registrar `CoreModule` no `AppModule`.

---

## Interfaces

`standard-response.interface.ts` e `paginated-result.interface.ts` apenas
re-exportam do `@project20/shared`:

```typescript
export { StandardResponse } from '@project20/shared';
export { PaginatedResult } from '@project20/shared';
```

---

## NÃO implementar nesta task

- Nenhum módulo de negócio
- Nenhum guard de autenticação (task 07)
- Nenhum decorator customizado (task 07)
- ConfigModule (task 05)
