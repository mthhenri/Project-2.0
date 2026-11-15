# 420-chat-propostas-da-ia-com-memoria.spec.md

> Task 92/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-127 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/mensagem-direta.

## Objetivo

Quem lê uma resposta da IA com propostas deixa de fazer um `GET` por proposta toda vez que a conversa é reaberta ou relida.

## Contexto

**A-127 · Baixa · Propostas da IA: uma requisição por proposta, sem guardar o resultado**

Para quem não chamou a IA, `MensagemDiretaIaRespostaComponent` pede cada proposta num GET próprio, dentro de um `effect` que depende do objeto `mensagem()`. Não há cache como o das referências, então reabrir a conversa repete todos os GETs. É provável que cada releitura da conversa também repita, o que não foi confirmado.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-ia-resposta/mensagem-direta-ia-resposta.component.ts:57-65 — effect lê `this.mensagem()` e chama `carregarVistas`
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-ia-resposta/mensagem-direta-ia-resposta.component.ts:79 — `Promise.all(propostaIds.map(... carregarVista ...))`
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-ia-resposta/mensagem-direta-ia-resposta.component.ts:93-94 — `recuperarProposta` por proposta (grupo ou conversa)
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-referencia.service.ts:13-26 — contraste: referências têm cache por sessão

Como observar: Abrir um grupo em que outra pessoa chamou a IA e a resposta trouxe propostas: um GET /mensagem-direta/grupo/N/mensagem/MID/proposta/PID por proposta. Voltar à lista e reabrir o grupo repete as chamadas.

Verificação na auditoria: código, por um auditor; não exercitado (a IA não tem provedor no ambiente da auditoria).

## Entregáveis

1. Um serviço de memória por `mensagemId:propostaId` (no molde do serviço de referências), invalidado quando a proposta muda de situação.
2. Teste do componente de resposta da IA: reabrir a conversa não repete as leituras.

## Critérios de Aceite

- Teste passa; com a IA disponível, reabrir uma conversa com duas propostas não gera requisição de proposta.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

