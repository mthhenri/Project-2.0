# 449-tags-excluir-e-restaurar-em-lote.spec.md

> Task 121/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-150 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-14.
> Severidade: Baixa. Área: backend/tag e frontend/tag. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A exclusão em lote de tags deixa de fazer um `DELETE` por tag (e o desfazer um `PATCH` por tag), com o risco de parar no meio sem oferecer o desfazer do que já foi excluído.

## Contexto

**A-150 · Baixa · Tags: excluir selecionadas faz um DELETE por tag e o desfazer um PATCH por tag**

A exclusão em lote monta um forkJoin com um DELETE /tag/:id por tag e o Desfazer outro com um PATCH /tag/:id/restaurar por tag. Se um DELETE falha, o forkJoin abandona os demais, a tela relê GET /tag e nenhum Desfazer é oferecido para as que já foram excluídas.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/tag/pages/tag-listagem/tag-listagem.page.ts:335 — forkJoin(alvos.map((tag) => this.tagService.excluir(tag.id)))
- frontend/src/app/modules/tag/pages/tag-listagem/tag-listagem.page.ts:339 — desfazer: forkJoin(alvos.map((tag) => this.tagService.restaurar(tag.id)))
- frontend/src/app/modules/tag/pages/tag-listagem/tag-listagem.page.ts:342 e 366-369 — no erro, buscarTagsAposFalha() repõe a lista e chama buscarTags()

Como observar: Em /tag, marcar 10 tags e clicar em excluir as selecionadas; depois Desfazer no toast. Na rede: 10 DELETE /tag/:id paralelos e, no desfazer, 10 PATCH /tag/:id/restaurar.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** um `forkJoin` de chamadas por tag; se uma falha, as demais são abandonadas.

**Opções:**

1. Exclusão e restauração em lote no backend (lista de ids, numa transação).
2. Só front: tratar a falha parcial e oferecer o desfazer do que foi excluído.

## Entregáveis

1. A opção escolhida, com teste do caso de falha no meio.

## Critérios de Aceite

- Ao vivo: excluir 5 tags gera uma requisição (opção 1) ou, com uma falhando, o desfazer das outras 4 continua oferecido (opção 2).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

