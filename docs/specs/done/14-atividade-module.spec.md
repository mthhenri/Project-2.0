# 14 — Módulo Atividade

**Depende de:** 13
**Entrega:** CRUD de atividades com tags

---

## Objetivo

Atividades pertencem a demandas e são executadas por um usuário principal.
Múltiplos usuários podem criar execuções na mesma atividade.
Tags de atividade são gerenciadas por gestores.

---

## DTOs a Criar em `shared/src/dtos/atividade/`

```typescript
// AtividadeCriarDto.ts
demandaId: number         @IsNumber @Min(1)
nome: string              @IsString @MinLength(3) @MaxLength(255)
descricao?: string        @IsOptional @IsString
status: AtividadeStatusEnum @IsEnum
ordemExibicao: number     @IsNumber @Min(0)

// AtividadeCriadaDto.ts
id, demandaId, usuarioId, nome, descricao, status, ordemExibicao, createdDate

// AtividadeResumoDto.ts
id, nome, status, ordemExibicao, usuarioId, nomeUsuario

// AtividadeRecuperadaDto.ts
Todos os campos incluindo descricao completa

// AtividadeListarDto.ts
demandaId: number         @IsNumber (obrigatório)
status?: AtividadeStatusEnum @IsOptional
pagina?, itensPorPagina?

// AtividadeAtualizarDto.ts
nome?, descricao?, status?, ordemExibicao?  (todos opcionais)

// AtividadeAtualizadaDto.ts = AtividadeRecuperadaDto

// AtividadeTagsAtribuirDto.ts
tagIds: number[]   @IsArray @IsNumber({}, { each: true })

// AtividadeTagsAtribuidasDto.ts
atividadeId: number
tags: TagResumoDto[]
```

---

## Model — `atividade.model.ts`

Todos os campos da tabela `atividade`.

---

## Repository — `atividade.repository.ts`

```typescript
async inserir(dados: AtividadeInserirDados): Promise<AtividadeCriadaDto>
async buscarIdentificador(id: number): Promise<AtividadeRecuperadaDto | null>
async listar(filtros: AtividadeListarDto): Promise<{ itens: AtividadeResumoDto[]; total: number }>
async atualizar(id: number, dados: Partial<Atividade>): Promise<AtividadeRecuperadaDto>
async excluir(id: number): Promise<void>
async usuarioTemAcessoDemanda(demandaId: number, usuarioId: number): Promise<boolean>

// Tags
async listarTags(atividadeId: number): Promise<TagResumoDto[]>
async atualizarTags(atividadeId: number, tagIds: number[]): Promise<void>
```

---

## Service — `atividade.service.ts`

```typescript
async criar(dto: AtividadeCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<AtividadeCriadaDto>>
async listar(filtros: AtividadeListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PaginatedResult<AtividadeResumoDto>>>
async recuperar(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<AtividadeRecuperadaDto>>
async atualizar(id: number, dto: AtividadeAtualizarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<AtividadeRecuperadaDto>>
async excluir(id: number): Promise<StandardResponse<void>>
async atualizarTags(id: number, dto: AtividadeTagsAtribuirDto): Promise<StandardResponse<AtividadeTagsAtribuidasDto>>
async listarTags(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<TagResumoDto[]>>
```

**Regras:**
- `criar`: usuário (criador) é automaticamente definido como `usuarioAtivo.id`
- `criar`: verificar que a demanda existe e o usuário tem acesso a ela (via `demanda_usuario`)
- `atualizar`: desenvolvedor só pode atualizar atividades da sua própria autoria (`usuarioId = usuarioAtivo.id`) ou onde está atribuído à demanda
- `excluir`: apenas gestores (protegido no controller)
- `atualizarTags`: apenas gestores

---

## Controller — `atividade.controller.ts`

```
POST   /api/v1/atividade              → criar
GET    /api/v1/atividade              → listar (query param demandaId obrigatório)
GET    /api/v1/atividade/:id          → recuperar
PUT    /api/v1/atividade/:id          → atualizar
DELETE /api/v1/atividade/:id @GestorOnly() → excluir
PUT    /api/v1/atividade/:id/tag @GestorOnly() → atualizarTags
GET    /api/v1/atividade/:id/tag      → listarTags
```

---

## NÃO implementar nesta task

- Execuções da atividade (task 15)
- Cálculo de horas da atividade (derivado das execuções)
- Reassignment do usuário executor
