# Task 179 — Testes: ponto e justificativas

> Task 9/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md).

## Objetivo

Provar o cálculo de ponto (diário, mensal e "todos hoje"): horas trabalhadas, intervalos, meta ponderada por fração de
dia, fim de semana como hora extra, meio período e desconto de justificativas — hoje só helpers do `PontoService` têm
teste.

## Entregáveis

### Backend

1. **`ponto.service`** com cenários de execuções e calendário montados por dublê:
   - dia útil (fração 1), meio período (0.5: excedente vira hora extra, saldo do dia nunca positivo), integral e fim de
     semana (fração 0; trabalho em fim de semana é hora extra e não conta na meta);
   - feriado recorrente vale em qualquer ano;
   - intervalos: gaps ≥ `INTERVALO_MINIMO_MINUTOS`, vários no mesmo dia, execução aberta ignorada (já há teste do helper:
     cobrir pela service);
   - mensal soma os dias e compara com a meta; justificativa desconta da meta (task 82);
   - `todos` só gestor; desenvolvedor só o próprio ponto.
2. **`ponto-justificativa`** (nada testado): service (só gestor cria/altera/exclui; uma por usuário e dia), repository
   (integração: unicidade por usuário+dia entre não excluídas, leitura usada pelo `ponto`), controller.
3. **Controller do ponto:** `/ponto/todos` com `@GestorOnly`.
4. **IA:** `consultar-ponto-do-dia` e `consultar-ponto-do-mes` — conferir `ferramentas-de-ponto.test.ts` e completar.

### Frontend

5. **Lógica:** `ponto.service` e `ponto-justificativa.service`.
6. **Componentes:** página `ponto` (modos diário/mensal/todos; "todos" só para gestor; vazio/erro),
   `ponto-resumo-card`, `ponto-usuario-card`, `ponto-mes-dia` (dia útil, meio período, não útil, fim de semana),
   `ponto-intervalo-lista`, `ponto-justificativa-dialog` (validação, só gestor), `ponto-impressao`.

## Critérios de Aceite

- Cada bullet de "Intervalos" e "Dias Não Úteis" de §14 e a regra de fração de §12 têm teste nomeado.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Fuso do navegador nas telas (`PROBLEMS.md` P-004, aceito). Cadastro de dias não úteis (180).

## Dependências

171, 172, 173, 178, 180 (fábricas de execução e de dia não útil). Fontes: `SYSTEM.SPEC.md` §12 (`ponto`), §14.
