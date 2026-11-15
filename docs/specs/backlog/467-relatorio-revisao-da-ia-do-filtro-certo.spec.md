# 467-relatorio-revisao-da-ia-do-filtro-certo.spec.md

> Task 139/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-185 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/relatorio.

## Objetivo

Trocar projeto, mês ou ano com uma revisão por IA em andamento deixa de mostrar a revisão do período antigo junto do relatório novo.

## Contexto

**A-185 · Média · Relatório: a revisão por IA pedida antes de trocar o filtro aparece ao lado do relatório novo**

Trocar projeto/mês/ano limpa a revisão e pede nova prévia, mas o POST /relatorio/execucao/revisar que já estava em andamento não é cancelado nem comparado com os parâmetros exibidos. Quando ele responde, a revisão do período antigo entra no painel ao lado da tabela do período novo. A chamada de IA (lenta e paga) também segue até o fim sem utilidade.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/relatorio/pages/relatorio-execucao/relatorio-execucao.page.ts:160-165 — valueChanges faz revisao.set(null) e pedidoPreview.next(...), sem cancelar a revisão em andamento
- frontend/src/app/modules/relatorio/pages/relatorio-execucao/relatorio-execucao.page.ts:249-263 — revisarComIa() assina revisarRelatorio(params) sem takeUntil/switchMap e grava this.revisao.set(resposta.dados) sem conferir parametrosExibidos
- frontend/src/app/modules/relatorio/pages/relatorio-execucao/relatorio-execucao.page.html:33-35 — o botão só fica desabilitado/loading; os filtros continuam livres durante a revisão (não há formulario.disable no .ts)

Como observar: Em /relatorio, com um projeto com execuções, clicar em Revisar com IA e, antes da resposta, trocar o mês. Na rede: POST /relatorio/execucao/revisar pendente, depois GET /relatorio/execucao do mês novo; quando o POST termina, o painel mostra os achados do mês anterior.

Verificação na auditoria: código, por um auditor; não exercitado (a IA não tem provedor no ambiente da auditoria).

## Entregáveis

1. O `POST /relatorio/execucao/revisar` em curso é cancelado ao mudar o filtro (o mesmo fluxo com `switchMap` que a prévia já usa) ou a resposta é descartada quando os parâmetros diferem dos exibidos.
2. Teste de componente: trocar o mês com revisão pendente não aplica a resposta antiga.

## Critérios de Aceite

- Teste passa; com a IA disponível, a revisão mostrada é sempre do período que está na tela.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

