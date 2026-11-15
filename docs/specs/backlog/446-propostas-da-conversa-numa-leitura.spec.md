# 446-propostas-da-conversa-numa-leitura.spec.md

> Task 118/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-159 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/chat e frontend/chat. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Abrir uma conversa com N propostas deixa de fazer N `GET /proposta-ia/:id`, repetidos a cada troca de conversa; na resposta ao vivo, a chegada da segunda proposta deixa de reler a primeira.

## Contexto

**A-159 · Média · Uma requisição por proposta ao abrir conversa; a segunda proposta ao vivo relê a primeira**

As mensagens trazem só `propostaIds`, e cada cartão ou linha de grupo busca a sua com `GET /proposta-ia/:id`: N propostas custam N requisições a cada conversa aberta (hoje, dia antigo, plano), sem nada guardado entre trocas. Na resposta ao vivo, quando chega a segunda proposta o template troca o cartão pelo grupo, e o grupo recém-criado pede de novo a primeira.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/components/proposta-cartao/proposta-cartao.component.ts:185-195 e :210 — sem `propostaCarregada`, o efeito chama `carregar(id)` → `propostaIaService.recuperarPorId(id)`
- frontend/src/app/modules/chat/components/proposta-grupo/proposta-grupo.component.ts:96-99 e :119 — laço `for (const id of ids)` com uma `recuperarPorId(id)` por id; `solicitadas` é do componente
- frontend/src/app/modules/chat/pages/chat/chat.page.html:240-256 — `mensagem.propostaIds.length > 1` usa `app-chat-proposta-grupo`, senão um `app-chat-proposta-cartao` por id
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:755 — o evento `proposta` acrescenta um id por vez à resposta ao vivo
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:158-173 — a resposta ao vivo é um item da mesma lista (`itens`), renderizado pelo mesmo bloco

Como observar: Abrir /chat com a conversa do dia cheia de propostas, ou um dia antigo pelo seletor: um GET /proposta-ia/:id por proposta. Pedir à IA algo que gere duas propostas na mesma resposta: GET /proposta-ia/A, depois GET /proposta-ia/A de novo e GET /proposta-ia/B. Não medido: a conversa do administrador não tinha propostas.

Verificação na auditoria: código, por um auditor; os fluxos com resposta da IA não foram exercitados (sem provedor no ambiente da auditoria).

## Decisão do autor pendente

**Antes:** as mensagens trazem só `propostaIds` e cada cartão busca a sua.

**Opções:**

1. Leitura em lote (`GET /proposta-ia?ids=`) ou as propostas embutidas nas respostas de `/chat/hoje`, `/chat/conversa/:data` e `/chat/plano/:id` (contrato).
2. Só front: memória por id de proposta entre trocas de conversa, invalidada quando a proposta muda de situação.

## Entregáveis

1. A opção escolhida, com teste de componente contando as leituras ao abrir uma conversa com três propostas.

## Critérios de Aceite

- Abrir uma conversa com três propostas gera no máximo uma leitura de propostas (opção 1) e nenhuma na reabertura.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

