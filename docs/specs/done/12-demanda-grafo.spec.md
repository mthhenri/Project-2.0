# 12 — Módulo Demanda — Grafo de Conexões

**Depende de:** 11
**Entrega:** conexões entre demandas com prevenção de ciclos

---

## Objetivo

Implementar o grafo de conexões entre demandas via tabela `demanda_conexao`.
Conexões podem ser unidirecionais (A → B) ou bidirecionais (A ↔ B).
A service previne ciclos via CTE recursivo antes de qualquer inserção.

---

## DTOs a Adicionar em `shared/src/dtos/demanda/`

```typescript
// DemandaConexaoCriarDto.ts
export class DemandaConexaoCriarDto {
  @IsNumber() @Min(1)
  demandaDestinoId: number;

  @IsBoolean()
  ehBidirecional: boolean;
}

// DemandaConexaoCriadaDto.ts
export class DemandaConexaoCriadaDto {
  id: number;
  demandaOrigemId: number;
  demandaDestinoId: number;
  ehBidirecional: boolean;
  createdDate: Date;
}

// DemandaConexaoResumoDto.ts — item de listagem de conexões
export class DemandaConexaoResumoDto {
  id: number;
  demandaConectadaId: number;        // a outra demanda na conexão
  nomedemandaConectada: string;
  direcao: 'saida' | 'entrada' | 'bidirecional';
}
```

---

## Métodos a Adicionar ao Repository

```typescript
/**
 * Verifica se conectar origem → destino criaria um ciclo no grafo.
 * Usa CTE recursivo conforme SCHEMA.md.
 * Retorna true se criaria ciclo.
 */
async verificarCriariaCiclo(
  origemId: number,
  destinoId: number,
): Promise<boolean>

/**
 * Insere nova conexão entre demandas.
 */
async inserirConexao(dados: {
  demandaOrigemId: number;
  demandaDestinoId: number;
  ehBidirecional: boolean;
}): Promise<DemandaConexaoCriadaDto>

/**
 * Lista todas as conexões de uma demanda (saída, entrada bidirecional).
 */
async listarConexoes(demandaId: number): Promise<DemandaConexaoResumoDto[]>

/**
 * Remove uma conexão pelo ID (soft delete).
 */
async excluirConexao(conexaoId: number): Promise<void>

/**
 * Verifica se a conexão pertence à demanda informada (para autorização).
 */
async conexaoPertenceADemanda(
  conexaoId: number,
  demandaId: number,
): Promise<boolean>
```

### SQL de `verificarCriariaCiclo`

```sql
WITH RECURSIVE verificacao_ciclo AS (
  SELECT demanda_destino_id AS id
  FROM demanda_conexao
  WHERE demanda_origem_id = :destinoId
    AND is_deleted = false

  UNION ALL

  SELECT demanda_conexao_proxima.demanda_destino_id
  FROM demanda_conexao AS demanda_conexao_proxima
  INNER JOIN verificacao_ciclo
    ON demanda_conexao_proxima.demanda_origem_id = verificacao_ciclo.id
  WHERE demanda_conexao_proxima.is_deleted = false
)
SELECT EXISTS (
  SELECT 1 FROM verificacao_ciclo WHERE id = :origemId
) AS criaria_ciclo
```

### SQL de `listarConexoes`

Busca conexões onde a demanda é origem OU destino bidirecional:

```sql
SELECT
  demanda_conexao.id,
  demanda_conexao.demanda_origem_id,
  demanda_conexao.demanda_destino_id,
  demanda_conexao.eh_bidirecional,
  CASE
    WHEN demanda_conexao.demanda_origem_id = :demandaId THEN demanda_conexao.demanda_destino_id
    ELSE demanda_conexao.demanda_origem_id
  END AS demanda_conectada_id,
  demanda_conectada.nome AS nome_demanda_conectada,
  CASE
    WHEN demanda_conexao.eh_bidirecional = true THEN 'bidirecional'
    WHEN demanda_conexao.demanda_origem_id = :demandaId THEN 'saida'
    ELSE 'entrada'
  END AS direcao
FROM demanda_conexao
INNER JOIN demanda AS demanda_conectada
  ON demanda_conectada.id = CASE
    WHEN demanda_conexao.demanda_origem_id = :demandaId THEN demanda_conexao.demanda_destino_id
    ELSE demanda_conexao.demanda_origem_id
  END
  AND demanda_conectada.is_deleted = false
WHERE demanda_conexao.is_deleted = false
  AND (
    demanda_conexao.demanda_origem_id = :demandaId
    OR (demanda_conexao.demanda_destino_id = :demandaId AND demanda_conexao.eh_bidirecional = true)
  )
```

---

## Métodos a Adicionar ao Service

```typescript
async criarConexao(
  demandaOrigemId: number,
  dto: DemandaConexaoCriarDto,
  usuarioAtivo: JwtPayload,
): Promise<StandardResponse<DemandaConexaoCriadaDto>>

async listarConexoes(
  demandaId: number,
  usuarioAtivo: JwtPayload,
): Promise<StandardResponse<DemandaConexaoResumoDto[]>>

async excluirConexao(
  demandaId: number,
  conexaoId: number,
): Promise<StandardResponse<void>>
```

**Regras de `criarConexao`:**
1. Verificar que demanda origem existe
2. Verificar que demanda destino existe
3. Verificar que origem ≠ destino (mesmo que o banco já tenha CHECK constraint)
4. Verificar que não existe conexão ativa entre os dois no mesmo sentido
5. Executar `verificarCriariaCiclo` — se true, lançar `BusinessException('Essa conexão criaria um ciclo no grafo de demandas')`
6. Inserir a conexão

---

## Endpoints a Adicionar ao Controller

```
POST   /api/v1/demanda/:id/conexao             → criarConexao
GET    /api/v1/demanda/:id/conexao             → listarConexoes
DELETE /api/v1/demanda/:id/conexao/:conexaoId  @GestorOnly() → excluirConexao
```

---

## NÃO implementar nesta task

- Visualização do grafo completo (frontend)
- Análise de dependências em cascata
- Tags e atribuições (task 13)
