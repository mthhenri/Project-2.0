# 453-retomada-e-bom-dia-respondem-na-conversa-do-dia.spec.md

> Task 125/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-168 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/chat.

## Objetivo

A resposta do bom-dia e da retomada deixa de cair na conversa do plano quando a última mensagem enviada foi para um plano.

## Contexto

**A-168 · Baixa · Bom dia e retomada não definem o destino da resposta: depois de uma mensagem em Planejamento, a retomada cai na conversa do plano**

`destinoDaResposta` só é atribuído em `enviar()`. `executarFluxoDoServidor()` (bom dia e retomada, que são da conversa do dia) não o redefine: se a última mensagem foi para um plano, o `fim` da retomada é acrescentado a `mensagensDoPlano` e os eventos de ferramenta são tratados como do plano. A conversa do dia só mostra a resposta depois de recarregada.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/pages/chat/chat.page.ts:227 — `private destinoDaResposta: 'DIA' | 'PLANO' = 'DIA';`
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:353 — única atribuição: `this.destinoDaResposta = planoId === null ? 'DIA' : 'PLANO'`, dentro de `enviar()`
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:422-445 — `executarFluxoDoServidor` não toca em `destinoDaResposta`
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:612-614 e :763 — `atualizarMensagensDoDestino` escolhe `mensagensDoPlano` ou `mensagens` por ele

Como observar: Enviar uma mensagem num plano e depois, com a IA voltando de uma queda, escolher "Voltar para a IA": POST /chat/retomada responde, mas a mensagem aparece na conversa do plano; em Perguntas ela só surge depois de um novo GET /chat/hoje.

Verificação na auditoria: código, por um auditor; os fluxos com resposta da IA não foram exercitados (sem provedor no ambiente da auditoria).

## Entregáveis

1. `executarFluxoDoServidor()` define o destino da resposta como a conversa do dia; teste da página para a sequência plano → retomada.

## Critérios de Aceite

- Teste passa.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

