# 447-propostas-em-grupo-e-ajuste-ressincronizam-a-execucao.spec.md

> Task 119/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-160 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/casca.

## Objetivo

Confirmar ou desfazer propostas em grupo e ajustar uma proposta (que confirma com os campos alterados) passam a reler a execução ativa, como a confirmação individual já faz.

## Contexto

**A-160 · Média · "Confirmar todas" e "Ajustar" não ressincronizam a execução ativa da topbar**

O interceptor que relê `GET /execucao/ativa` depois de confirmar ou desfazer proposta só casa `/proposta-ia/<número>/(confirmar|desfazer)`. `POST /proposta-ia/grupo/confirmar`, `POST /proposta-ia/grupo/desfazer` e `POST /proposta-ia/:id/ajustar` (que confirma com os campos corrigidos, inclusive em INICIAR_EXECUCAO e PAUSAR_EXECUCAO) ficam de fora, e nenhum componente do chat chama `execucaoAtiva.carregar()` nesses caminhos. O chip da topbar fica com o estado anterior até outra leitura (foco da janela, por exemplo).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/interceptors/execucao-ativa.interceptor.ts:9 — `const PADRAO_PROPOSTA = /\/proposta-ia\/\d+\/(confirmar|desfazer)$/`
- frontend/src/app/modules/chat/services/proposta-ia.service.ts:41 — `post(`${this.urlBase}/${id}/ajustar`, dto, ...)`
- frontend/src/app/modules/chat/services/proposta-ia.service.ts:54 e :62 — `post(`${this.urlBase}/grupo/confirmar`...)` e `.../grupo/desfazer`
- frontend/src/app/modules/chat/components/proposta-cartao/proposta-cartao.component.ts:330-331 e :359-362 — ajuste de INICIAR_EXECUCAO envia `ajustar(id, { dados })` e o aviso é "Proposta ajustada e confirmada"
- frontend/src/app/modules/chat/components/proposta-grupo/proposta-grupo.component.ts:163 — "Confirmar todas" usa `confirmarGrupo({ propostaIds: ids })`
- frontend/src/app/modules/chat/services/chat.service.ts:141 — único `execucaoAtiva.carregar()` do módulo, e só no fim de um fluxo de mensagem

Como observar: /chat: pedir à IA duas ações na mesma resposta, uma delas iniciar execução, e clicar em "Confirmar todas": sai POST /proposta-ia/grupo/confirmar e nenhum GET /execucao/ativa; o chip da topbar não mostra a execução. O mesmo com "Ajustar" numa proposta de iniciar execução (POST /proposta-ia/:id/ajustar).

Verificação na auditoria: código, por um auditor; os fluxos com resposta da IA não foram exercitados (sem provedor no ambiente da auditoria).

## Entregáveis

1. O padrão de `core/interceptors/execucao-ativa.interceptor.ts` cobre `/proposta-ia/:id/ajustar` e `/proposta-ia/grupo/(confirmar|desfazer)`.
2. Teste do interceptor para as cinco rotas de proposta.

## Critérios de Aceite

- Teste passa; com a IA disponível, "Confirmar todas" com uma proposta de iniciar execução mostra o chip na topbar sem F5.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

