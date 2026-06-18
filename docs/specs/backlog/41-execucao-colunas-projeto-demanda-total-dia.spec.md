# 41 — Execução: colunas de projeto e demanda + total de tempo do dia

**Depende de:** 15 (execucao-module), 28 (frontend-execucao), 37 (execucao-data-hora-inicio-fim)
**Entrega:** a tela de Execuções passa a exibir, para cada execução, o **nome do projeto** e o **nome da demanda** como colunas próprias na listagem; ao final da listagem, exibe a **soma de todos os tempos de execução do dia filtrado**.

> Backend (shared DTO + repositório + service) + frontend (colunas + rodapé). Sem migration.

---

## Contexto

A listagem de execuções usa `ExecucaoResumoDto`, que hoje carrega apenas a atividade
(`atividadeId`, `nomeAtividade`) e o usuário (`usuarioId`, `nomeUsuario`) — **não** carrega
projeto nem demanda.

A query de listagem está em
[execucao.repository.ts](../../../backend/src/modules/execucao/repositories/execucao.repository.ts)
`listar()`, que hoje faz `execucao → atividade → usuario`. A cadeia até projeto/demanda já existe
no schema: `atividade.demanda_id → demanda.projeto_id → projeto` (mesmos JOINs já praticados em
[atividade.repository.ts](../../../backend/src/modules/atividade/repositories/atividade.repository.ts)
`listar()`).

A listagem é paginada e filtrada por dia (`DATE(execucao.inicio_data) = :data`) e, para gestor,
opcionalmente por usuário. A coluna **Duração** já é exibida via
`EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, NOW()) - execucao.inicio_data))::int / 60`
(execuções em andamento contam até o momento atual).

O `ExecucaoService.listar()` devolve hoje `StandardResponse<PaginatedResult<ExecucaoResumoDto>>`.

---

## Backend

### Shared

**`ExecucaoResumoDto`** ([ExecucaoResumoDto.ts](../../../shared/src/dtos/execucao/ExecucaoResumoDto.ts))
— adicionar os campos de projeto e demanda (no padrão de nomenclatura já usado para atividade/usuário):

```typescript
export class ExecucaoResumoDto {
  id: number;
  atividadeId: number;
  nomeAtividade: string;
  demandaId: number;
  nomeDemanda: string;
  projetoId: number;
  nomeProjeto: string;
  descricao: string;
  inicioData: Date;
  fimData: Date | null;
  duracaoMinutos: number | null;
  usuarioId: number;
  nomeUsuario: string;
}
```

**`ExecucaoListaDto`** (saída, novo — `shared/src/dtos/execucao/ExecucaoListaDto.ts`) — payload da
listagem com os campos de paginação **e** o total de minutos do dia. Define os próprios campos
explicitamente (sem alias/re-export de `PaginatedResult`, conforme convenção):

```typescript
import { ExecucaoResumoDto } from './ExecucaoResumoDto';

export class ExecucaoListaDto {
  itens: ExecucaoResumoDto[];
  totalItens: number;
  paginaAtual: number;
  itensPorPagina: number;
  totalPaginas: number;
  totalMinutosDia: number;
}
```

Exportar `ExecucaoListaDto` em `shared/src/dtos/execucao/index.ts`.

### Repositório (`ExecucaoRepository.listar`)

- Adicionar os JOINs para `demanda` e `projeto`, tanto na query de `COUNT` quanto na de itens
  (alias completo, sem abreviação):
  ```sql
  INNER JOIN demanda
    ON demanda.id = atividade.demanda_id
  INNER JOIN projeto
    ON projeto.id = demanda.projeto_id
  ```
  e incluir `demanda.is_deleted = false` e `projeto.is_deleted = false` nas condições (junto das
  já existentes `execucao/atividade/usuario.is_deleted = false`).
- Acrescentar ao SELECT de itens:
  ```sql
  demanda.id     AS "demandaId",
  demanda.nome   AS "nomeDemanda",
  projeto.id     AS "projetoId",
  projeto.nome   AS "nomeProjeto",
  ```
- **Total do dia:** calcular o somatório de minutos de **todas** as execuções que casam com os
  mesmos filtros (mesma cláusula `WHERE`), **sem paginação**, usando a mesma expressão de duração
  da coluna (execuções em andamento contam até `NOW()`), de modo que o rodapé seja o total do dia
  inteiro e não apenas da página visível:
  ```sql
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, NOW()) - execucao.inicio_data))::int / 60
  ), 0)::int AS "totalMinutosDia"
  FROM execucao
  INNER JOIN atividade ON atividade.id = execucao.atividade_id
  INNER JOIN usuario   ON usuario.id   = atividade.usuario_id
  INNER JOIN demanda   ON demanda.id   = atividade.demanda_id
  INNER JOIN projeto   ON projeto.id   = demanda.projeto_id
  WHERE ${clausulaWhere}
  ```
- Alterar o retorno de `listar()` para `{ itens, total, totalMinutosDia }`. A query de `COUNT`
  (paginação) permanece com `COUNT(execucao.id)` — o total de minutos é uma query separada.

### Service (`ExecucaoService.listar`)

- Trocar o tipo de retorno para `StandardResponse<ExecucaoListaDto>`.
- Repassar `totalMinutosDia` (vindo do repositório) ao montar a resposta, ao lado dos campos de
  paginação já existentes (`itens`, `totalItens`, `paginaAtual`, `itensPorPagina`, `totalPaginas`).
- O controle de escopo do desenvolvedor (`usuarioIdRestricao`) **não muda** — o total do dia
  respeita o mesmo filtro: desenvolvedor soma só as próprias execuções; gestor, conforme o filtro
  de usuário selecionado.

---

## Frontend

### `ExecucaoService` ([execucao.service.ts](../../../frontend/src/app/modules/execucao/services/execucao.service.ts))

- Mudar o tipo de retorno de `listar()` de `StandardResponse<PaginatedResult<ExecucaoResumoDto>>`
  para `StandardResponse<ExecucaoListaDto>` (importar `ExecucaoListaDto` do shared). Os filtros e a
  montagem de `HttpParams` não mudam.

### `ExecucaoHistoricoPage`

**Colunas (`p-table`)** — adicionar **Projeto** e **Demanda** antes de **Atividade**, mantendo
a coluna de usuário (só gestor) como primeira:

```
[Usuário] · Projeto · Demanda · Atividade · Início · Fim · Duração · Descrição · [Ações]
```

- **Projeto:** exibir `execucao.nomeProjeto` (texto).
- **Demanda:** exibir `execucao.nomeDemanda` (texto).
- A coluna **Atividade** continua como link para `/atividade/:atividadeId`, sem alteração.

**Rodapé com o total do dia** — adicionar um `<ng-template #footer>` à `p-table` com uma linha que
exibe o total de tempo do dia filtrado, alinhado sob a coluna **Duração**:

- rótulo "Total do dia" e o valor `totalMinutosDia() | minutosParagHoras` (pipe `MinutosParaHorasPipe`
  já importado na página);
- usar `colspan` para posicionar o rótulo e o valor de acordo com o número de colunas (lembrar que a
  coluna **Usuário** e a coluna **Ações** só existem para gestor).

**Component TS:**
- novo `readonly totalMinutosDia = signal<number>(0);`
- em `buscarExecucoes()`, no `next`, além de `execucoes`/`totalRegistros`, fazer
  `this.totalMinutosDia.set(resposta.dados.totalMinutosDia)`.

**Ajuste do `emptymessage`:** o `colspan` atual `sessao.eGestor() ? 7 : 5` passa a
`sessao.eGestor() ? 9 : 7` (duas colunas novas).

> A formatação data+hora das colunas Início/Fim (task 37) e o dialog de edição (gestor) **não mudam**.

---

## Arquivos afetados

```
shared/src/dtos/execucao/ExecucaoResumoDto.ts        (+demandaId/nomeDemanda/projetoId/nomeProjeto)
shared/src/dtos/execucao/ExecucaoListaDto.ts          (novo)
shared/src/dtos/execucao/index.ts                     (exportar ExecucaoListaDto)

backend/src/modules/execucao/repositories/execucao.repository.ts  (listar: JOINs demanda/projeto + soma do dia)
backend/src/modules/execucao/services/execucao.service.ts          (listar: retorna ExecucaoListaDto + totalMinutosDia)

frontend/src/app/modules/execucao/services/execucao.service.ts                                  (tipo de retorno)
frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts           (signal totalMinutosDia)
frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.html         (colunas + rodapé)
frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.scss          (se necessário)
```

Sem migration — nenhuma mudança de schema.

---

## NÃO implementar nesta task

- Filtro por projeto ou por demanda na listagem (apenas exibição das colunas).
- Link/navegação nas colunas Projeto/Demanda (texto puro; o link da Atividade permanece).
- Total por projeto, por demanda ou por usuário — apenas o total único do dia filtrado.
- Excluir execuções em andamento do total (elas contam até `NOW()`, igual à coluna Duração).
- Qualquer mudança no dialog de edição de execução ou no fluxo de iniciar/encerrar.
