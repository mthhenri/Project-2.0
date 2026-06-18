# 36 — Atividade: coluna de tempo total executado

**Depende de:** 27 (frontend-atividade)
**Entrega:** nova coluna na listagem de atividades com o tempo total já executado (horas e minutos), somando a duração de todas as execuções da atividade.

> Backend (shared DTO + repositório) + frontend (coluna). Sem migration.

---

## Contexto

A listagem de atividades usa `AtividadeResumoDto`, que hoje **não** carrega tempo executado.
A duração de execução já é calculada no `ExecucaoRepository` via
`EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60`.

A query de listagem está em [atividade.repository.ts](../../../backend/src/modules/atividade/repositories/atividade.repository.ts) `listar()` (JOINs atividade → demanda → projeto).

---

## Backend

- Adicionar o campo `totalMinutosExecutados: number` a [AtividadeResumoDto](../../../shared/src/dtos/atividade/AtividadeResumoDto.ts).
- Em `listar()`, calcular o total via subconsulta escalar correlacionada (ou `LEFT JOIN LATERAL`) somando a duração das execuções da atividade:
  - somar `EXTRACT(EPOCH FROM (execucao.fim_data - execucao.inicio_data)) / 60` para execuções com `execucao.is_deleted = false` e `execucao.fim_data IS NOT NULL` (execuções em andamento **não** entram na soma);
  - usar `COALESCE(..., 0)::int` para atividades sem execuções retornarem `0`;
  - expor como `"totalMinutosExecutados"` no SELECT, no mesmo padrão de cálculo de duração do `ExecucaoRepository`.
- A subconsulta não deve alterar a contagem total (`COUNT`) nem a paginação — manter o `COUNT(atividade.id)` como está.

---

## Frontend

- Nova coluna na `p-table` (ex.: "Tempo executado"), exibindo `totalMinutosExecutados` formatado em horas/minutos com o pipe `MinutosParaHorasPipe` (já importado na página).
- Ajustar o `colspan` do template `empty` ao adicionar a coluna.

---

## Arquivos afetados

```
shared/src/dtos/atividade/AtividadeResumoDto.ts                      (+totalMinutosExecutados)
backend/src/modules/atividade/repositories/atividade.repository.ts   (listar: +soma de execuções)

frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html
```

---

## NÃO implementar nesta task

- Coluna de horas estimadas vs executadas / barra de progresso.
- Soma por demanda ou projeto.
- Incluir execuções em andamento no total (ficam de fora).
