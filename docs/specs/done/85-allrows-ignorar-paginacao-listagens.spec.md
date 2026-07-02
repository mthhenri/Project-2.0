# Task 85 — shared/backend: allRows — Ignorar Paginação nas Listagens

## Objetivo

Adicionar um campo booleano opcional `allRows?: boolean` nos DTOs de filtro de todas as
listagens paginadas do sistema. Quando `allRows = true`, o backend retorna **todos** os
registros sem aplicar `LIMIT`/`OFFSET`, mantendo a estrutura de resposta `PaginatedResult<T>`
inalterada.

---

## Contexto

Hoje todas as listagens usam paginação server-side com `LIMIT`/`OFFSET`. Em alguns fluxos
(ex.: selects de múltipla escolha, exportação, relatórios) o frontend precisa de todos os
registros de uma vez — e hoje força um `itensPorPagina` artificialmente alto como workaround.
A flag `allRows` formaliza esse comportamento sem alterar a estrutura de resposta.

---

## Escopo

### 1. `shared` — adicionar `allRows` nos DTOs de filtro

Adicionar o campo em cada DTO de listagem:

```typescript
@IsOptional()
@IsBoolean()
allRows?: boolean;
```

DTOs a tocar:

| DTO | Arquivo |
|---|---|
| `UsuarioListarDto` | `shared/src/dtos/usuario/UsuarioListarDto.ts` |
| `ProjetoListarDto` | `shared/src/dtos/projeto/ProjetoListarDto.ts` |
| `AtividadeListarDto` | `shared/src/dtos/atividade/AtividadeListarDto.ts` |
| `ExecucaoListarDto` | `shared/src/dtos/execucao/ExecucaoListarDto.ts` |
| `DemandaListarDto` | `shared/src/dtos/demanda/DemandaListarDto.ts` |
| `TagListarDto` | `shared/src/dtos/tag/TagListarDto.ts` |

**Nome `allRows` em inglês** — regra de idioma do projeto: conceito técnico genérico (existiria
em qualquer software) → inglês. Não usar `todasAsLinhas`.

### 2. Backend — repositórios: omitir LIMIT/OFFSET quando `allRows = true`

Em cada repositório que implementa listagem paginada, aplicar o seguinte padrão:

```typescript
// antes
const itensPorPagina = dto.itensPorPagina ?? 20;
const deslocamento = (pagina - 1) * itensPorPagina;
// ... query com LIMIT ${itensPorPagina} OFFSET ${deslocamento}

// depois
if (!dto.allRows) {
  const itensPorPagina = dto.itensPorPagina ?? 20;
  const deslocamento = (pagina - 1) * itensPorPagina;
  // ... query com LIMIT / OFFSET
} else {
  // ... mesma query sem LIMIT / OFFSET
}
```

Repositórios a tocar (método `listar` de cada um):

- `usuario.repository.ts`
- `projeto.repository.ts`
- `atividade.repository.ts`
- `execucao.repository.ts`
- `demanda.repository.ts`
- `tag.repository.ts`

### 3. Backend — services: montar `PaginatedResult` corretamente quando `allRows = true`

Quando `allRows = true`, o service deve preencher os campos de paginação de forma coerente:

```typescript
if (dto.allRows) {
  return {
    itens,
    totalItens: itens.length,
    paginaAtual: 1,
    itensPorPagina: itens.length,
    totalPaginas: 1,
  };
}
```

**A estrutura de resposta `PaginatedResult<T>` não muda** — o frontend só precisa ler `itens`.

---

## NÃO implementar nesta task

- Alteração no frontend (cada componente decide quando passar `allRows: true`).
- Novo endpoint ou novo DTO de resposta.
- Limite máximo de registros ou paginação por cursor.
- Listagens que não usam `PaginatedResult` (ex.: `listarAtribuidas`, `listarDescendentes`,
  `recuperarArvore`, `recuperarGrafo` — já retornam todos os registros sem paginação).

---

## Atualização de Documentação (obrigatória)

1. `CONVENTIONS.md` — registrar a convenção `allRows` na seção de paginação/DTOs de filtro.
2. `CONTEXT.md` — registrar a task concluída e os DTOs/repositórios tocados.
3. Mover a spec `backlog/85-...` → `done/` ao concluir.

---

## Verificação

1. `npm run build --workspace=backend` (nest build) OK.
2. `GET /api/v1/usuario?allRows=true` → retorna todos os usuários; `totalPaginas = 1`,
   `itensPorPagina = totalItens`.
3. `GET /api/v1/usuario` (sem `allRows`) → comportamento de paginação inalterado.
4. `GET /api/v1/usuario?allRows=false` → comportamento de paginação inalterado.
5. Repetir os cenários 2–4 para ao menos um outro módulo (ex.: `GET /api/v1/tag?allRows=true`).
