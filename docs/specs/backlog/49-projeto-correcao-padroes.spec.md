# Task 49 — projeto: Correção de Padrões

## Objetivo

Corrigir o desvio de conformidade do módulo **projeto** identificado pela auditoria
da **task 44** (`docs/AUDITORIA.md` §4.2): primitivo `id` + `Partial<Projeto>` na
assinatura de `ProjetoRepository.alterar`. Sem mudança de comportamento.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.2.
> **Padrão de referência conforme:** `ExecucaoRepository.alterar(dto: ExecucaoAlterarInternoDto)`.
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
- Criar `shared/src/dtos/projeto/ProjetoAlterarInternoDto.ts`:
  ```typescript
  export class ProjetoAlterarInternoDto {
    id: number;
    nome?: string;
    codigo?: string;
    cor?: string;
    status?: ProjetoStatusEnum;
    inicioData?: string | null;
    previsaoFimData?: string | null;
  }
  ```
  (espelhar exatamente os campos hoje lidos do `Partial<Projeto>` no SET dinâmico).
- Exportar no barrel `shared/src/dtos/projeto/index.ts`.
- Mudar a assinatura para `async alterar(dto: ProjetoAlterarInternoDto): Promise<ProjetoAlteradoDto>`,
  lendo `dto.id` no `WHERE` e os demais campos no SET (SQL inalterado).
- Atualizar a chamada em `ProjetoService.alterar` (`backend/src/modules/projeto/services/projeto.service.ts:115`).
- Manter o JSDoc.

---

## Atualização de Documentação (obrigatória)

- **`CONVENTIONS.md`** — confirmar que a linha "primitivo no `alterar`" foi adicionada à
  tabela de proibições (caso a spec 48 já a tenha incluído, **não duplicar**; caso esta
  spec seja implementada antes, adicioná-la). Acrescentar, na seção SQL/Camadas, o
  exemplo concreto ❌ `alterar(id, Partial<Projeto>)` / ✅ `alterar(dto: ProjetoAlterarInternoDto)`
  reforçando que o repositório nunca recebe `Partial<Model>` nem primitivo.

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa: `ProjetoRepository.alterar` **não** recebe `id: number` nem `Partial<Projeto>`.
3. Checagem negativa: nenhum método de `projeto.repository.ts` recebe primitivo em assinatura pública.

---

## NÃO implementar nesta task

- Qualquer outro módulo (cada um tem sua própria spec).
- Reabrir a reconciliação §7.2 × §16 #21 (responsabilidade da spec 48).
- Alterar comportamento/validações/SQL do `alterar` — apenas a assinatura/DTO.
- Tocar no frontend.
