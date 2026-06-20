# Task 49 — projeto: Correção de Padrões

## Objetivo

Corrigir o desvio de conformidade do módulo **projeto** identificado pela auditoria
da **task 44** (`docs/AUDITORIA.md` §4.2): primitivo `id` + `Partial<Projeto>` na
assinatura de `ProjetoRepository.alterar`. Sem mudança de comportamento.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.2.
> **Padrão estrutural (param único DTO):** `ExecucaoRepository.alterar(dto)`.
> **Padrão de nomenclatura (verbo no fim — SPEC §5, linhas 149-155):** complemento
> `Interno` **antes** do verbo `Alterar` → `ProjetoInternoAlterarDto`. ⚠️ **Não** usar
> `ProjetoAlterarInternoDto` (verbo no meio do complemento — proibido pelo §5; é o erro
> que `ExecucaoAlterarInternoDto` comete, corrigido na spec 56).
> **Reconciliação documental §7.2 × §16 #21:** decidida na spec `48-usuario-correcao-padroes` (não reabrir).

---

## Contexto

A task 20 estabeleceu o boundary de repositório livre de primitivos via `recuperar(dto)`,
mas o `alterar` de projeto permaneceu recebendo o **primitivo `id`** e um `Partial<Projeto>`
(partial do model de banco) em vez de um DTO. O `ProjetoAlterarDto` já existe no shared,
mas o repositório não recebe um DTO com o `id`.

---

## Escopo

### `ProjetoRepository.alterar` — eliminar primitivo e `Partial<Model>`

**Arquivo:** `backend/src/modules/projeto/repositories/projeto.repository.ts:189`

**Situação atual:**
```typescript
async alterar(id: number, dados: Partial<Projeto>): Promise<ProjetoAlteradoDto> { ... }
```

**Correção esperada:**
- Criar `shared/src/dtos/projeto/ProjetoInternoAlterarDto.ts`:
  ```typescript
  export class ProjetoInternoAlterarDto {
    id: number;
    nome?: string;
    cor?: string;
    status?: ProjetoStatusEnum;
    inicioData?: string | null;
    previsaoFimData?: string | null;
  }
  ```
  > ⚠️ Espelhar **exatamente** os campos hoje lidos no SET dinâmico
  > (`projeto.repository.ts:193-211`): `nome, cor, status, inicioData, previsaoFimData`.
  > **`codigo` NÃO entra** — o sistema proíbe alterá-lo ("Código não pode ser alterado",
  > `projeto.service.ts:114`; o SET do `alterar` não toca `codigo`). Incluí-lo no DTO
  > anunciaria uma capacidade inexistente.
- Exportar no barrel `shared/src/dtos/projeto/index.ts`.
- Mudar a assinatura para `async alterar(dto: ProjetoInternoAlterarDto): Promise<ProjetoAlteradoDto>`,
  lendo `dto.id` no `WHERE` e os demais campos no SET (SQL inalterado).
- Atualizar a chamada em `ProjetoService.alterar` (`backend/src/modules/projeto/services/projeto.service.ts:132`).
- Manter o JSDoc.

### Boundary controller→service DTO-only (decisão da spec 48)

A `ProjetoService` recebe o `id` como primitivo em `recuperar(id, usuarioAtivo)`,
`alterar(id, dto)` e `excluir(id)` (`projeto.service.ts:88,115,148`). Pela decisão
**DTO em tudo** (spec 48 §3 / `SYSTEM.SPEC.md` §7.2, §16 #21), o controller passa a
montar o DTO e a service deixa de receber primitivo:

- `ProjetoService`:
  - `recuperar(dto: ProjetoRecuperarDto, usuarioAtivo)` — `dto.id`.
  - `alterar(dto: ProjetoInternoAlterarDto)` — mesmo DTO interno acima; `dto.id` é o alvo.
  - `excluir(dto: ProjetoRecuperarDto)`.
- `ProjetoController` (`projeto.controller.ts:68,83,96`): monta o DTO de `@Param('id')` —
  `recuperar({ id }, usuarioAtivo)`, `alterar({ ...dto, id })`, `excluir({ id })`.
- Reutilizar `ProjetoRecuperarDto { id }` (já existe) para recuperar e excluir; não criar
  DTO novo só para exclusão. Sem mudança de validação/regra/SQL.

---

## Atualização de Documentação (obrigatória)

- **`CONVENTIONS.md`** — confirmar que a linha "primitivo no `alterar`" foi adicionada à
  tabela de proibições (caso a spec 48 já a tenha incluído, **não duplicar**; caso esta
  spec seja implementada antes, adicioná-la). Acrescentar, na seção SQL/Camadas, o
  exemplo concreto ❌ `alterar(id, Partial<Projeto>)` / ✅ `alterar(dto: ProjetoInternoAlterarDto)`
  reforçando que o repositório nunca recebe `Partial<Model>` nem primitivo.

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa: `ProjetoRepository.alterar` **não** recebe `id: number` nem `Partial<Projeto>`.
3. Checagem negativa: nenhum método de `projeto.repository.ts` recebe primitivo em assinatura pública.
4. `ProjetoInternoAlterarDto` **não** declara `codigo` (capacidade inexistente) e o nome
   tem o verbo `Alterar` no fim (não `ProjetoAlterarInternoDto`).
5. Checagem negativa (boundary): nenhum método de `ProjetoService` recebe `id: number`
   solto; o `ProjetoController` monta o DTO a partir de `@Param('id')`.

---

## NÃO implementar nesta task

- Qualquer outro módulo (cada um tem sua própria spec).
- Reabrir a reconciliação §7.2 × §16 #21 (responsabilidade da spec 48).
- Alterar comportamento/validações/SQL do `alterar` — apenas a assinatura/DTO.
- Tocar no frontend.
