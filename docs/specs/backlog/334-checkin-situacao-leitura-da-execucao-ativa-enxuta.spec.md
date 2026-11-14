# 334-checkin-situacao-leitura-da-execucao-ativa-enxuta.spec.md

> Task 6/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-006 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/checkin. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A situação do check-in lê a execução ativa com os nomes de atividade, demanda e projeto numa consulta só, em vez de listar com `allRows` todas as execuções da atividade para aproveitar uma linha.

## Contexto

**A-006 · Média · GET /checkin/situacao lista todas as execuções da atividade só para achar três nomes**

Com execução ativa, montarSituacao chama recuperarExecucaoAtivaDetalhada, que lê a execução ativa e depois lista com allRows todas as execuções da atividade para pegar os nomes da atividade, da demanda e do projeto. A listagem roda três consultas (COUNT, SUM de minutos e SELECT com quatro JOIN) e o resultado é descartado, menos uma linha. É a rota que o front confere a cada 3 s no diálogo e o Desktop a cada 15 s.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/checkin/services/checkin.service.ts:55-57 — montarSituacao chama recuperarExecucaoAtivaDetalhada a cada consulta
- backend/src/modules/execucao/domain/execucao-ativa-detalhada.ts:25-28 — recuperarAtiva e, em seguida, execucaoService.listar({ usuarioId, atividadeId, allRows: true }) com find pelo id
- backend/src/modules/execucao/repositories/execucao.repository.ts:303-344 — a listagem roda COUNT e SUM antes do SELECT
- backend/src/modules/execucao/repositories/execucao.repository.ts:354-390 — SELECT com JOIN em atividade, usuario, demanda e projeto, sem LIMIT quando allRows
- backend/src/modules/execucao/repositories/execucao.repository.ts:445-467 — recuperarAtiva já faz JOIN em atividade e poderia trazer os nomes

Como observar: Ligar o log de SQL do backend, iniciar uma execução numa atividade com muitas execuções e chamar GET /api/v1/checkin/situacao: aparecem o SELECT do usuário do token, o da execução ativa, um COUNT, um SUM e o SELECT de todas as execuções da atividade.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

A leitura nova do repository precisa de um DTO de saída próprio (contrato interno no `shared`).

**Antes:** `recuperarExecucaoAtivaDetalhada` lê a execução ativa e depois chama a listagem de execuções da atividade (COUNT, SUM e SELECT com quatro JOIN), descartando tudo menos uma linha.

**Opções:**

1. Criar a leitura `recuperarAtivaDetalhada` no `ExecucaoRepository` com um DTO novo de saída (nome a decidir pela skill `project20-dto-conventions`).
2. Reaproveitar um DTO existente que já tenha os três nomes, se algum servir sem campo sobrando.

## Entregáveis

1. Leitura única no `ExecucaoRepository` (SELECT com JOIN e `LIMIT 1`, todas as tabelas com `is_deleted = false`) usada por `execucao/domain/execucao-ativa-detalhada.ts`.
2. A resposta de `GET /checkin/situacao` não muda de formato.
3. Teste de integração do repository e ajuste dos testes da service do check-in.

## Critérios de Aceite

- `npm run test:integracao` cobre a leitura nova; a resposta da rota é idêntica à anterior para o mesmo cenário (comparada no teste da service).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mudar o que a rota devolve; as ferramentas de IA que também usam a execução ativa detalhada continuam com o mesmo resultado.

## Dependências

Decisão do autor acima.
