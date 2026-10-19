# Task 186 — Testes: check-in

> Task 16/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md). `checkin.service` tem 10 testes; agenda e
> contexto, 13.

## Objetivo

Completar o check-in: sorteio e estado em memória do próximo check-in, suspensão por reunião, as ferramentas e o executor
de suspensão (só com a flag ligada), as rotas e as telas da janelinha.

## Entregáveis

### Backend

1. **`checkin-agenda.service`:** próximo check-in sorteado entre mínimo e máximo da configuração ativa, recomeçado a cada
   execução nova e na volta da reunião; `disparado`; por usuário, sem vazar entre usuários.
2. **`checkin-suspensao.service`:** conferir `checkin-suspensao.test.ts` e completar: acaba ao retomar e à meia-noite do
   fuso; por usuário.
3. **Executor `suspender-checkin`** (`SUSPENDER`/`RETOMAR`, desfazer) e **`propor-checkin.ferramentas`**: escondidas da
   lista e recusadas pelo registro com a flag check-in inteligente desligada.
4. **Controller:** `situacao`, `suspensao` e `mensagem`; `mensagem` responde 409 sem execução em andamento, antes de
   qualquer evento; sempre o próprio usuário.

### Frontend

5. **Lógica:** `checkin.service`; `checkin.util` já testado — só lacuna.
6. **Componentes:** página `checkin` (layout próprio, conversa, 409 sem execução) e `checkin-janelinha` (diálogo central,
   aparece no horário do backend, não aparece suspenso).

## Critérios de Aceite

- `npm test` e builds verdes (o domínio não tem repository; integração não se aplica, registrado no fecho); divergências
  como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Janelinha do Project Desktop (`desktop/`, já testada nas funções puras).

## Dependências

172, 173, 184, 185. Fontes: `SYSTEM.SPEC.md` §12 (`checkin`, `ferramenta-ia`).
