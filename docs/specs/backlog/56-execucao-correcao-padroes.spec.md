# Task 56 — execucao: Correção de Padrões (nomenclatura de DTOs internos)

## Objetivo

Corrigir as **duas violações da regra de nomenclatura do §5** (verbo sempre no fim do
nome, depois do complemento) nos DTOs internos do módulo **execucao**, detectadas na
**errata da auditoria 44** (`docs/AUDITORIA.md` §8). Sem mudança de campos nem de
comportamento — apenas renomeação.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §8 (errata).
> **Regra:** `SYSTEM.SPEC.md` §5, linhas 149-155 — "o complemento inteiro vem antes do
> verbo, sem exceção; qualificadores como `Interno` fazem parte do complemento".
> **Exemplares conformes:** `DemandaMembroInternoAtribuirDto`, `DemandaTagInternoRemoverDto`.

---

## Contexto

A auditoria 44 marcou `execucao` como "0 achados" e ainda o citou como *referência
conforme* para o padrão de DTO interno. A errata (§8) corrigiu isso: os dois DTOs
internos de execucao têm o **verbo no meio do complemento** (`Alterar`/`Encerrar` antes
de `Interno`), exatamente a forma marcada como ❌ no §5:

| Atual (❌) | Correto (✅) |
|---|---|
| `ExecucaoAlterarInternoDto`  | `ExecucaoInternoAlterarDto`  |
| `ExecucaoEncerrarInternoDto` | `ExecucaoInternoEncerrarDto` |

O módulo `execucao` permanece, no resto, conforme (é a referência **estrutural** do
boundary de repositório DTO-only — `alterar(dto)`/`encerrar(dto)`); o defeito é só o
nome.

---

## Escopo

### 1. Renomear `ExecucaoAlterarInternoDto` → `ExecucaoInternoAlterarDto`

- Renomear o arquivo/classe `shared/src/dtos/execucao/ExecucaoAlterarInternoDto.ts`
  → `shared/src/dtos/execucao/ExecucaoInternoAlterarDto.ts`.
- Atualizar o barrel `shared/src/dtos/execucao/index.ts:13`.
- Atualizar o import e o uso em
  `backend/src/modules/execucao/repositories/execucao.repository.ts:15,328`
  (`async alterar(dto: ExecucaoInternoAlterarDto)`).

### 2. Renomear `ExecucaoEncerrarInternoDto` → `ExecucaoInternoEncerrarDto`

- Renomear o arquivo/classe `shared/src/dtos/execucao/ExecucaoEncerrarInternoDto.ts`
  → `shared/src/dtos/execucao/ExecucaoInternoEncerrarDto.ts`.
- Atualizar o barrel `shared/src/dtos/execucao/index.ts:11`.
- Atualizar o import e o uso em
  `backend/src/modules/execucao/repositories/execucao.repository.ts:13,120`
  (`async encerrar(dto: ExecucaoInternoEncerrarDto)`).

> O `ExecucaoService` **não** referencia esses tipos pelo nome (passa objeto literal
> estruturalmente compatível), então não há mais nada a alterar no backend. Confirmar
> com a checagem negativa abaixo.

---

## Atualização de Documentação (obrigatória)

- **`SYSTEM.SPEC.md` §5** — acrescentar, junto aos exemplos das linhas 149-155, o caso do
  qualificador `Interno` **sem outro complemento de substantivo**, deixando explícito
  que vale a mesma ordem: ✅ `EntidadeInternoAlterarDto` / ❌ `EntidadeAlterarInternoDto`.
- **`CONVENTIONS.md`** (seção DTOs) — incluir a linha ❌ `ExecucaoAlterarInternoDto` /
  ✅ `ExecucaoInternoAlterarDto` na tabela de proibições/exemplos de nomenclatura.
- Registrar em `docs/CONTEXT.md` (seção "Decisões Tomadas"/histórico) que execucao
  deixou de ser "0 achados" (ver `docs/AUDITORIA.md` §8).

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa (nomenclatura): `grep -r "AlterarInternoDto\|EncerrarInternoDto" shared backend/src`
   não retorna nada (nenhum DTO com verbo antes de `Interno`).
3. Checagem negativa: nenhum arquivo `*AlterarInternoDto.ts`/`*EncerrarInternoDto.ts` em
   `shared/src/dtos/execucao/`.
4. Os campos dos dois DTOs permanecem idênticos (apenas o nome muda).

---

## NÃO implementar nesta task

- Qualquer mudança de campos, SQL ou comportamento dos métodos `alterar`/`encerrar`.
- Outros módulos — o `UsuarioAlterarSenhaInternoDto` (mesma classe de violação) é
  renomeado na spec `48-usuario-correcao-padroes`.
- Tocar no frontend.
