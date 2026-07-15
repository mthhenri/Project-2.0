# 95 — Topbar: chip global de execução ativa com timer e pausa inline

**Origem:** Revisão de UI/UX — print `prints/02-topbar.png` (callouts ①②), análise `analise-detalhada/layout-topbar.md`

**Depende de:** —

**Entrega:** chip persistente na topbar mostrando a execução ativa do usuário logado (ponto verde pulsante + descrição truncada + cronômetro ao vivo desde `inicioData`) com botão de **pausar inline** via popover. A regra "nunca duas execuções ativas" vira informação visível de qualquer tela.

> **Frontend apenas.** Usa `GET /execucao/ativa` (`ExecucaoAtivaDto`) e `PATCH /execucao/:id/encerrar`, já existentes.

---

## Escopo

1. **Serviço/signal compartilhado de execução ativa** (`core/signals`): carregado no boot do layout, atualizado após iniciar/pausar em **qualquer** tela (hoje cada tela consulta isoladamente) e re-sincronizado em `document:visibilitychange`/`window:focus` — o backend auto-encerra execuções às 23:59:59 (cron), sem o refresh o cronômetro exibiria tempo falso.
2. **Chip** entre a nav e as ações: exibe a **descrição da execução** (o DTO não traz nome da atividade; fallback "Execução em andamento") + cronômetro `HH:mm:ss`. Clique no corpo → `/execucao`. Sem execução: texto discreto "Sem execução ativa" → `/atividade` (some <1024px). Skeleton no boot.
3. **Popover Pausar**: textarea **pré-preenchida com a descrição atual** (o PATCH sobrescreve a descrição — enviar vazio apagaria), autofocus, Enter confirma, Esc cancela; obrigatória quando o dono da atividade é desenvolvedor, opcional quando gestor (regra do `ExecucaoEncerrarDto`). Encerramento otimista com rollback em erro + toast "Execução pausada — Xh registradas".

## Critérios de aceite

- Timer visível e correto em todas as telas autenticadas; pausar de qualquer tela em 2 cliques.
- Iniciar execução em Atividades/detalhe atualiza o chip sem reload; virada de dia não deixa cronômetro fantasma após refocar a aba.
- Dev nunca pausa execução alheia pelo chip (o endpoint já filtra por dono).

## NÃO implementar nesta task

- Reorganização do restante da topbar (task 96).
- Faixa de execução no detalhe da atividade (task 104).
