# Task 50 — demanda: Correção de Padrões

## Objetivo

Corrigir os desvios de conformidade do módulo **demanda** identificados pela auditoria
da **task 44** (`docs/AUDITORIA.md` §4.3): primitivos em assinaturas de
`DemandaRepository`. Sem mudança de comportamento.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.3.
> **Padrão estrutural (param único DTO):** `ExecucaoRepository.alterar(dto)`.
> **Padrão de nomenclatura (verbo no fim — SPEC §5, linhas 149-155):** complemento
> `Interno` **antes** do verbo `Alterar` → `DemandaInternoAlterarDto` (como os já
> conformes `DemandaMembroInternoAtribuirDto` / `DemandaTagInternoRemoverDto`).
> ⚠️ **Não** usar `DemandaAlterarInternoDto`.
> **Reconciliação documental §7.2 × §16 #21:** decidida na spec `48-usuario-correcao-padroes` (não reabrir).

---

## Contexto

O `DemandaRepository` é o maior do projeto e teve a maior parte dos primitivos
removida na task 20 (via DTOs internos). Restaram três pontos: o `alterar` (primitivo
`id` + `Partial<Demanda>`), o `listarAtribuidas` (primitivo `usuarioId`) e o segundo
parâmetro primitivo de restrição de escopo em `listar`.

---

## Escopo

### 1. `DemandaRepository.alterar` — eliminar primitivo e `Partial<Model>`

**Arquivo:** `backend/src/modules/demanda/repositories/demanda.repository.ts:291`

**Situação atual:** `async alterar(id: number, dados: Partial<Demanda>): Promise<DemandaRecuperadaDto>`

**Correção esperada:**
- Criar `shared/src/dtos/demanda/DemandaInternoAlterarDto.ts` (`id` + os **onze** campos
  hoje lidos do `Partial<Demanda>` no SET dinâmico, `demanda.repository.ts:295-338`:
  `demandaPaiId?`, `nome?`, `descricaoTecnica?`, `descricaoCliente?`, `documentacao?`,
  `horasEstimadas?`, `prioridade?`, `status?`, `isEstrutural?`, `previsaoFimData?`,
  `ordemExibicao?`). Exportar no barrel.
  > ⚠️ **Não omitir `demandaPaiId`** — é o reparenting da demanda, validado em
  > `demanda.service.ts:243-257` e gravado no SET (`:295-298`). Omiti-lo é regressão.
- `async alterar(dto: DemandaInternoAlterarDto): Promise<DemandaRecuperadaDto>` — `dto.id`
  no `WHERE`, demais campos no SET (SQL inalterado).
- Atualizar a chamada em `DemandaService.alterar` (`demanda.service.ts:259`).

### 2. `DemandaRepository.listarAtribuidas` — eliminar primitivo `usuarioId`

**Arquivo:** `backend/src/modules/demanda/repositories/demanda.repository.ts:268`

**Situação atual:** `async listarAtribuidas(usuarioId: number): Promise<DemandaAtribuidaDto[]>`

**Correção esperada:**
- Criar `shared/src/dtos/demanda/DemandaAtribuidasListarDto.ts` (`{ usuarioId: number }`),
  exportar no barrel. (Nome já conforme: complemento `Atribuidas` + verbo `Listar` no fim.)
- `async listarAtribuidas(dto: DemandaAtribuidasListarDto): Promise<DemandaAtribuidaDto[]>`.
- Atualizar a chamada em `DemandaService.listarAtribuidas` (`demanda.service.ts:159`).

### 3. `DemandaRepository.listar` — parâmetro de restrição de escopo primitivo

**Arquivo:** `backend/src/modules/demanda/repositories/demanda.repository.ts:191-193`

**Situação atual:** `async listar(filtros: DemandaListarDto, usuarioId?: number)`

> Mesmo padrão em `ExecucaoRepository.listar(filtros, usuarioIdRestricao?: number)`.

**Correção esperada:** pela decisão **DTO em tudo** (spec 48 §3), o carve-out para
primitivo de restrição de escopo **não é aceito**. Embutir o escopo num DTO:
`listar(filtros: DemandaListarDto, restricao?: DemandaAcessoFiltrarDto)`
(`DemandaAcessoFiltrarDto` já existe no shared — reutilizar). O `DemandaService.listar`
monta `{ usuarioId }` quando o usuário é desenvolvedor.

O mesmo vale para `ExecucaoRepository.listar` (padrão único), corrigido na spec 56 —
a alteração do código de execucao **não é desta task**.

### 4. Boundary controller→service DTO-only (decisão da spec 48)

A `DemandaService` é a que mais recebe `id`/`*Id` primitivo. Pela decisão **DTO em tudo**
(spec 48 §3 / `SYSTEM.SPEC.md` §7.2, §16 #21), o `DemandaController`
(`demanda.controller.ts`) passa a montar o DTO de `@Param`/`@Query`, e a service deixa de
receber primitivo. Métodos afetados (`demanda.service.ts`):

| Método (atual) | Assinatura-alvo (service) | DTO |
|---|---|---|
| `recuperar(id, usuarioAtivo)` | `recuperar(dto, usuarioAtivo)` | `DemandaRecuperarDto { id }` (existe) |
| `alterar(id, dto, usuarioAtivo)` | `alterar(dto, usuarioAtivo)` | `DemandaInternoAlterarDto` (item §1) |
| `recuperarArvore(demandaId, usuarioAtivo)` | `recuperarArvore(dto, usuarioAtivo)` | `DemandaRecuperarDto { id }` |
| `recuperarAncestral(demandaId, usuarioAtivo)` | idem | `DemandaRecuperarDto { id }` |
| `listarConexoes(demandaId, usuarioAtivo)` | `listarConexoes(dto, usuarioAtivo)` | `DemandaRecuperarDto { id }` |
| `listarTagsDemanda(demandaId, usuarioAtivo)` | idem | `DemandaRecuperarDto { id }` |
| `listarMembros(demandaId, usuarioAtivo)` | idem | `DemandaRecuperarDto { id }` |
| `excluir(id)` | `excluir(dto)` | `DemandaRecuperarDto { id }` |
| `criarConexao(demandaOrigemId, dto)` | `criarConexao(dto)` | controller mescla `{ ...dto, demandaOrigemId }` em `DemandaConexaoCriarDto` |
| `excluirConexao(demandaId, conexaoId)` | `excluirConexao(dto)` | novo `DemandaConexaoExcluirDto { demandaId, conexaoId }` |
| `recuperarGrafo(projetoId, usuarioAtivo)` | `recuperarGrafo(dto, usuarioAtivo)` | `DemandaGrafoRecuperarDto { projetoId }` (existe, de `@Query`) |
| `alterarTagsDemanda(demandaId, dto, usuarioAtivo)` | `alterarTagsDemanda(dto, usuarioAtivo)` | controller mescla `{ ...dto, demandaId }` |
| `atribuirMembro(demandaId, dto, usuarioAtivo)` | `atribuirMembro(dto, usuarioAtivo)` | controller mescla `{ ...dto, demandaId }` |
| `removerMembro(demandaId, usuarioId, usuarioAtivo)` | `removerMembro(dto, usuarioAtivo)` | novo `DemandaMembroRemoverDto { demandaId, usuarioId }` |

- Reutilizar `DemandaRecuperarDto { id }` para todas as leituras/exclusão por id único —
  **não** criar um DTO por método. Criar apenas os DTOs de múltiplos identificadores
  listados acima (`DemandaConexaoExcluirDto`, `DemandaMembroRemoverDto` — nome com verbo no
fim). `DemandaRecuperarDto` e `DemandaGrafoRecuperarDto` já existem no shared.
- `usuarioAtivo: JwtPayload` permanece como parâmetro próprio (não é primitivo).
- Sem mudança de autorização, CTE ou SQL — apenas o formato das assinaturas.

---

## Atualização de Documentação (obrigatória)

- **`CONVENTIONS.md` / `SYSTEM.SPEC.md` §7.4** — reforçar (sem duplicar o que a spec 48/49
  já tiver inserido) o exemplo ❌ `alterar(id, Partial<Demanda>)` / ✅ `alterar(dto: DemandaInternoAlterarDto)`.
- **Restrição de escopo via DTO** — confirmar (sem duplicar a spec 48) que `SYSTEM.SPEC.md`
  §7.2/§16 #21 já deixam inequívoco que o parâmetro de restrição de escopo também é DTO
  (`DemandaAcessoFiltrarDto`), não primitivo — o carve-out foi descartado pela decisão
  "DTO em tudo".

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa: `alterar` e `listarAtribuidas` **não** recebem primitivos.
3. `DemandaInternoAlterarDto` expõe os **onze** campos (incl. `demandaPaiId`) + `id`; o
   nome tem o verbo `Alterar` no fim (não `DemandaAlterarInternoDto`).
4. `listar` recebe `restricao?: DemandaAcessoFiltrarDto` — **não** `usuarioId?: number`.
5. Checagem negativa (boundary): nenhum método de `DemandaService` recebe `id`/`*Id`
   primitivo; o `DemandaController` monta o DTO a partir de `@Param`/`@Query`. Os DTOs
   novos (`DemandaConexaoExcluirDto`, `DemandaMembroRemoverDto`) têm o verbo no fim.

---

## NÃO implementar nesta task

- Qualquer outro módulo (inclusive a alteração equivalente em `execucao.repository.ts`).
- Reabrir a reconciliação §7.2 × §16 #21 (spec 48).
- Alterar comportamento, autorização, CTEs ou SQL — apenas assinatura/DTO.
- Tocar no frontend.
