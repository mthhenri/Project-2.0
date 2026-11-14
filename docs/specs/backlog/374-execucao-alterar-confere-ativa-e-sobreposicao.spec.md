# 374-execucao-alterar-confere-ativa-e-sobreposicao.spec.md

> Task 46/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-061 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Alta. Área: backend/execucao.

## Objetivo

A regra "nunca duas execuções ativas para o mesmo dono" e a de não sobrepor períodos passam a valer também em `ExecucaoService.alterar`. Hoje só os executores da IA conferem, antes de chamar a mesma service.

## Contexto

**A-061 · Alta · PUT /execucao/:id reabre execução e muda o período sem conferir execução ativa nem sobreposição; a IA confere**

A rota aceita `fimData: null` (reabre) e qualquer início/fim passados, validando só futuro e ordem das datas. Os executores da IA conferem execução ativa e sobreposição antes de chamar a mesma service, porque ela não confere. Pela API, o desenvolvedor (nas próprias) e auxiliar/gestor (nas de qualquer um) deixam o mesmo dono com duas execuções ativas ou com horas sobrepostas no ponto.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- shared/src/dtos/execucao/ExecucaoAlterarDto.ts:13-21 — inicioData e fimData opcionais; comentário: null mantém 'em andamento'
- backend/src/modules/execucao/services/execucao.service.ts:371-398 — alterar: só confere data no futuro e fim > início, depois grava
- backend/src/modules/execucao/services/execucao.service.ts:250-251 — comentário: '`alterar` não confere sobreposição'
- backend/src/modules/execucao/repositories/execucao.repository.ts:473-484 — UPDATE direto de inicio_data e fim_data
- backend/src/modules/execucao/executores/corrigir-execucao.executor.ts:48 e 100-105 — exigirSemSobreposicao antes de alterar
- backend/src/modules/execucao/executores/pausar-execucao.executor.ts:49-57 e iniciar-execucao.executor.ts:106-110 — conferem execução ativa antes de reabrir

Como observar: Desenvolvedor com execução ativa E2 e execução própria já encerrada E1: PUT /api/v1/execucao/E1 {"descricao":"x","fimData":null}. Esperado: 400 (já há execução em andamento). O código responde 200 e o usuário fica com duas execuções sem fim. Variante: PUT com inicioData/fimData cobrindo outra execução do mesmo dia: 200.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14: como auxiliar, `PUT /execucao/:id` com `fimData: null` reabriu duas execuções encerradas do mesmo desenvolvedor (200 nas duas) e o banco ficou com 2 execuções abertas para o mesmo dono.

## Entregáveis

1. `ExecucaoService.alterar` confere a execução ativa do dono quando `fimData` vem `null` e a sobreposição (`validarSobreposicao` ignorando a própria execução) quando o período muda.
2. A conferência duplicada sai dos executores da IA, que passam a depender da service.
3. Testes da service: reabrir com outra ativa é recusado; mover o período para cima de outra execução do dono é recusado; os casos válidos continuam.

## Critérios de Aceite

- Repetir o roteiro: a segunda reabertura responde 400 com a mensagem da regra, e o banco nunca fica com duas execuções abertas do mesmo dono.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

O encerramento automático das 23:59:59.

## Dependências

Nenhuma.

