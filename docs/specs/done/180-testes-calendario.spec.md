# Task 180 — Testes: calendário (dias não úteis)

> Task 10/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md).

## Objetivo

Provar o cadastro de dias não úteis (só gestor), a recorrência, a duração (integral/meio período) e a consulta por
intervalo que o ponto e a IA consomem.

## Entregáveis

### Backend

1. **`calendario.service`** (2 testes, só `restaurar`): criar/alterar/excluir só gestor; data duplicada recusada
   (conferir regra para recorrente × não recorrente na mesma data); `tipo` e `duracao` independentes; leitura liberada a
   qualquer autenticado.
2. **`calendario.repository` (integração, 312 linhas):** consulta por intervalo devolve recorrentes de qualquer ano,
   inclusive em intervalo que atravessa o ano; excluído fora; unicidade.
3. **Regra pura:** `dias-nao-uteis-no-intervalo` (sem teste): virada de ano, 29/02, recorrente e pontual na mesma data.
4. **Controller:** permissão de cada rota.
5. **IA:** `consultar-dias-nao-uteis` já tem 5 testes — só lacuna.

### Frontend

6. **Lógica:** `calendario.service`.
7. **Componente:** `calendario-listagem` (vazio/cheio/erro; criar, editar e excluir só para gestor; formulário com
   recorrente e duração).

## Critérios de Aceite

- Bullets de "Dias Não Úteis" de §14 sobre cadastro e recorrência com teste; linha "Cadastrar dia não útil" de §14 também.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Efeito na meta do ponto (179).

## Dependências

171, 172, 173. Fontes: `SYSTEM.SPEC.md` §12 (`calendario`), §13 (DiaNaoUtil), §14.
