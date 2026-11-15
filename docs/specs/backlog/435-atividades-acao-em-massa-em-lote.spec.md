# 435-atividades-acao-em-massa-em-lote.spec.md

> Task 107/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-144, A-145 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; `PROBLEMS.md` P-085; auditoria anterior: R-14.
> Severidade: Média. Área: backend/atividade e frontend/atividade. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Mudar status, acrescentar tags, excluir e desfazer em massa deixam de disparar uma chamada por atividade (até 50 simultâneas) e de poder ficar pela metade. A rota em lote também é onde a regra "ação em massa é só do gestor" passa a valer no servidor: hoje ela é só da tela.

## Contexto

**A-144 · Média · Ação em massa nas atividades: uma requisição por item, todas ao mesmo tempo**

Mudar status, acrescentar tags, excluir e desfazer em massa disparam uma chamada por atividade selecionada em `forkJoin`, sem limite de concorrência, e depois recarregam a lista. Com 50 linhas por página são até 50 PUT ou DELETE simultâneos mais o GET, e o desfazer repete com 50 PATCH. O backend só tem rotas por id.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:697 — `alvos.map((atividade) => this.atividadeService.alterar(atividade.id, { status }))`
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:711-713 — um `alterarTags` por atividade, com a união de tags calculada no cliente
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:725-731 — um `excluir` por atividade em `forkJoin`; :740 — desfazer com um `restaurar` por atividade
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:752-757 — `aplicarEmMassa` junta tudo em `forkJoin` e chama `buscarAtividades()`
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html:180 — `rowsPerPageOptions` [10, 25, 50]
- backend/src/modules/atividade/controllers/atividade.controller.ts:41-136 — rotas: POST, GET, GET :id, PUT :id, DELETE :id, PATCH :id/restaurar, PUT :id/tag, GET :id/tag (nenhuma em lote)

Como observar: /atividade como gestor: selecionar várias linhas e trocar o status na barra em massa: N PUT /atividade/:id em paralelo e 1 GET /atividade. Excluir: N DELETE /atividade/:id; Desfazer: N PATCH /atividade/:id/restaurar. Não exercitado na medição.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

**A-145 · Média · Ação em massa nas atividades: não há rota; a trava do auxiliar é só da tela**

O backend não tem rota de ação em massa. A tela mostra a barra só com `sessao.eGestor()` e dispara N chamadas individuais de PUT /atividade/:id, PUT /atividade/:id/tag e DELETE /atividade/:id. Como cada chamada é permitida ao auxiliar, a regra 'auxiliar não faz ação em massa' não tem como ser aplicada no servidor e é só de interface.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/controllers/atividade.controller.ts:41-142 — oito rotas, nenhuma em lote
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html:664-666 — barra dentro de `@if (sessao.eGestor() && quantidadeSelecionada() > 0)`
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:690-697 — mudarStatusEmMassa: uma chamada alterar por atividade
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:704-713 e 721-732 — tags e exclusão em massa por forkJoin de chamadas individuais
- backend/src/modules/atividade/services/atividade.service.ts:202 e 277 — o auxiliar passa em cada chamada individual

Como observar: Auxiliar: repetir por script PUT /api/v1/atividade/:id {"status":"DESENVOLVENDO"} para dez ids. Todas respondem 200, o mesmo efeito da barra que a tela esconde.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

Rota e DTO novos: contrato.

**Antes:** a tela percorre a seleção chamando `PUT /atividade/:id`, `PUT /atividade/:id/tag`, `DELETE /atividade/:id` e `PATCH .../restaurar` por item e depois recarrega a lista.

**Opções:**

1. Rota em lote (ids e a alteração) para status, tags, excluir e restaurar, numa transação, com resultado por item ("N ok, M recusadas") e `@GestorOnly`.
2. Sem backend: limitar a concorrência no front e tratar a falha parcial; a regra do auxiliar continua só na tela e isso fica registrado no `SYSTEM.SPEC.md`.

Recomendação da auditoria: opção 1.

## Entregáveis

1. A opção escolhida; na 1, a rota aplica por item as mesmas regras de `AtividadeService` e tem teste de integração com falha no meio do lote.

## Critérios de Aceite

- Ao vivo: mudar o status de 10 atividades selecionadas gera uma requisição de escrita e uma recarga da lista.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Depois de `373-atividade-de-colega-so-o-dono-ou-quem-conduz-altera`.

