# Task 52 — calendario: Correção de Padrões

## Objetivo

Corrigir o desvio de conformidade do módulo **calendario** identificado pela auditoria
da **task 44** (`docs/AUDITORIA.md` §4.5): primitivo `id` + `Partial<DiaNaoUtil>` na
assinatura de `CalendarioRepository.alterar`. Sem mudança de comportamento.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.5.
> **Padrão estrutural (param único DTO):** `ExecucaoRepository.alterar(dto)`.
> **Padrão de nomenclatura (verbo no fim — SPEC §5, L149-155):** complemento `Interno` antes do verbo `Alterar` → `CalendarioInternoAlterarDto`. ⚠️ Não usar `CalendarioAlterarInternoDto` (é o erro que `ExecucaoAlterarInternoDto` comete — corrigido na spec 56).
> **Reconciliação documental §7.2 × §16 #21:** decidida na spec `48-usuario-correcao-padroes` (não reabrir).

---

## Contexto

A task 20 removeu primitivos de `recuperar`, `excluir`, `validarDia` e `recuperarTipo`,
mas o `alterar` de calendario permaneceu com **primitivo `id`** e `Partial<DiaNaoUtil>`
(partial do model). O `DiaNaoUtilAlterarDto` já existe no shared.

---

## Escopo

### `CalendarioRepository.alterar` — eliminar primitivo e `Partial<Model>`

**Arquivo:** `backend/src/modules/calendario/repositories/calendario.repository.ts:103`

**Situação atual:**
```typescript
async alterar(id: number, dados: Partial<DiaNaoUtil>): Promise<DiaNaoUtilAlteradoDto> { ... }
```

**Correção esperada:**
- Criar `shared/src/dtos/calendario/CalendarioInternoAlterarDto.ts` (`id` + campos hoje
  lidos do `Partial<DiaNaoUtil>` no SET dinâmico: `descricao?`, `tipo?`, `duracao?`,
  `recorrente?`). Exportar no barrel `shared/src/dtos/calendario/index.ts`.
- `async alterar(dto: CalendarioInternoAlterarDto): Promise<DiaNaoUtilAlteradoDto>` —
  `dto.id` no `WHERE`, demais campos no SET (SQL inalterado).
- Atualizar a chamada em `CalendarioService.alterar` (`backend/src/modules/calendario/services/calendario.service.ts:62`).
- Manter o JSDoc.

### Boundary controller→service DTO-only (decisão da spec 48)

A `CalendarioService` recebe o `id` como primitivo em `recuperar(id)`, `alterar(id, dto)`
e `excluir(id)` (`calendario.service.ts:47,62,84`). Pela decisão **DTO em tudo** (spec 48 §3):

- `CalendarioService`: `recuperar(dto: CalendarioRecuperarDto)`,
  `alterar(dto: CalendarioInternoAlterarDto)`, `excluir(dto: CalendarioRecuperarDto)`.
- `CalendarioController` (`calendario.controller.ts:69,81,94`): monta o DTO de `@Param('id')`
  — `recuperar({ id })`, `alterar({ ...dto, id })`, `excluir({ id })`.
- Reutilizar o DTO `{ id }` de recuperação para recuperar e excluir. Sem mudança de regra/SQL.

---

## Atualização de Documentação (obrigatória)

- **`CONVENTIONS.md` / `SYSTEM.SPEC.md` §7.4** — reforçar (sem duplicar o que specs
  anteriores já tenham inserido) o exemplo ❌ `alterar(id, Partial<DiaNaoUtil>)` /
  ✅ `alterar(dto: CalendarioInternoAlterarDto)`.

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa: `CalendarioRepository.alterar` **não** recebe `id: number` nem `Partial<DiaNaoUtil>`; o DTO chama-se `CalendarioInternoAlterarDto` (verbo no fim).
3. Checagem negativa: nenhum método de `calendario.repository.ts` recebe primitivo em assinatura pública.

---

## NÃO implementar nesta task

- Qualquer outro módulo (cada um tem sua própria spec). A renomeação do trigger
  `fn_atualizar_updated_date` é da spec `55-core-correcao-padroes`.
- Reabrir a reconciliação §7.2 × §16 #21 (spec 48).
- Alterar comportamento/validações/SQL do `alterar` — apenas a assinatura/DTO.
- Tocar no frontend.
