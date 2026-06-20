# Task 53 — tag: Correção de Padrões

## Objetivo

Corrigir o desvio de conformidade do módulo **tag** identificado pela auditoria da
**task 44** (`docs/AUDITORIA.md` §4.6): primitivo `id` + `Partial<Tag>` na assinatura
de `TagRepository.alterar`. Sem mudança de comportamento.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.6.
> **Padrão estrutural (param único DTO):** `ExecucaoRepository.alterar(dto)`.
> **Padrão de nomenclatura (verbo no fim — SPEC §5, L149-155):** complemento `Interno` antes do verbo `Alterar` → `TagInternoAlterarDto`. ⚠️ Não usar `TagAlterarInternoDto` (é o erro que `ExecucaoAlterarInternoDto` comete — corrigido na spec 56).
> **Reconciliação documental §7.2 × §16 #21:** decidida na spec `48-usuario-correcao-padroes` (não reabrir).

---

## Contexto

A task 20 removeu primitivos de `recuperar` e `excluir`, mas o `alterar` de tag
permaneceu com **primitivo `id`** e `Partial<Tag>` (partial do model). O `TagAlterarDto`
já existe no shared.

---

## Escopo

### `TagRepository.alterar` — eliminar primitivo e `Partial<Model>`

**Arquivo:** `backend/src/modules/tag/repositories/tag.repository.ts:89`

**Situação atual:**
```typescript
async alterar(id: number, dados: Partial<Tag>): Promise<TagAlteradaDto> { ... }
```

**Correção esperada:**
- Criar `shared/src/dtos/tag/TagInternoAlterarDto.ts` (`id` + campos hoje lidos do
  `Partial<Tag>` no SET dinâmico: `nome?`, `cor?`). Exportar no barrel `shared/src/dtos/tag/index.ts`.
- `async alterar(dto: TagInternoAlterarDto): Promise<TagAlteradaDto>` — `dto.id` no
  `WHERE`, demais campos no SET (SQL inalterado).
- Atualizar a chamada em `TagService.alterar` (`backend/src/modules/tag/services/tag.service.ts:63`).
- Manter o JSDoc.

### Boundary controller→service DTO-only (decisão da spec 48)

A `TagService` recebe o `id` como primitivo em `recuperar(id)`, `alterar(id, dto)` e
`excluir(id)` (`tag.service.ts:48,63,87`). Pela decisão **DTO em tudo** (spec 48 §3):

- `TagService`: `recuperar(dto: TagRecuperarDto)`, `alterar(dto: TagInternoAlterarDto)`,
  `excluir(dto: TagRecuperarDto)`.
- `TagController` (`tag.controller.ts:52,65,78`): monta o DTO de `@Param('id')` —
  `recuperar({ id })`, `alterar({ ...dto, id })`, `excluir({ id })`.
- Reutilizar `TagRecuperarDto { id }` para recuperar e excluir. Sem mudança de regra/SQL.

---

## Atualização de Documentação (obrigatória)

- **`CONVENTIONS.md` / `SYSTEM.SPEC.md` §7.4** — reforçar (sem duplicar o que specs
  anteriores já tenham inserido) o exemplo ❌ `alterar(id, Partial<Tag>)` /
  ✅ `alterar(dto: TagInternoAlterarDto)`.

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa: `TagRepository.alterar` **não** recebe `id: number` nem `Partial<Tag>`; o DTO chama-se `TagInternoAlterarDto` (verbo no fim).
3. Checagem negativa: nenhum método de `tag.repository.ts` recebe primitivo em assinatura pública.
4. Checagem negativa (boundary): nenhum método de `TagService` recebe `id: number` solto;
   o `TagController` monta o DTO a partir de `@Param('id')`.

---

## NÃO implementar nesta task

- Qualquer outro módulo (cada um tem sua própria spec).
- Reabrir a reconciliação §7.2 × §16 #21 (spec 48).
- Alterar comportamento/validações/SQL do `alterar` — apenas a assinatura/DTO.
- Tocar no frontend.
