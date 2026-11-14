# 409-metodos-http-do-front-sem-chamador.spec.md

> Task 81/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-108 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend (atividade, calendario, demanda, execucao).

## Objetivo

Tirar dos services do frontend os quatro métodos de requisição que não têm chamador, com os testes que só os cobriam.

## Contexto

**A-108 · Baixa · Quatro métodos HTTP de services do frontend sem nenhum chamador**

Varredura por script dos 195 métodos do frontend que fazem HTTP: quatro só aparecem na própria definição e no teste do service. `AtividadeService.recuperarExecucaoAtiva()` e `ExecucaoService.buscarAtiva()` pedem `GET /execucao/ativa`, que hoje é do `ExecucaoAtivaService`; `CalendarioService.verificarDiaUtil()` pede `GET /calendario/verificar`; `DemandaService.recuperarAncestral()` pede `GET /demanda/:id/ancestral`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/services/atividade.service.ts:81 — `recuperarExecucaoAtiva()`
- frontend/src/app/modules/execucao/services/execucao.service.ts:61 — `buscarAtiva()`
- frontend/src/app/modules/calendario/services/calendario.service.ts:47 — `verificarDiaUtil()`
- frontend/src/app/modules/demanda/services/demanda.service.ts:114 — `recuperarAncestral()`

Verificação na auditoria: varredura por script e `grep` do agente principal em 2026-11-14: uma ocorrência fora de teste para cada nome (a definição).

## Entregáveis

1. Remover os quatro métodos e os casos de teste que só os exercitam, depois de `npm run impacto` em cada service confirmar que não há consumidor.

## Critérios de Aceite

- Build e testes do frontend sem erro; `grep` pelos quatro nomes em `frontend/src` não devolve nada.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

As rotas do backend correspondentes (spec `408-rotas-sem-consumidor-na-interface`).

## Dependências

Nenhuma.

