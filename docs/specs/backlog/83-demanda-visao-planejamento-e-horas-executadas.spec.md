# 83 — Demanda: visão de Planejamento (gestor) + horas executadas no grafo/lista

**Depende de:** 12 (demanda-grafo), 14/36 (atividade + tempo executado), 15/41 (execução + duração), 26 (frontend-demanda), 46 (demanda-permissões de visualização), 71 (gestor acesso total sem atribuição), 79 (status como tabela de referência)

**Entrega:** na tela de demandas de um projeto (`/demanda`), o **gestor** ganha um **terceiro modo de visualização — "Planejamento"** (ao lado de Grafo e Lista): uma **tabela flat** (sem árvore) das demandas de trabalho **não-concluídas** do projeto, cada linha nomeada pelo **caminho hierárquico** (`Pai - Filho - Neto`), mostrando **horas estimadas × executadas + %**, **alerta de estouro** (executado ≥ estimado) e **quem está executando agora**. Em paralelo, **grafo e lista** passam a exibir, para todos os usuários, as **horas executadas sumarizadas** (só o número) de cada demanda.

> Backend: módulo `demanda` (novo método de repositório + service + 1 rota `@GestorOnly()`). Shared: 3 DTOs novos + 1 campo em 2 DTOs existentes. Frontend: novo modo + componente de painel + horas no item da lista e no tooltip do grafo. **Sem migration** — nenhuma mudança de schema (tudo deriva de `demanda`/`atividade`/`execucao`).

---

## Contexto

A tela [demanda-projeto.page.ts](../../../frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts) alterna hoje entre **Grafo** (D3) e **Lista** (árvore) via o signal `modoVisualizacao: 'grafo' | 'lista'`. A **lista é construída no front a partir dos nós do grafo** (`construirArvore`, a partir de `grafo().nos`), então **um campo novo em `DemandaGrafoNoDto` alimenta grafo e lista de uma vez**.

Não há coluna de "horas executadas" — elas derivam da cadeia `execucao → atividade → demanda`:
[demanda.repository.ts](../../../backend/src/modules/demanda/repositories/demanda.repository.ts) já usa CTEs recursivas (`listarDescendentes`, `listarAncestral`) e subconsultas escalares com `JSON_AGG`/`COALESCE` (no `recuperarGrafo`, para tags). A duração de execução é calculada em
[execucao.repository.ts](../../../backend/src/modules/execucao/repositories/execucao.repository.ts) como
`EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60` (minutos) — reaproveitar exatamente essa expressão. A tabela `atividade` tem `demanda_id` e `usuario_id` (ambos NOT NULL, com índice `ix_atividade_demanda`), então a agregação é barata.

Controle de acesso gestor-only já tem padrão pronto: o decorator `@GestorOnly()` (usado em `@Delete(':id')` e nas rotas de conexão da própria controller) e, no front, `sessao.eGestor()` (já usado para esconder "Nova Demanda" e itens de menu para o desenvolvedor).

---

## Decisões de escopo (registradas)

1. **"Em desenvolvimento" não é status.** Os status da demanda são apenas `PENDENTE`, `PLANEJADA`, `CONCLUIDA`. A visão de Planejamento lista as **não-concluídas** (`PENDENTE` + `PLANEJADA`). "Em desenvolvimento" é um **estado derivado** — a demanda tem execução ativa e/ou horas executadas — e **não** vira status novo. (O estado `DESENVOLVENDO` existe só no nível de `atividade`, o que é coerente com derivar isso das execuções.)
2. **Escopo por projeto.** É o **terceiro modo** da tela atual de demandas (mesmo `projetoId` selecionado), não uma tela nova nem cross-project.
3. **Só horas próprias.** As horas executadas de uma demanda somam **apenas as atividades diretas dela** — **sem rollup recursivo** para pais/estruturais. Mesma regra no grafo e na lista.
4. **Linhas do flat = só folhas de trabalho.** Apenas demandas `is_estrutural = false` viram linha. As estruturais entram **somente como prefixo** no nome (`caminho`). Toda linha tem, portanto, comparação estimado × executado significativa.
5. **Granularidade: nível demanda.** Uma linha por demanda com os agregados. **Drill-down de atividades/execuções por demanda é fase 2** (fora desta task).
6. **Colunas confirmadas:** estimado × executado + %, alerta de estouro, e quem executa agora. **Sem** coluna de `previsao_fim_data` nesta versão.
7. **Horas sumarizadas no grafo/lista são para todos.** O número de horas executadas por demanda aparece no tooltip do grafo e no item da lista para qualquer usuário que já enxerga o grafo (dev e gestor). Só a **visão Planejamento** é exclusiva do gestor.
8. **Cálculo invariante a fuso.** As horas somam **apenas execuções encerradas** (`fim_data IS NOT NULL`), pela diferença entre dois timestamps gravados; **nunca** comparar com `NOW()`/relógio do banco (coerente com a correção de fuso da task 75). "Quem executa agora" apenas **lista** os executores ativos (não calcula duração ao vivo).

---

## Shared — DTOs (`shared/src/dtos/demanda/`)

A visão de Planejamento é um **recorte computado** (como `PontoDiarioDto`): `Entidade + Recorte + Dto`, **sem verbo no particípio**. DTOs de negócio declaram os próprios campos (sem `extends` de outro DTO de negócio).

**Novos:**

```typescript
// DemandaPlanejamentoDto.ts — item do recorte (uma demanda de trabalho)
export class DemandaPlanejamentoDto {
  demandaId: number;
  caminho: string;                  // "Pai - Filho - Neto" (nome com ancestrais)
  status: TipoDemandaStatusEnum;    // PENDENTE | PLANEJADA
  horasEstimadas: number;           // demanda.horas_estimadas
  minutosExecutados: number;        // soma das execuções encerradas das atividades diretas
  executoresAtivos: ExecutorAtivoDto[]; // quem está executando agora (pode ser vazio)
}

// ExecutorAtivoDto.ts — value-object (usuário com execução aberta)
export class ExecutorAtivoDto {
  usuarioId: number;
  nomeCompleto: string;
}

// DemandaPlanejamentoListarDto.ts — parâmetros de entrada (espelha DemandaGrafoRecuperarDto)
export class DemandaPlanejamentoListarDto {
  projetoId: number;                // injetado pela controller a partir de @Query
}
```

**Modificados (adicionar 1 campo cada):**
- `DemandaGrafoNoDto.ts` → `+ minutosExecutados: number;`
- `DemandaArvoreItemDto.ts` → `+ minutosExecutados: number;`

> Todos os campos desses DTOs (e dos 3 novos) são decorados com `@ApiProperty` — o campo novo deve
> vir com `@ApiProperty({ example: 120 })`, seguindo o padrão dos demais campos das classes.

`index.ts` do diretório `demanda` exporta os 3 DTOs novos.

> Percentual de progresso e flag de estouro **não** entram no DTO — são derivados na apresentação (front): `percentual = horasEstimadas > 0 ? minutosExecutados / (horasEstimadas*60) : 0`; `estourou = horasEstimadas > 0 && minutosExecutados >= horasEstimadas*60`. Tratar `horasEstimadas = 0` (sem divisão por zero; exibir progresso como indefinido).

---

## Backend — módulo `demanda`

### `demanda.repository.ts`

**Novo — `listarPlanejamento(dto: DemandaPlanejamentoListarDto): Promise<DemandaPlanejamentoDto[]>`** (com JSDoc):
- CTE recursiva descendo das raízes do projeto, acumulando o caminho:
  `caminho_demanda.caminho || ' - ' || demanda_filho.nome` (mesmo estilo de `listarDescendentes`/`listarAncestral`).
- Seleciona da CTE apenas `is_estrutural = false` e `tipo_demanda_status.codigo IN ('PENDENTE','PLANEJADA')`, com `is_deleted = false` em todas as tabelas.
- `minutosExecutados`: subconsulta escalar
  `COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (execucao.fim_data - execucao.inicio_data)) / 60)
             FROM atividade INNER JOIN execucao ON execucao.atividade_id = atividade.id
               AND execucao.is_deleted = false AND execucao.fim_data IS NOT NULL
             WHERE atividade.demanda_id = caminho_demanda.id AND atividade.is_deleted = false), 0)::int`.
- `executoresAtivos`: subconsulta `JSON_AGG`/`JSON_BUILD_OBJECT` (mesmo padrão das tags no `recuperarGrafo`)
  sobre execuções abertas (`execucao.fim_data IS NULL`) das atividades da demanda, juntando `usuario`
  (`usuario.id` = `atividade.usuario_id`), com `COALESCE(..., '[]'::json)`.
- `ORDER BY caminho`. Parâmetros nomeados; nenhum `VALUES`/`DEFAULT`/alias abreviado.

**Modificar — `recuperarGrafo`:** adicionar ao SELECT de **nós** a mesma subconsulta escalar de `minutosExecutados` (só atividades diretas, execuções encerradas). Arestas inalteradas.

### `demanda.service.ts`

**Novo — `listarPlanejamento(dto: DemandaPlanejamentoListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<DemandaPlanejamentoDto[]>>`** — chama o repositório e embrulha em `StandardResponse` (espelha `listarAtribuidas`). A restrição gestor-only fica no `@GestorOnly()` da controller; gestor tem acesso total, **sem** filtro por `demanda_usuario`.

### `demanda.controller.ts`

**Nova rota** (controller burra), **declarada ANTES de `@Get(':id')`** — como `@Get('grafo')` e `@Get('atribuidas')` — senão `planejamento` é capturado como `:id`:

```typescript
@ApiOperation({ summary: 'Listar demandas não-concluídas do projeto com horas executadas e execuções ativas (somente gestor)' })
@GestorOnly()
@Get('planejamento')
listarPlanejamento(
  @Query('projetoId', ParseIntPipe) projetoId: number,
  @ActiveUser() usuarioAtivo: JwtPayload,
) {
  return this.demandaService.listarPlanejamento({ projetoId }, usuarioAtivo);
}
```

`recuperarGrafo` permanece **sem** guard adicional — o `minutosExecutados` no grafo/lista é visível a quem já vê o grafo.

---

## Frontend — `modules/demanda/`

- **`models/demanda.model.ts`** → `export type ModoVisualizacao = 'grafo' | 'lista' | 'planejamento';`
- **`services/demanda.service.ts`** → `listarPlanejamento(projetoId: number): Observable<StandardResponse<DemandaPlanejamentoDto[]>>` → `GET demanda/planejamento?projetoId=`.
- **`components/demanda-planejamento-painel/` (novo, standalone)** — tabela flat (`p-table`):
  - Colunas: **Demanda** (`caminho`); **Status** (tag, reusar cores de status existentes em `constants/demanda-cores.constants.ts`); **Estimado × Executado** (barra de progresso + `Xh / Yh`, formatando `minutosExecutados`→horas, reaproveitando o pipe `MinutosParaHorasPipe`); **Estouro** (ícone/tag quando `estourou`); **Executando agora** (nomes/avatars de `executoresAtivos`, ou "—").
  - Entrada via `input()`: `itens: DemandaPlanejamentoDto[]`, `carregando: boolean`. `computed` por linha para `percentual`/`estourou`. SCSS BEM em português; cores **sempre** via aliases de tema (`--app-surface-*`/utilitários semânticos), nunca `--p-surface-N` direto.
- **`pages/demanda-projeto/demanda-projeto.page.ts`** — importar o componente; `planejamento = signal<DemandaPlanejamentoDto[]>([])` + `carregandoPlanejamento`; em `alternarModo`, ao entrar em `'planejamento'` (e `sessao.eGestor()`), buscar via service; em `construirArvore`, mapear `minutosExecutados: no.minutosExecutados`.
- **`pages/demanda-projeto/demanda-projeto.page.html`** — terceiro botão no toggle **dentro de `@if (sessao.eGestor())`** (mesmo padrão visual de Grafo/Lista), `(onClick)="alternarModo('planejamento')"`; render condicional `@if (modoVisualizacao() === 'planejamento') { <app-demanda-planejamento-painel [itens]="planejamento()" [carregando]="carregandoPlanejamento()" /> }`.
- **`components/demanda-arvore-item/demanda-arvore-item.component.html`** — exibir horas executadas junto das estimadas (ex.: `Yh est. · Xh exec.`) usando o novo `minutosExecutados`.
- **`components/demanda-grafo/demanda-grafo.component.ts`** — acrescentar horas executadas ao tooltip do nó (ex.: `… • Xh executadas`).

---

## Arquivos afetados

```
shared/src/dtos/demanda/DemandaPlanejamentoDto.ts        (novo)
shared/src/dtos/demanda/ExecutorAtivoDto.ts              (novo)
shared/src/dtos/demanda/DemandaPlanejamentoListarDto.ts  (novo)
shared/src/dtos/demanda/DemandaGrafoNoDto.ts             (+ minutosExecutados)
shared/src/dtos/demanda/DemandaArvoreItemDto.ts          (+ minutosExecutados)
shared/src/dtos/demanda/index.ts                         (exportar os 3 novos)

backend/src/modules/demanda/repositories/demanda.repository.ts  (+ listarPlanejamento, mod recuperarGrafo)
backend/src/modules/demanda/services/demanda.service.ts         (+ listarPlanejamento)
backend/src/modules/demanda/controllers/demanda.controller.ts   (+ rota @GestorOnly() @Get('planejamento'))

frontend/src/app/modules/demanda/models/demanda.model.ts                                    (+ 'planejamento')
frontend/src/app/modules/demanda/services/demanda.service.ts                                (+ listarPlanejamento)
frontend/src/app/modules/demanda/components/demanda-planejamento-painel/*.{ts,html,scss}    (novo)
frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.{ts,html}       (3º modo + fetch + map)
frontend/src/app/modules/demanda/components/demanda-arvore-item/demanda-arvore-item.component.html (horas exec.)
frontend/src/app/modules/demanda/components/demanda-grafo/demanda-grafo.component.ts        (tooltip)
```

Sem migration — nenhuma mudança de schema.

---

## Verificação

1. `npm run build --workspace=backend` (cobre o type-check do `shared`) e `npm run build --workspace=frontend` sem erros novos.
2. Sem migration: `npm run db:up` e a API sobem sem `db:migrate` adicional.
3. **Gestor:** `GET /demanda/planejamento?projetoId=<id>` → 200, lista flat **só** com demandas `is_estrutural=false` não-concluídas, `caminho` concatenado (`Pai - Filho - Neto`), `minutosExecutados` e `executoresAtivos` corretos.
4. **Desenvolvedor:** mesma rota → **403** (`@GestorOnly()`).
5. `GET /demanda/grafo?projetoId=<id>` → cada nó traz `minutosExecutados`.
6. **Frontend:** como **gestor** aparece o 3º botão "Planejamento"; como **desenvolvedor** só Grafo/Lista. A nova visão mostra estimado × executado + %, alerta de estouro e quem executa agora.
7. Grafo (tooltip) e Lista (item) exibem as horas executadas sumarizadas.
8. **Ponta a ponta:** iniciar uma execução numa atividade da demanda → a demanda aparece em "executando agora" no Planejamento; encerrar a execução → `minutosExecutados` aumenta; quando executado ≥ estimado, o alerta de estouro acende.
9. Conformidade: SELECTs com `is_deleted = false`, parâmetros nomeados, sem `VALUES`/`DEFAULT`/alias abreviado; nenhum DTO redefinido fora do `shared`; nomes de negócio em português.

---

## NÃO implementar nesta task

- **Drill-down de atividades/execuções** por demanda na visão Planejamento (é a **fase 2** desta visão).
- **Rollup recursivo** de horas para pais/demandas estruturais — esta task é estritamente "só horas próprias".
- **Visão cross-project / tela própria** de planejamento — escopo é o projeto selecionado.
- **Coluna `previsao_fim_data`** ou outros indicadores além dos confirmados.
- **Exportação CSV/XLSX** e relatório por período — isso é a backlog **spec 80** (distinta, sem dependência mútua).
- **Qualquer mudança de schema/migration** — todos os números derivam de tabelas existentes.
- **Acesso de desenvolvedor à visão Planejamento** — é exclusiva de gestor (`@GestorOnly()` no backend, `@if (sessao.eGestor())` no front).
