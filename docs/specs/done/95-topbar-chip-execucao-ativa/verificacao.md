# Task 95 — verificação

Data: 2026-10-16. Frontend apenas (usa `GET /execucao/ativa` e `PATCH /execucao/:id/encerrar`).

## O que foi feito

- `ExecucaoAtivaService` (core): signal da execução ativa do usuário logado; carrega no boot da topbar, limpa no
  logout e se ressincroniza em `document:visibilitychange` e `window:focus`.
- `execucaoAtivaInterceptor`: qualquer `POST /execucao` ou `PATCH /execucao/:id/encerrar` bem-sucedido refaz o
  carregamento — cobre listagem, detalhe e o próprio chip, sem cada tela avisar.
- `app-chip-execucao-ativa` na topbar: ponto pulsante, descrição truncada (fallback "Execução em andamento"),
  cronômetro `HH:mm:ss` que só corre com execução ativa e link para `/execucao`; "Sem execução ativa" (→ `/atividade`,
  some abaixo de 1024 px); esqueleto na primeira carga; abaixo de 640 px só o cronômetro.
- Popover de pausa: textarea pré-preenchida com a descrição atual, autofocus, Enter confirma (Shift+Enter quebra
  linha), Esc cancela, obrigatória para desenvolvedor e opcional para gestor; encerramento otimista com rollback
  e toast "Execução pausada — Xh Ymin registradas". Pausar pelo chip recarrega a listagem de Atividades se aberta.

## Verificado ao vivo (Chromium, API real)

- Chip em `/ponto`, `/tag`, `/demanda` e `/atividade`; cronômetro 01:06:11 → 01:06:13 em 2 s.
- Popover com a descrição atual e foco no campo; Esc fecha sem pausar. Com `PATCH` falhando (500), o chip some na
  hora e volta; com sucesso: `PATCH /execucao/1/encerrar`, chip vira "Sem execução ativa" e o toast mostra
  "Execução pausada — 1h 10min registradas".
- Iniciar em `/atividade` (Ctrl+Enter no dialog) faz o chip aparecer sem reload; pausar pelo chip com a lista
  aberta troca o botão da linha para "play".
- Execução iniciada por fora aparece ao refocar a janela; encerrada por fora (equivale ao cron das 23:59:59) some
  ao refocar — sem cronômetro fantasma.
- Capturas em `.artifacts/95-topbar-chip-execucao-ativa/`.

## Limites / pendente

- A 360×800 a topbar continua com overflow horizontal (≈1529 px, era ≈1388 px): é o P-002, tratado na task 96.
- Virada de dia real (cron) simulada por encerramento externo; não esperei 23:59:59.
- A pausa pelo chip só atualiza a lista de Atividades; Execuções/Ponto abertos se atualizam ao refocar a aba.
- Desenvolvedor não pausa execução alheia pelo chip porque o chip só mostra a execução do usuário logado
  (`/execucao/ativa`); não testei com uma conta de desenvolvedor.
- O bundle inicial cresceu ≈17 kB (budget de 500 kB já estourado antes).
- Frontend sem testes automatizados (P-001).
