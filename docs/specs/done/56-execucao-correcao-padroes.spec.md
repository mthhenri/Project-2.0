# Task 56 — execucao: Correção de Padrões (nomenclatura + boundary DTO-only)

## Objetivo

Corrigir, no módulo **execucao**: (1) as **duas violações da regra de nomenclatura do §5**
(verbo sempre no fim) nos DTOs internos, detectadas na **errata da auditoria 44**
(`docs/AUDITORIA.md` §8); (2) o **boundary controller→service** com `id` primitivo e (3) o
**primitivo de restrição de escopo** em `ExecucaoRepository.listar`, ambos decorrentes da
decisão **DTO em tudo** (spec 48 §3). Sem mudança de campos nem de comportamento.

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
> estruturalmente compatível) — a renomeação não exige mudança lá. O boundary do service,
> porém, é tratado no §3 abaixo.

### 3. Boundary controller→service DTO-only (decisão da spec 48)

A `ExecucaoService` recebe o `id` como primitivo em `encerrar(id, dto, usuarioAtivo)`,
`recuperar(id, usuarioAtivo)`, `alterar(id, dto, usuarioAtivo)` e
`excluir(id, usuarioAtivo)` (`execucao.service.ts:126,207,234,288`). Pela decisão
**DTO em tudo** (spec 48 §3):

- `ExecucaoService`:
  - `recuperar(dto: ExecucaoRecuperarDto, usuarioAtivo)`, `excluir(dto: ExecucaoRecuperarDto, usuarioAtivo)` — reutilizam `{ id }`.
  - `encerrar(dto, usuarioAtivo)` e `alterar(dto, usuarioAtivo)` — controller mescla `{ ...dto, id }` (DTO público de encerrar/alterar + `id`).
- `ExecucaoController` (`execucao.controller.ts:90,104,119,134`): monta o DTO de `@Param('id')`.
- `recuperarAtiva` e `listar` já recebem objeto — sem mudança de assinatura no service.
- `usuarioAtivo: JwtPayload` permanece parâmetro próprio.

### 4. `ExecucaoRepository.listar` — primitivo de restrição de escopo

**Arquivo:** `backend/src/modules/execucao/repositories/execucao.repository.ts` —
`listar(filtros, usuarioIdRestricao?: number)` (chamado em `execucao.service.ts:186`).

Mesmo padrão descartado em demanda (spec 50 §3). Embutir o escopo num DTO:
`listar(filtros: ExecucaoListarDto, restricao?: ExecucaoAcessoFiltrarDto { usuarioId })`
— criar `ExecucaoAcessoFiltrarDto` no shared (espelhando `DemandaAcessoFiltrarDto`) se não
existir, e atualizar a chamada em `ExecucaoService.listar`. SQL inalterado.

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
4. Os campos dos dois DTOs internos permanecem idênticos (apenas o nome muda).
5. Checagem negativa (boundary): nenhum método de `ExecucaoService` recebe `id: number`
   solto; o `ExecucaoController` monta o DTO a partir de `@Param('id')`.
6. `ExecucaoRepository.listar` **não** recebe `usuarioIdRestricao?: number` — usa
   `ExecucaoAcessoFiltrarDto`.

---

## NÃO implementar nesta task

- Qualquer mudança de campos, SQL ou comportamento dos métodos `alterar`/`encerrar`.
- Outros módulos — o `UsuarioAlterarSenhaInternoDto` (mesma classe de violação) é
  renomeado na spec `48-usuario-correcao-padroes`.
- Tocar no frontend.
