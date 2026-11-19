# 444-chat-fim-de-mensagem-sem-tres-releituras.spec.md

> Task 116/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-156 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-10.
> Severidade: Média. Área: frontend/chat.

## Objetivo

Cada mensagem enviada deixa de terminar com `GET /ia/disponibilidade`, `GET /chat/conversas` e `GET /plano`. A recarga existe por causa da primeira resposta do dia (a conversa ganha nome e entra na lista).

## Contexto

**A-156 · Média · Cada mensagem enviada termina com três leituras: GET /ia/disponibilidade, GET /chat/conversas e GET /plano**

O `finally` de `enviar()` e de `executarFluxoDoServidor()` chama `seletor.recarregar()` (conversas + planos) e o evento `fim` força `GET /ia/disponibilidade`. O próprio comentário diz que a recarga serve à primeira resposta do dia (a conversa ganha nome e entra na lista); nas demais a lista de conversas não muda, mensagem de Perguntas não mexe em plano e mensagem de Planejamento não mexe em conversas. Se o fluxo teve ferramenta `propor_*`, soma-se `GET /execucao/ativa`, mesmo com a proposta só pendente.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/pages/chat/chat.page.ts:387-388 — comentário "A conversa pode ter ganhado nome (dado pela IA ao fim da primeira resposta do dia)" seguido de `this.seletor()?.recarregar()` no finally de enviar()
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:443 — o mesmo `this.seletor()?.recarregar()` no finally do bom dia e da retomada
- frontend/src/app/modules/chat/components/seletor/seletor.component.ts:104 e :114 — `recarregar()` dispara `chatService.listarConversas()` e `planoService.listar(...)` juntos
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:765 e :792 — no `fim`, `atualizarDisponibilidade()` chama `iaDisponibilidade.carregar({ forcar: true })`
- frontend/src/app/core/services/ia-disponibilidade.service.ts:56 — `forcar` pula a janela de frescor (JANELA_DE_FRESCOR_MS = 5_000, linha 11)
- frontend/src/app/modules/chat/services/chat.service.ts:136 e :141 — qualquer ferramenta `propor_*` CONCLUIDA liga `propostaExecutada` e o finally chama `this.execucaoAtiva.carregar()`

Como observar: /chat, modo Perguntas, enviar uma mensagem numa conversa que já tem nome: depois do POST /chat/mensagem (event-stream) aparecem GET /ia/disponibilidade, GET /chat/conversas e GET /plano. Em Planejamento, com POST /chat/plano/:id/mensagem, as mesmas três.

Verificação na auditoria: código, por um auditor; os fluxos com resposta da IA não foram exercitados (sem provedor no ambiente da auditoria).

## Entregáveis

1. Em Perguntas, reler só `GET /chat/conversas`, e só quando a conversa de hoje não está na lista ou ainda tem o título padrão; em Planejamento, no máximo `GET /plano`.
2. No evento de fim, a disponibilidade da IA é consultada sem `forcar` (a janela de 5 s do serviço decide).
3. Teste da página: a segunda mensagem do dia não gera nenhuma das três leituras.

## Critérios de Aceite

- Com a IA disponível: a segunda mensagem de uma conversa gera só o `POST` da mensagem.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

