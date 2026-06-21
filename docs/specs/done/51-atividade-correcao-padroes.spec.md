# Task 51 — atividade: Correção de Padrões

## Objetivo

Corrigir o desvio de conformidade do módulo **atividade** identificado pela auditoria
da **task 44** (`docs/AUDITORIA.md` §4.4): primitivo `id` + `Partial<Atividade>` na
assinatura de `AtividadeRepository.alterar`. Sem mudança de comportamento.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.4.
> **Padrão estrutural (param único DTO):** `ExecucaoRepository.alterar(dto)`.
> **Padrão de nomenclatura (verbo no fim — SPEC §5, L149-155):** complemento `Interno` antes do verbo `Alterar` → `AtividadeInternoAlterarDto`. ⚠️ Não usar `AtividadeAlterarInternoDto` (é o erro que `ExecucaoAlterarInternoDto` comete — corrigido na spec 56).
> **Reconciliação documental §7.2 × §16 #21:** decidida na spec `48-usuario-correcao-padroes` (não reabrir).

---

## Contexto

A task 20 removeu primitivos de `recuperar`, `excluir`, `listarTags`, `alterarTags` e
`usuarioTemAcessoDemanda`, mas o `alterar` de atividade permaneceu com **primitivo `id`**
e `Partial<Atividade>` (partial do model). O `AtividadeAlterarDto` já existe no shared.

---

## Escopo

### `AtividadeRepository.alterar` — eliminar primitivo e `Partial<Model>`

**Arquivo:** `backend/src/modules/atividade/repositories/atividade.repository.ts:197`

**Situação atual:**
```typescript
async alterar(id: number, dados: Partial<Atividade>): Promise<AtividadeAlteradaDto> { ... }
```

**Correção esperada:**
- Criar `shared/src/dtos/atividade/AtividadeInternoAlterarDto.ts` (`id` + campos hoje
  lidos do `Partial<Atividade>` no SET dinâmico: `nome?`, `descricao?`, `status?`,
  `ordemExibicao?`). Exportar no barrel `shared/src/dtos/atividade/index.ts`.
- `async alterar(dto: AtividadeInternoAlterarDto): Promise<AtividadeAlteradaDto>` — `dto.id`
  no `WHERE`, demais campos no SET (SQL inalterado).
- Atualizar a chamada em `AtividadeService.alterar` (`backend/src/modules/atividade/services/atividade.service.ts:160`).
- Manter o JSDoc.

### Boundary controller→service DTO-only (decisão da spec 48)

A `AtividadeService` recebe o `id` como primitivo em `recuperar(id, usuarioAtivo)`,
`alterar(id, dto, usuarioAtivo)`, `excluir(id)`, `alterarTags(id, dto, usuarioAtivo)` e
`listarTags(id, usuarioAtivo)` (`atividade.service.ts:129,160,199,219,264`). Pela decisão
**DTO em tudo** (spec 48 §3):

- `AtividadeService`:
  - `recuperar(dto: AtividadeRecuperarDto, usuarioAtivo)`, `listarTags(dto: AtividadeRecuperarDto, usuarioAtivo)`, `excluir(dto: AtividadeRecuperarDto)` — reutilizam `{ id }`.
  - `alterar(dto: AtividadeInternoAlterarDto, usuarioAtivo)` — DTO interno acima.
  - `alterarTags(dto, usuarioAtivo)` — controller mescla `{ ...dto, id }` (id = atividade).
- `AtividadeController` (`atividade.controller.ts:65,79,93,105,118`): monta o DTO de
  `@Param('id')`; nenhuma outra lógica. `usuarioAtivo` permanece parâmetro próprio.
- Sem mudança de autorização/regra/SQL.

---

## Atualização de Documentação (obrigatória)

- **`CONVENTIONS.md` / `SYSTEM.SPEC.md` §7.4** — reforçar (sem duplicar o que specs
  anteriores já tenham inserido) o exemplo ❌ `alterar(id, Partial<Atividade>)` /
  ✅ `alterar(dto: AtividadeInternoAlterarDto)`, deixando claro que o repositório nunca
  recebe `Partial<Model>` nem primitivo.

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa: `AtividadeRepository.alterar` **não** recebe `id: number` nem `Partial<Atividade>`; o DTO chama-se `AtividadeInternoAlterarDto` (verbo no fim).
3. Checagem negativa: nenhum método de `atividade.repository.ts` recebe primitivo em assinatura pública.
4. Checagem negativa (boundary): nenhum método de `AtividadeService` recebe `id: number`
   solto; o `AtividadeController` monta o DTO a partir de `@Param('id')`.

---

## NÃO implementar nesta task

- Qualquer outro módulo (cada um tem sua própria spec).
- Reabrir a reconciliação §7.2 × §16 #21 (spec 48).
- Alterar comportamento/validações/SQL do `alterar` — apenas a assinatura/DTO.
- Tocar no frontend.
