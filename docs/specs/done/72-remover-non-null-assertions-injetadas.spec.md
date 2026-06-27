# Task 72 — backend: Remover non-null assertions injetadas + JSDoc

## Objetivo

Eliminar os `!` (non-null assertions) que existem nos services apenas porque o `id`/`*Id`
chega como campo **opcional** no DTO de `@Body` e é injetado pela controller. Tipar o
parâmetro do service para que o campo injetado seja **obrigatório** (interseção `& { … }`,
padrão já aceito no `ExecucaoService`), tornando o `!` desnecessário. Inclui uma correção
de comentário JSDoc que usa "atualizar".

> **Referência cruzada:** audit de consistência (E4 e C4).
> **Padrão aceito (exceção C3):** `ExecucaoService.encerrar(dto: ExecucaoEncerrarDto & { id: number }, usuarioAtivo)`
> — o `id` é injetado pela controller e o tipo o torna obrigatório, sem `!`.

---

## Contexto

Em três operações de demanda e uma de atividade, o DTO de corpo declara o identificador
como **opcional** (`@IsOptional`, para o `whitelist` não rejeitar o body sem ele) e a
controller injeta o id de `@Param('id')` via `{ ...dto, id }` / `{ ...dto, demandaId: id }`.
No service, esse campo é lido com `!` (`dto.demandaId!`), o que a constituição evita.
Tipando o parâmetro do service com o campo já obrigatório, o `!` cai.

---

## Escopo

### 1. E4 — `!` em ids injetados (tipar o parâmetro)

Em cada método abaixo, trocar a leitura `dto.X!` por um parâmetro tipado em interseção
que torna `X` obrigatório. As **controllers não mudam** (já passam o objeto mesclado).

| Arquivo:Linha | Atual | Correção esperada |
|---|---|---|
| `backend/src/modules/atividade/services/atividade.service.ts:232` | `const atividadeId = dto.id!;` | `alterarTags(dto: AtividadeTagsAtribuirDto & { id: number }, usuarioAtivo)` → `const atividadeId = dto.id;` |
| `backend/src/modules/demanda/services/demanda.service.ts:410` | `const demandaOrigemId = dto.demandaOrigemId!;` | `criarConexao(dto: DemandaConexaoCriarDto & { demandaOrigemId: number })` → sem `!` |
| `backend/src/modules/demanda/services/demanda.service.ts:572` | `const demandaId = dto.demandaId!;` | `alterarTagsDemanda(dto: DemandaTagsAtribuirDto & { demandaId: number }, usuarioAtivo)` → sem `!` |
| `backend/src/modules/demanda/services/demanda.service.ts:668` | `const demandaId = dto.demandaId!;` | `atribuirMembro(dto: DemandaUsuarioAtribuirDto & { demandaId: number }, usuarioAtivo)` → sem `!` |

- Conferir que as controllers correspondentes já passam o campo (`demanda.controller.ts`:
  `criarConexao({ ...dto, demandaOrigemId: id })`, `alterarTagsDemanda({ ...dto, demandaId: id })`,
  `atribuirMembro({ ...dto, demandaId: id })`; `atividade.controller.ts`: `alterarTags({ ...dto, id })`).
- Sem mudança de validação, regra ou SQL — só a assinatura do service.

### 2. E4 (opcional) — outros `!` de narrowing

A confirmar pelo implementador (não eram alvo direto do audit, mas alinham a meta de
minimizar `!`):
- `backend/src/modules/ponto/services/ponto.service.ts:131,133,146` — `diaNaoUtil!.duracao`/`.tipo`
  (o guard `registradoComoNaoUtil` já garante não-nulo, mas o TS não estreita o tipo).
  Sugestão: extrair `const diaNaoUtilConfirmado = diaNaoUtil!` uma vez sob o guard, ou
  reestruturar o `if` para estreitar o tipo.
- `backend/src/modules/demanda/services/demanda.service.ts:369` — `dados: raiz!` (invariante:
  a raiz sempre existe após montar a árvore). Sugestão: checagem explícita com exceção, ou
  manter (invariante real). Decidir na execução.

### 3. C4 — JSDoc com "atualizar"

**Arquivo:** `backend/src/modules/execucao/repositories/execucao.repository.ts:357`

**Situação atual (comentário):** "Usado para autorização nas operações de encerrar,
**atualizar** e excluir."

**Correção esperada:** trocar "atualizar" por "alterar" (alinhado ao §16 #24, que veda
`atualizar` na nomenclatura de negócio — aqui é só comentário, mas mantém a coerência).

---

## Atualização de Documentação (obrigatória)

- `CONTEXT.md` (Decisões Tomadas) — registrar que o `id`/`*Id` injetado pela controller é
  tipado como obrigatório no boundary do service (interseção `& { … }`), eliminando o `!`,
  no mesmo padrão já usado pelo `ExecucaoService` (exceção C3 documentada).
- Não é necessário tocar `SYSTEM.SPEC.md`/`CONVENTIONS.md` (a regra de "DTO em tudo" e a
  microinteligência do controller já estão escritas — esta task só remove os `!` residuais).

---

## Verificação

1. `npm run build --workspace=backend` OK.
2. `grep -rn "dto\.\(id\|demandaId\|demandaOrigemId\)!" backend/src/modules` — nenhuma ocorrência nos 4 alvos.
3. Comportamento inalterado: criar conexão, alterar tags de demanda, atribuir membro e alterar tags de atividade seguem funcionando (mesmas validações).
4. `execucao.repository.ts:357` não contém mais "atualizar" no JSDoc.

---

## NÃO implementar nesta task

- Mudar as controllers (já injetam o id) ou criar DTOs internos novos (a interseção basta, padrão aceito).
- Tocar o `ExecucaoService` (`& { id: number }` já é a referência aceita — C3).
- Reconciliação documental (59), DTO core (63), constraints (60), `ngModel` (62).
- Remover `!` legítimos de outras camadas (ex.: signals no frontend) — fora do escopo.
