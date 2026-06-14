# 09 — Módulo Projeto

**Depende de:** 07
**Entrega:** CRUD de projetos com regras de acesso por tipo de usuário

---

## Objetivo

Módulo de projetos. Apenas gestores criam. A listagem é diferente por tipo:
gestores veem todos os projetos; desenvolvedores veem apenas projetos onde
têm ao menos uma demanda atribuída em `demanda_usuario`.

Não existe tabela `projeto_usuario` — o acesso é sempre derivado.

---

## DTOs a Criar em `shared/src/dtos/projeto/`

```typescript
// ProjetoCriarDto.ts
export class ProjetoCriarDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  nome: string;

  @IsString() @IsNotEmpty() @MaxLength(50)
  @Transform(({ value }) => value?.toUpperCase().trim())
  codigo: string;

  @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor: string;

  @IsEnum(ProjetoStatusEnum)
  status: ProjetoStatusEnum;

  @IsOptional() @IsDateString()
  inicioData?: string;

  @IsOptional() @IsDateString()
  previsaoFimData?: string;
}

// ProjetoCriadoDto.ts
export class ProjetoCriadoDto {
  id: number;
  nome: string;
  codigo: string;
  cor: string;
  status: ProjetoStatusEnum;
  inicioData: string | null;
  previsaoFimData: string | null;
  createdDate: Date;
}

// ProjetoResumoDto.ts — item de listagem
export class ProjetoResumoDto {
  id: number;
  nome: string;
  codigo: string;
  cor: string;
  status: ProjetoStatusEnum;
}

// ProjetoRecuperadoDto.ts
export class ProjetoRecuperadoDto extends ProjetoCriadoDto {}

// ProjetoListarDto.ts
export class ProjetoListarDto {
  @IsOptional() @IsEnum(ProjetoStatusEnum)
  status?: ProjetoStatusEnum;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  pagina?: number = 1;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  itensPorPagina?: number = 20;
}

// ProjetoAtualizarDto.ts
export class ProjetoAtualizarDto {
  @IsOptional() @IsString() @MinLength(3)
  nome?: string;

  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor?: string;

  @IsOptional() @IsEnum(ProjetoStatusEnum)
  status?: ProjetoStatusEnum;

  @IsOptional() @IsDateString()
  inicioData?: string;

  @IsOptional() @IsDateString()
  previsaoFimData?: string;
}

// ProjetoAtualizadoDto.ts
export class ProjetoAtualizadoDto extends ProjetoRecuperadoDto {}
```

---

## Model — `projeto.model.ts`

```typescript
export class Projeto extends BaseEntity {
  nome: string;
  codigo: string;
  cor: string;
  status: ProjetoStatusEnum;
  inicioData: Date | null;
  previsaoFimData: Date | null;
}
```

---

## Repository — `projeto.repository.ts`

```typescript
/** Verifica se código já existe entre projetos ativos. */
async existeCodigo(codigo: string): Promise<boolean>

/** Insere novo projeto. */
async inserir(dados: ProjetoCriarDados): Promise<ProjetoCriadoDto>

/** Busca projeto por ID. */
async buscarIdentificador(id: number): Promise<ProjetoRecuperadoDto | null>

/** Lista todos os projetos ativos (para gestores). */
async listarTodos(filtros: ProjetoListarDto): Promise<{ itens: ProjetoResumoDto[]; total: number }>

/**
 * Lista projetos onde o usuário tem ao menos uma demanda atribuída (para desenvolvedores).
 * Query usa JOIN demanda → demanda_usuario filtrando pelo usuarioId.
 */
async listarPorUsuario(
  usuarioId: number,
  filtros: ProjetoListarDto,
): Promise<{ itens: ProjetoResumoDto[]; total: number }>

/** Atualiza projeto. Código não pode ser alterado. */
async atualizar(id: number, dados: Partial<Projeto>): Promise<ProjetoAtualizadoDto>

/** Soft delete do projeto. */
async excluir(id: number): Promise<void>
```

Query de `listarPorUsuario` (sem alias abreviado):

```sql
SELECT DISTINCT
  projeto.id,
  projeto.nome,
  projeto.codigo,
  projeto.cor,
  projeto.status
FROM projeto
INNER JOIN demanda
  ON demanda.projeto_id = projeto.id
  AND demanda.is_deleted = false
INNER JOIN demanda_usuario
  ON demanda_usuario.demanda_id = demanda.id
  AND demanda_usuario.is_deleted = false
WHERE projeto.is_deleted = false
  AND demanda_usuario.usuario_id = :usuarioId
ORDER BY projeto.nome
```

---

## Service — `projeto.service.ts`

```typescript
async criar(dto: ProjetoCriarDto): Promise<StandardResponse<ProjetoCriadoDto>>
async listar(filtros: ProjetoListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PaginatedResult<ProjetoResumoDto>>>
async recuperar(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<ProjetoRecuperadoDto>>
async atualizar(id: number, dto: ProjetoAtualizarDto): Promise<StandardResponse<ProjetoAtualizadoDto>>
async excluir(id: number): Promise<StandardResponse<void>>
```

Regras:
- `criar`: código duplicado → `BusinessException('Código de projeto já está em uso')`
- `listar`: se `usuarioAtivo.tipo === GESTOR` → `listarTodos`, senão → `listarPorUsuario`
- `recuperar`: desenvolvedor sem acesso ao projeto → `ResourceNotFoundException('Projeto')`
  (não revelar que o projeto existe, apenas que não foi encontrado)
- `previsaoFimData` deve ser posterior a `inicioData` quando ambas fornecidas

---

## Controller — `projeto.controller.ts`

```
POST   /api/v1/projeto       @GestorOnly() → criar
GET    /api/v1/projeto                     → listar (resultado varia por tipo)
GET    /api/v1/projeto/:id                 → recuperar
PUT    /api/v1/projeto/:id   @GestorOnly() → atualizar
DELETE /api/v1/projeto/:id   @GestorOnly() → excluir
```

O `@ActiveUser()` é injetado nos métodos `listar` e `recuperar` para
determinar o escopo de acesso.

---

## NÃO implementar nesta task

- Demandas do projeto (task 10)
- Estatísticas de horas do projeto
- Listagem de membros do projeto (derivada das demandas)
