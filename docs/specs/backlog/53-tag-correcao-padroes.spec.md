# Task 53 — tag: Correção de Padrões

## Objetivo

Corrigir o desvio de conformidade do módulo **tag** identificado pela auditoria da
**task 44** (`docs/AUDITORIA.md` §4.6): primitivo `id` + `Partial<Tag>` na assinatura
de `TagRepository.alterar`. Sem mudança de comportamento.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.6.
> **Padrão de referência conforme:** `ExecucaoRepository.alterar(dto: ExecucaoAlterarInternoDto)`.
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
- Criar `shared/src/dtos/tag/TagAlterarInternoDto.ts` (`id` + campos hoje lidos do
  `Partial<Tag>` no SET dinâmico: `nome?`, `cor?`). Exportar no barrel `shared/src/dtos/tag/index.ts`.
- `async alterar(dto: TagAlterarInternoDto): Promise<TagAlteradaDto>` — `dto.id` no
  `WHERE`, demais campos no SET (SQL inalterado).
- Atualizar a chamada em `TagService.alterar` (`backend/src/modules/tag/services/tag.service.ts:63`).
- Manter o JSDoc.

---

## Atualização de Documentação (obrigatória)

- **`CONVENTIONS.md` / `SYSTEM.SPEC.md` §7.4** — reforçar (sem duplicar o que specs
  anteriores já tenham inserido) o exemplo ❌ `alterar(id, Partial<Tag>)` /
  ✅ `alterar(dto: TagAlterarInternoDto)`.

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa: `TagRepository.alterar` **não** recebe `id: number` nem `Partial<Tag>`.
3. Checagem negativa: nenhum método de `tag.repository.ts` recebe primitivo em assinatura pública.

---

## NÃO implementar nesta task

- Qualquer outro módulo (cada um tem sua própria spec).
- Reabrir a reconciliação §7.2 × §16 #21 (spec 48).
- Alterar comportamento/validações/SQL do `alterar` — apenas a assinatura/DTO.
- Tocar no frontend.
