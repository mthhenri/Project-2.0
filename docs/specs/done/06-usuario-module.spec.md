# 06 — Módulo Usuario

**Depende de:** 01, 02, 03, 04, 05
**Entrega:** CRUD completo de usuários com regras de negócio

---

## Objetivo

Implementar o módulo de usuários: DTOs no shared, model, repository com SQL bruto,
service com regras de negócio e controller. Sem guards de autenticação ainda —
eles são adicionados na task 07.

---

## DTOs a Criar em `shared/src/dtos/usuario/`

```typescript
// UsuarioCriarDto.ts
import { IsString, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { UsuarioTipoEnum } from '../../enums';

export class UsuarioCriarDto {
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsString() @MinLength(4)
  login: string;

  @IsString() @MinLength(8)
  senhaNaoEncriptada: string;

  @IsString() @IsNotEmpty() @MinLength(3)
  nomeCompleto: string;

  @IsString() @IsNotEmpty()
  cargoTitulo: string;

  @IsEnum(UsuarioTipoEnum)
  tipo: UsuarioTipoEnum;

  @IsNumber() @Min(1) @Max(24)
  horasDiariasNecessarias: number;
}

// UsuarioCriadoDto.ts — resposta de criação
export class UsuarioCriadoDto {
  id: number;
  login: string;
  nomeCompleto: string;
  cargoTitulo: string;
  tipo: UsuarioTipoEnum;
  status: UsuarioStatusEnum;
  horasDiariasNecessarias: number;
  createdDate: Date;
}

// UsuarioResumoDto.ts — item de listagem
export class UsuarioResumoDto {
  id: number;
  login: string;
  nomeCompleto: string;
  cargoTitulo: string;
  tipo: UsuarioTipoEnum;
  status: UsuarioStatusEnum;
}

// UsuarioRecuperadoDto.ts — busca individual (inclui mais campos)
export class UsuarioRecuperadoDto {
  id: number;
  login: string;
  nomeCompleto: string;
  cargoTitulo: string;
  anotacoes: string | null;
  tipo: UsuarioTipoEnum;
  status: UsuarioStatusEnum;
  horasDiariasNecessarias: number;
  createdDate: Date;
}

// UsuarioListarDto.ts — query params de listagem
export class UsuarioListarDto {
  @IsOptional() @IsEnum(UsuarioTipoEnum)
  tipo?: UsuarioTipoEnum;

  @IsOptional() @IsEnum(UsuarioStatusEnum)
  status?: UsuarioStatusEnum;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  pagina?: number = 1;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  itensPorPagina?: number = 20;
}

// UsuarioAtualizarDto.ts
export class UsuarioAtualizarDto {
  @IsOptional() @IsString() @MinLength(3)
  nomeCompleto?: string;

  @IsOptional() @IsString()
  cargoTitulo?: string;

  @IsOptional() @IsString()
  anotacoes?: string;

  @IsOptional() @IsNumber() @Min(1) @Max(24)
  horasDiariasNecessarias?: number;

  @IsOptional() @IsEnum(UsuarioStatusEnum)
  status?: UsuarioStatusEnum;
}

// UsuarioAtualizadoDto.ts — igual ao UsuarioRecuperadoDto
export class UsuarioAtualizadoDto extends UsuarioRecuperadoDto {}

// UsuarioSenhaAlterarDto.ts
export class UsuarioSenhaAlterarDto {
  @IsString() @MinLength(8)
  senhaAtual: string;

  @IsString() @MinLength(8)
  senhaNova: string;
}

// UsuarioSenhaAlteradaDto.ts
export class UsuarioSenhaAlteradaDto {
  mensagem: string;
}
```

Exportar tudo no `shared/src/dtos/usuario/index.ts`.

---

## Model — `backend/src/modules/usuario/domain/models/usuario.model.ts`

```typescript
import { BaseEntity } from '../../../../core/base/base.entity';
import { UsuarioTipoEnum, UsuarioStatusEnum } from '@project20/shared';

export class Usuario extends BaseEntity {
  login: string;
  senhaEncriptada: string;
  nomeCompleto: string;
  cargoTitulo: string;
  anotacoes: string | null;
  horasDiariasNecessarias: number;
  tipo: UsuarioTipoEnum;
  status: UsuarioStatusEnum;
}
```

---

## Repository — `usuario.repository.ts`

Métodos a implementar com SQL bruto:

```typescript
/** Verifica se login já existe entre registros ativos. */
async existeLogin(login: string): Promise<boolean>

/** Busca usuário pelo login (inclui senha para autenticação). */
async buscarLogin(login: string): Promise<Usuario | null>

/** Busca usuário por ID sem a senha. */
async buscarIdentificador(id: number): Promise<UsuarioRecuperadoDto | null>

/** Lista usuários com filtros e paginação. */
async listar(filtros: UsuarioListarDto): Promise<{ itens: UsuarioResumoDto[]; total: number }>

/** Insere novo usuário. Recebe senha já encriptada. */
async inserir(dados: {
  login: string;
  senhaEncriptada: string;
  nomeCompleto: string;
  cargoTitulo: string;
  tipo: UsuarioTipoEnum;
  horasDiariasNecessarias: number;
}): Promise<UsuarioCriadoDto>

/** Atualiza campos do usuário. */
async atualizar(id: number, dados: Partial<Usuario>): Promise<UsuarioAtualizadoDto>

/** Atualiza apenas a senha encriptada. */
async atualizarSenha(id: number, senhaEncriptada: string): Promise<void>

/** Soft delete do usuário. */
async excluir(id: number): Promise<void>

/** Lista todos os gestores ativos (usado na auto-atribuição de demandas). */
async listarGestoresAtivos(): Promise<{ id: number }[]>
```

Todos os INSERTs usam `SELECT ... RETURNING`.
Todos os SELECTs filtram `is_deleted = false`.

---

## Service — `usuario.service.ts`

Regras de negócio:

- **criar:** verificar login único → encriptar senha (bcrypt, rounds=10) → inserir
- **recuperar:** lançar `ResourceNotFoundException('Usuário')` se não encontrado
- **alterarSenha:** validar senha atual com `bcrypt.compare` → encriptar nova → atualizar
- **excluir:** verificar existência → soft delete

```typescript
async criar(dto: UsuarioCriarDto): Promise<StandardResponse<UsuarioCriadoDto>>
async listar(filtros: UsuarioListarDto): Promise<StandardResponse<PaginatedResult<UsuarioResumoDto>>>
async recuperar(id: number): Promise<StandardResponse<UsuarioRecuperadoDto>>
async atualizar(id: number, dto: UsuarioAtualizarDto): Promise<StandardResponse<UsuarioAtualizadoDto>>
async excluir(id: number): Promise<StandardResponse<void>>
async alterarSenha(id: number, dto: UsuarioSenhaAlterarDto): Promise<StandardResponse<UsuarioSenhaAlteradaDto>>
```

---

## Controller — `usuario.controller.ts`

```
POST   /api/v1/usuario          → criar
GET    /api/v1/usuario          → listar
GET    /api/v1/usuario/:id      → recuperar
PUT    /api/v1/usuario/:id      → atualizar
DELETE /api/v1/usuario/:id      → excluir
PATCH  /api/v1/usuario/:id/senha → alterarSenha
```

Sem guards ainda — adicionados na task 07.

---

## NÃO implementar nesta task

- Guards de autenticação (task 07)
- Foto/avatar de usuário
- Listagem de projetos do usuário (task 09)
- Anotações ricas com editor (frontend — task 21)
