# 471-modelagem-trocar-de-grupo-sem-reler-o-diagrama.spec.md

> Task 143/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-189 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/modelagem.

## Objetivo

Trocar o grupo de uma tabela, soltar uma tabela num grupo e tirar da modelagem deixam de pedir `GET /modelagem` (28 KB): o `PUT` já devolve grupo e posição.

## Contexto

**A-189 · Média · Modelagem: trocar o grupo de uma tabela relê o diagrama inteiro (28 KB), embora o PUT devolva grupo e posição**

Mover a tabela de grupo pelo painel, soltar uma tabela de fora dentro de um grupo e Tirar da modelagem terminam em relerDiagrama(), um GET /modelagem completo. O comentário diz que a releitura serve para saber onde a tabela caiu, mas ModelagemTabelaAlteradaDto já traz nome, grupoId, x e y. Arrastar uma tabela que já está na modelagem não tem esse problema: aplica x/y da resposta.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/modelagem/pages/modelagem/modelagem.page.ts:163-168 — moverParaGrupo chama gravarTabela sem a função aplicar
- frontend/src/app/modules/modelagem/pages/modelagem/modelagem.page.ts:189-198 — sem aplicar, o next faz gruposVisiveis.update(...) e this.relerDiagrama()
- frontend/src/app/modules/modelagem/pages/modelagem/modelagem.page.ts:171-176 — tirarDaModelagem: DELETE e depois relerDiagrama()
- frontend/src/app/modules/modelagem/pages/modelagem/modelagem.page.ts:205-206 — relerDiagrama() chama obterDiagrama()
- shared/src/dtos/modelagem/ModelagemTabelaAlteradaDto.ts:1-5 — nome, grupoId, x, y

Como observar: Como gestor em /modelagem, selecionar uma tabela e trocar o grupo no painel de detalhe. Na rede: PUT /modelagem/tabela/<nome> seguido de GET /modelagem (cerca de 28 KB).

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. `grupoId`, `x` e `y` da resposta aplicados na tabela local, como `salvarPosicao` já faz; teste de componente.

## Critérios de Aceite

- Ao vivo: mover uma tabela de grupo gera só o `PUT`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

