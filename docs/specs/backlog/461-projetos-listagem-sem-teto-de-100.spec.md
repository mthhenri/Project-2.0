# 461-projetos-listagem-sem-teto-de-100.spec.md

> Task 133/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-181 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-05.
> Severidade: Baixa. Área: frontend/projeto.

## Objetivo

A tela Projetos mostra todos os projetos que o usuário pode ver, como os seletores já fazem desde a task 323.

## Contexto

**A-181 · Baixa · A tela Projetos pede uma página de 100 e filtra na tela: acima de 100 projetos, os demais somem em silêncio**

A task 323 trocou os seletores por `allRows`, mas a listagem de Projetos continua com `listar({ pagina: 1, itensPorPagina: LIMITE_PROJETOS })` e faz busca e filtro por status no navegador. O service já aceita `allRows`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/projeto/pages/projeto-listagem/projeto-listagem.page.ts:134 — `.listar({ pagina: 1, itensPorPagina: LIMITE_PROJETOS })`
- frontend/src/app/modules/projeto/services/projeto.service.ts:52 — `if (filtros.allRows) params = params.set('allRows', 'true')`

Como observar: Abrir `/projeto`: a aba de rede mostra `GET /projeto?pagina=1&itensPorPagina=100`.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13 (`GET /projeto?pagina=1&itensPorPagina=100` ao abrir a tela) e código lido pelo agente principal.

## Entregáveis

1. A listagem passa a `allRows: true` (a busca e o filtro continuam na tela) e a constante `LIMITE_PROJETOS` sai.
2. Teste de componente: a chamada usa `allRows`.

## Critérios de Aceite

- Ao vivo: abrir `/projeto` faz `GET /projeto?allRows=true`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

