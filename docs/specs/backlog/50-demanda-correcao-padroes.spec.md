# Task 50 — demanda: Correção de Padrões

## Objetivo

Corrigir os desvios de conformidade do módulo **demanda** identificados pela auditoria
da **task 44** (`docs/AUDITORIA.md` §4.3): primitivos em assinaturas de
`DemandaRepository`. Sem mudança de comportamento.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.3.
> **Padrão de referência conforme:** `ExecucaoRepository.alterar(dto: ExecucaoAlterarInternoDto)`.
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
- Criar `shared/src/dtos/demanda/DemandaAlterarInternoDto.ts` (`id` + campos hoje lidos
  do `Partial<Demanda>` no SET dinâmico: `nome?`, `descricaoTecnica?`, `descricaoCliente?`,
  `documentacao?`, `horasEstimadas?`, `prioridade?`, `status?`, `isEstrutural?`,
  `previsaoFimData?`, `ordemExibicao?`). Exportar no barrel.
- `async alterar(dto: DemandaAlterarInternoDto): Promise<DemandaRecuperadaDto>` — `dto.id`
  no `WHERE`, demais campos no SET (SQL inalterado).
- Atualizar a chamada em `DemandaService.alterar` (`demanda.service.ts:205`).

### 2. `DemandaRepository.listarAtribuidas` — eliminar primitivo `usuarioId`

**Arquivo:** `backend/src/modules/demanda/repositories/demanda.repository.ts:268`

**Situação atual:** `async listarAtribuidas(usuarioId: number): Promise<DemandaAtribuidaDto[]>`

**Correção esperada:**
- Criar `shared/src/dtos/demanda/DemandaAtribuidasListarDto.ts` (`{ usuarioId: number }`),
  exportar no barrel.
- `async listarAtribuidas(dto: DemandaAtribuidasListarDto): Promise<DemandaAtribuidaDto[]>`.
- Atualizar a chamada em `DemandaService.listarAtribuidas` (`demanda.service.ts:156`).

### 3. `DemandaRepository.listar` — parâmetro de restrição de escopo primitivo

**Arquivo:** `backend/src/modules/demanda/repositories/demanda.repository.ts:191-193`

**Situação atual:** `async listar(filtros: DemandaListarDto, usuarioId?: number)`

> Mesmo padrão em `ExecucaoRepository.listar(filtros, usuarioIdRestricao?: number)`.

**Correção esperada (escolher uma e aplicar consistentemente):**
- **(a)** Embutir o escopo num DTO de filtro: `listar(filtros: DemandaListarDto, restricao?: DemandaAcessoFiltrarDto)`
  (`DemandaAcessoFiltrarDto` já existe no shared — reutilizar), **ou**
- **(b)** Documentar o **carve-out** explícito para "parâmetro opcional de restrição de
  escopo derivado do usuário autenticado", caso a equipe decida mantê-lo como primitivo.

A decisão tomada aqui deve valer também para `ExecucaoRepository.listar` (citar na
documentação que o padrão é único), mas a **alteração de código de execucao não é desta task**.

---

## Atualização de Documentação (obrigatória)

- **`CONVENTIONS.md` / `SYSTEM.SPEC.md` §7.4** — reforçar (sem duplicar o que a spec 48/49
  já tiver inserido) o exemplo ❌ `alterar(id, Partial<Demanda>)` / ✅ `alterar(dto: DemandaAlterarInternoDto)`.
- **Carve-out de restrição de escopo** — documentar de forma inequívoca, no `SYSTEM.SPEC.md`
  §9.2/§7.4, a regra para o parâmetro opcional de restrição (decisão do Escopo §3),
  para que `listar(filtros, usuarioId?)` deixe de ser ambíguo.

---

## Verificação

1. `npm run build --workspace=shared` e `npm run build --workspace=backend` — sem erros.
2. Checagem negativa: `alterar` e `listarAtribuidas` **não** recebem primitivos.
3. Para a opção (a): `listar` não recebe `usuarioId?: number` primitivo. Para a (b): o
   carve-out está escrito no SPEC.

---

## NÃO implementar nesta task

- Qualquer outro módulo (inclusive a alteração equivalente em `execucao.repository.ts`).
- Reabrir a reconciliação §7.2 × §16 #21 (spec 48).
- Alterar comportamento, autorização, CTEs ou SQL — apenas assinatura/DTO.
- Tocar no frontend.
