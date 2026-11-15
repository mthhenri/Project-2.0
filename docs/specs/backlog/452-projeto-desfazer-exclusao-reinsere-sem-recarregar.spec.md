# 452-projeto-desfazer-exclusao-reinsere-sem-recarregar.spec.md

> Task 124/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-153 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/projeto.

## Objetivo

Depois de `PATCH /projeto/:id/restaurar`, o projeto volta para a lista local (como a tela de Tags faz), sem `GET /projeto` de novo.

## Contexto

**A-153 · Baixa · Desfazer a exclusão de um projeto recarrega a lista inteira**

Depois do PATCH /projeto/:id/restaurar a listagem chama buscarProjetos() e pede de novo GET /projeto?pagina=1&itensPorPagina=100. O card removido está na closure (projeto e listaAnterior) e a tela de Tags, no mesmo fluxo, só reinsere o item local.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/projeto/pages/projeto-listagem/projeto-listagem.page.ts:222-230 — listaAnterior guardada; desfazer: restaurar(projeto.id); aposDesfazer: () => this.buscarProjetos()
- frontend/src/app/modules/tag/pages/tag-listagem/tag-listagem.page.ts:307-308 — na tag, aposDesfazer: () => this.inserirTag(tag)

Como observar: Em /projeto, excluir um projeto pelo menu do card e clicar em Desfazer no toast. Na rede: DELETE /projeto/:id, PATCH /projeto/:id/restaurar e GET /projeto?pagina=1&itensPorPagina=100.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. O projeto restaurado é reinserido na posição; teste de componente.

## Critérios de Aceite

- Ao vivo: desfazer a exclusão gera só o `PATCH`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

