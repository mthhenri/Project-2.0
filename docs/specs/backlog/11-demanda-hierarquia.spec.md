# 11 — Módulo Demanda — Hierarquia

**Depende de:** 10
**Entrega:** queries recursivas de árvore de demandas

---

## Objetivo

Adicionar ao módulo de demandas a capacidade de navegar a hierarquia:
buscar todos os descendentes de uma demanda e todos os seus ancestrais.
Usa CTEs recursivos do PostgreSQL conforme documentado no SCHEMA.md.

---

## DTOs a Adicionar em `shared/src/dtos/demanda/`

```typescript
// DemandaArvoreItemDto.ts — nó da árvore
export class DemandaArvoreItemDto {
  id: number;
  nome: string;
  status: DemandaStatusEnum;
  prioridade: DemandaPrioridadeEnum;
  isEstrutural: boolean;
  horasEstimadas: number;
  nivel: number;           // profundidade na árvore (0 = raiz)
  filhos: DemandaArvoreItemDto[];
}

// DemandaAncestralDto.ts — item de lista de ancestrais (breadcrumb)
export class DemandaAncestralDto {
  id: number;
  nome: string;
  nivel: number;
}
```

---

## Métodos a Adicionar ao Repository

```typescript
/**
 * Retorna todos os descendentes de uma demanda em formato plano com nível.
 * Usa CTE recursivo conforme SCHEMA.md.
 */
async buscarDescendentes(demandaId: number): Promise<{
  id: number;
  demandaPaiId: number | null;
  nome: string;
  status: DemandaStatusEnum;
  prioridade: DemandaPrioridadeEnum;
  isEstrutural: boolean;
  horasEstimadas: number;
  nivel: number;
}[]>

/**
 * Retorna todos os ancestrais de uma demanda (do pai até a raiz).
 * Usa CTE recursivo invertido.
 */
async buscarAncestral(demandaId: number): Promise<DemandaAncestralDto[]>
```

### SQL de `buscarDescendentes`

```sql
WITH RECURSIVE arvore_demanda AS (
  SELECT id, demanda_pai_id, nome, status, prioridade, is_estrutural,
         horas_estimadas, 0 AS nivel
  FROM demanda
  WHERE id = :demandaId AND is_deleted = false

  UNION ALL

  SELECT demanda_filho.id, demanda_filho.demanda_pai_id, demanda_filho.nome,
         demanda_filho.status, demanda_filho.prioridade, demanda_filho.is_estrutural,
         demanda_filho.horas_estimadas, arvore_demanda.nivel + 1
  FROM demanda AS demanda_filho
  INNER JOIN arvore_demanda
    ON demanda_filho.demanda_pai_id = arvore_demanda.id
  WHERE demanda_filho.is_deleted = false
)
SELECT * FROM arvore_demanda ORDER BY nivel, nome
```

### SQL de `buscarAncestral`

```sql
WITH RECURSIVE ancestrais AS (
  SELECT id, demanda_pai_id, nome, 0 AS nivel
  FROM demanda
  WHERE id = :demandaId AND is_deleted = false

  UNION ALL

  SELECT demanda_pai.id, demanda_pai.demanda_pai_id, demanda_pai.nome,
         ancestrais.nivel + 1
  FROM demanda AS demanda_pai
  INNER JOIN ancestrais
    ON demanda_pai.id = ancestrais.demanda_pai_id
  WHERE demanda_pai.is_deleted = false
)
SELECT id, nome, nivel FROM ancestrais WHERE nivel > 0 ORDER BY nivel DESC
```

---

## Métodos a Adicionar ao Service

```typescript
/**
 * Retorna a árvore de descendentes como estrutura aninhada.
 * Converte a lista plana do repositório em árvore recursiva.
 */
async recuperarArvore(
  demandaId: number,
  usuarioAtivo: JwtPayload,
): Promise<StandardResponse<DemandaArvoreItemDto>>

/**
 * Retorna a lista de ancestrais em ordem do pai até a raiz (breadcrumb).
 */
async recuperarAncestral(
  demandaId: number,
  usuarioAtivo: JwtPayload,
): Promise<StandardResponse<DemandaAncestralDto[]>>
```

A conversão de lista plana para árvore aninhada é feita na service,
não no repositório — o repositório retorna apenas a lista com o campo `nivel`.

---

## Endpoints a Adicionar ao Controller

```
GET /api/v1/demanda/:id/arvore     → recuperarArvore
GET /api/v1/demanda/:id/ancestral  → recuperarAncestral
```

---

## NÃO implementar nesta task

- Mover demanda de posição na hierarquia (reparenting)
- Calcular horas totais acumuladas da árvore
- Grafo de conexões (task 12)
