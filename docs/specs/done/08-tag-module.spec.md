# 08 — Módulo Tag

**Depende de:** 07
**Entrega:** CRUD de tags com restrição a gestores

---

## Objetivo

Módulo simples de gerenciamento de tags. Tags são globais e podem ser
atribuídas a demandas e atividades. Apenas gestores criam, atualizam e excluem.
Todos os autenticados podem listar.

---

## DTOs a Criar em `shared/src/dtos/tag/`

```typescript
// TagCriarDto.ts
export class TagCriarDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  nome: string;

  @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor: string;
}

// TagCriadaDto.ts
export class TagCriadaDto {
  id: number;
  nome: string;
  cor: string;
  createdDate: Date;
}

// TagAtualizarDto.ts
export class TagAtualizarDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  nome?: string;

  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor?: string;
}

// TagAtualizadaDto.ts
export class TagAtualizadaDto extends TagCriadaDto {}

// TagResumoDto.ts — item de listagem
export class TagResumoDto {
  id: number;
  nome: string;
  cor: string;
}

// TagRecuperadaDto.ts
export class TagRecuperadaDto extends TagCriadaDto {}
```

---

## Model — `tag.model.ts`

```typescript
export class Tag extends BaseEntity {
  nome: string;
  cor: string;
}
```

---

## Repository — `tag.repository.ts`

```typescript
async existeNome(nome: string): Promise<boolean>
async inserir(dados: { nome: string; cor: string }): Promise<TagCriadaDto>
async buscarIdentificador(id: number): Promise<TagRecuperadaDto | null>
async listar(): Promise<TagResumoDto[]>
async atualizar(id: number, dados: Partial<Tag>): Promise<TagAtualizadaDto>
async excluir(id: number): Promise<void>
```

---

## Service — `tag.service.ts`

```typescript
async criar(dto: TagCriarDto): Promise<StandardResponse<TagCriadaDto>>
async listar(): Promise<StandardResponse<TagResumoDto[]>>
async recuperar(id: number): Promise<StandardResponse<TagRecuperadaDto>>
async atualizar(id: number, dto: TagAtualizarDto): Promise<StandardResponse<TagAtualizadaDto>>
async excluir(id: number): Promise<StandardResponse<void>>
```

Regras:
- Nome duplicado entre tags ativas → `BusinessException('Já existe uma tag com esse nome')`
- Tag não encontrada → `ResourceNotFoundException('Tag')`

---

## Controller — `tag.controller.ts`

```
POST   /api/v1/tag       @GestorOnly() → criar
GET    /api/v1/tag                     → listar (qualquer autenticado)
GET    /api/v1/tag/:id                 → recuperar
PUT    /api/v1/tag/:id   @GestorOnly() → atualizar
DELETE /api/v1/tag/:id   @GestorOnly() → excluir
```

---

## NÃO implementar nesta task

- Atribuição de tag a demanda ou atividade (tasks 10 e 14)
- Filtragem de demandas/atividades por tag
- Contagem de uso de cada tag
