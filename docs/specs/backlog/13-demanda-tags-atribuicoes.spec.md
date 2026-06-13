# 13 — Módulo Demanda — Tags e Atribuições

**Depende de:** 12
**Entrega:** atribuição de tags e gerenciamento manual de usuários em demandas

---

## Objetivo

Completar o módulo de demandas com gerenciamento de tags (gestores) e
atribuições manuais de usuários (gestores). A auto-atribuição na criação
já foi implementada na task 10.

---

## DTOs a Adicionar em `shared/src/dtos/demanda/`

```typescript
// DemandaTagsAtribuirDto.ts — atribuir múltiplas tags de uma vez
export class DemandaTagsAtribuirDto {
  @IsArray() @IsNumber({}, { each: true })
  tagIds: number[];
}

// DemandaTagsAtribuidasDto.ts
export class DemandaTagsAtribuidasDto {
  demandaId: number;
  tags: TagResumoDto[];
}

// DemandaUsuarioAtribuirDto.ts — atribuir um usuário à demanda
export class DemandaUsuarioAtribuirDto {
  @IsNumber() @Min(1)
  usuarioId: number;
}

// DemandaUsuarioAtribuidoDto.ts
export class DemandaUsuarioAtribuidoDto {
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  login: string;
  tipo: UsuarioTipoEnum;
}

// DemandaMembroDto.ts — item de listagem de membros
export class DemandaMembroDto {
  usuarioId: number;
  nomeCompleto: string;
  login: string;
  tipo: UsuarioTipoEnum;
  cargoTitulo: string;
}
```

---

## Métodos a Adicionar ao Repository

```typescript
// Tags
async listarTagsDemanda(demandaId: number): Promise<TagResumoDto[]>
async atribuirTagsDemanda(demandaId: number, tagIds: number[]): Promise<void>
async removerTagDemanda(demandaId: number, tagId: number): Promise<void>

// Membros
async listarMembrosDemanda(demandaId: number): Promise<DemandaMembroDto[]>
async atribuirMembroDemanda(demandaId: number, usuarioId: number): Promise<void>
async removerMembroDemanda(demandaId: number, usuarioId: number): Promise<void>
async membroJaAtribuido(demandaId: number, usuarioId: number): Promise<boolean>
```

**`atribuirTagsDemanda`** deve sincronizar as tags:
- Remover (soft delete) as tags que não estão na nova lista
- Inserir as tags que ainda não existem
- Ignorar as que já existem e continuam na lista

---

## Métodos a Adicionar ao Service

```typescript
// Tags — apenas gestores
async atualizarTagsDemanda(
  demandaId: number,
  dto: DemandaTagsAtribuirDto,
): Promise<StandardResponse<DemandaTagsAtribuidasDto>>

async listarTagsDemanda(
  demandaId: number,
  usuarioAtivo: JwtPayload,
): Promise<StandardResponse<TagResumoDto[]>>

// Membros — apenas gestores gerenciam
async listarMembros(
  demandaId: number,
  usuarioAtivo: JwtPayload,
): Promise<StandardResponse<DemandaMembroDto[]>>

async atribuirMembro(
  demandaId: number,
  dto: DemandaUsuarioAtribuirDto,
): Promise<StandardResponse<DemandaUsuarioAtribuidoDto>>

async removerMembro(
  demandaId: number,
  usuarioId: number,
): Promise<StandardResponse<void>>
```

**Regras:**
- Verificar que todos os `tagIds` existem antes de atribuir
- Não permitir remover o último membro da demanda
- Não permitir remover gestor automaticamente atribuído (gestores são fixos via auto-atribuição — apenas o gestor pode remover a si mesmo explicitamente)
- Membro já atribuído → `BusinessException('Usuário já está atribuído a esta demanda')`

---

## Endpoints a Adicionar ao Controller

```
PUT    /api/v1/demanda/:id/tag        @GestorOnly() → atualizarTagsDemanda
GET    /api/v1/demanda/:id/tag                      → listarTagsDemanda

GET    /api/v1/demanda/:id/membro                   → listarMembros
POST   /api/v1/demanda/:id/membro     @GestorOnly() → atribuirMembro
DELETE /api/v1/demanda/:id/membro/:usuarioId @GestorOnly() → removerMembro
```

---

## NÃO implementar nesta task

- Tags de atividade (task 14)
- Notificação ao usuário atribuído
- Filtro de demandas por tag (pode ser adicionado ao DemandaListarDto futuramente)
