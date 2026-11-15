# 419-chat-grupo-abre-mensagens-e-fixadas-em-paralelo.spec.md

> Task 91/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-117 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/mensagem-direta.

## Objetivo

`GET /grupo/:id/fixadas` deixa de esperar `GET /grupo/:id/mensagens` responder: uma não depende da outra.

## Contexto

**A-117 · Baixa · Abrir grupo: mensagens e fixadas em cascata, e as fixadas relidas em toda releitura**

`carregarGrupoAberto` só dispara `GET /grupo/:id/fixadas` depois que `GET /grupo/:id/mensagens` responde, embora uma não dependa da outra. A conversa direta abre com uma leitura; o grupo, com duas em série, repetidas a cada reconexão e a cada `SINCRONIZAR`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:193 — `await firstValueFrom(this.api.listarMensagens(aberto.grupoId))`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:204 — `void this.carregarFixadas(aberto.grupoId)` só depois do await
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:779 e :765 — `carregarGrupoAberto` também na reconexão e no `SINCRONIZAR`

Como observar: Popup → clicar num grupo. Rede: GET /mensagem-direta/grupo/N/mensagens e, só depois da resposta, GET /mensagem-direta/grupo/N/fixadas.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `carregarGrupoAberto` dispara as duas leituras juntas; teste do service de estado do grupo.

## Critérios de Aceite

- Ao vivo: as duas requisições partem no mesmo instante ao abrir o grupo.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Trazer as fixadas na primeira página de mensagens (contrato).

## Dependências

Nenhuma.

