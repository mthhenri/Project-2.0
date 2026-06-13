# 15 — Módulo Execucao

**Depende de:** 14
**Entrega:** iniciar e encerrar execuções de tempo, com validação de concorrência

---

## Objetivo

Registros de tempo de trabalho. Usuário inicia uma execução em uma atividade
e a encerra quando termina. Nunca pode haver duas execuções ativas ao mesmo tempo
para o mesmo usuário. Gestores podem editar e encerrar execuções de desenvolvedores.

---

## DTOs a Criar em `shared/src/dtos/execucao/`

```typescript
// ExecucaoIniciarDto.ts
atividadeId: number   @IsNumber @Min(1)
descricao: string     @IsString @IsNotEmpty

// ExecucaoIniciadaDto.ts
id, atividadeId, descricao, inicioData, fimData (null), createdDate

// ExecucaoEncerrarDto.ts
descricao: string     @IsString @IsNotEmpty

// ExecucaoEncerradaDto.ts
id, atividadeId, descricao, inicioData, fimData, duracaoMinutos (calculado)

// ExecucaoAtualizarDto.ts — gestores podem editar descrição
descricao: string     @IsString @IsNotEmpty

// ExecucaoAtualizadaDto.ts = ExecucaoEncerradaDto

// ExecucaoListarDto.ts
atividadeId?: number  @IsOptional
usuarioId?: number    @IsOptional (apenas gestores podem filtrar por outro usuário)
data?: string         @IsOptional @IsDateString
pagina?, itensPorPagina?

// ExecucaoResumoDto.ts
id, atividadeId, nomeAtividade, descricao, inicioData, fimData, duracaoMinutos
usuarioId, nomeUsuario
```

---

## Model — `execucao.model.ts`

Campos: `id`, `atividadeId`, `descricao`, `inicioData`, `fimData`.
Mais os campos de BaseEntity.

---

## Repository — `execucao.repository.ts`

```typescript
async inserir(dados: {
  atividadeId: number;
  descricao: string;
  inicioData: Date;
}): Promise<ExecucaoIniciadaDto>

async encerrar(id: number, fimData: Date, descricao: string): Promise<ExecucaoEncerradaDto>

async buscarIdentificador(id: number): Promise<ExecucaoEncerradaDto | null>

async listar(filtros: ExecucaoListarDto, usuarioId?: number): Promise<{
  itens: ExecucaoResumoDto[];
  total: number;
}>

async buscarExecucaoAtiva(usuarioId: number): Promise<{
  id: number;
  atividadeId: number;
  inicioData: Date;
} | null>

async atualizar(id: number, descricao: string): Promise<ExecucaoAtualizadaDto>

async excluir(id: number): Promise<void>

/**
 * Busca o usuarioId associado a uma execução (via atividade.usuario_id).
 * Usado para autorização.
 */
async buscarUsuarioExecucao(execucaoId: number): Promise<number | null>
```

**`buscarExecucaoAtiva`** — query que verifica via JOIN com atividade:

```sql
SELECT
  execucao.id,
  execucao.atividade_id,
  execucao.inicio_data
FROM execucao
INNER JOIN atividade
  ON atividade.id = execucao.atividade_id
  AND atividade.is_deleted = false
WHERE execucao.fim_data IS NULL
  AND execucao.is_deleted = false
  AND atividade.usuario_id = :usuarioId
LIMIT 1
```

---

## Service — `execucao.service.ts`

```typescript
async iniciar(dto: ExecucaoIniciarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<ExecucaoIniciadaDto>>
async encerrar(id: number, dto: ExecucaoEncerrarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<ExecucaoEncerradaDto>>
async listar(filtros: ExecucaoListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PaginatedResult<ExecucaoResumoDto>>>
async recuperar(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<ExecucaoEncerradaDto>>
async atualizar(id: number, dto: ExecucaoAtualizarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<ExecucaoAtualizadaDto>>
async excluir(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<void>>
```

**Regras de `iniciar`:**
1. Verificar que a atividade existe
2. Verificar que `usuarioAtivo` tem acesso à demanda da atividade
3. `buscarExecucaoAtiva(usuarioAtivo.id)` — se existe → `BusinessException('Você já tem uma execução em andamento. Encerre-a antes de iniciar outra')`
4. Inserir com `inicioData = NOW()`

**Regras de `encerrar`:**
1. Buscar execução pelo ID
2. Se `fimData` já preenchido → `BusinessException('Esta execução já foi encerrada')`
3. Se desenvolvedor, verificar que é dono da atividade (`atividade.usuario_id = usuarioAtivo.id`)
4. Gestor pode encerrar qualquer execução
5. Encerrar com `fimData = NOW()`

**Regras de `listar`:**
- Desenvolvedor: só vê suas próprias execuções (filtra por `usuario_id` implicitamente)
- Gestor: pode filtrar por qualquer `usuarioId` ou ver todas

**Regras de `atualizar`:**
- Apenas gestores podem editar descrição de execuções de outros
- Desenvolvedor pode editar apenas as próprias

---

## Controller — `execucao.controller.ts`

```
POST   /api/v1/execucao              → iniciar
PATCH  /api/v1/execucao/:id/encerrar → encerrar
GET    /api/v1/execucao              → listar
GET    /api/v1/execucao/:id          → recuperar
PUT    /api/v1/execucao/:id          → atualizar
DELETE /api/v1/execucao/:id @GestorOnly() → excluir
```

---

## NÃO implementar nesta task

- Cálculo de intervalos (task 17 — ponto)
- Resumo diário (task 17 — ponto)
- Exportação de histórico
