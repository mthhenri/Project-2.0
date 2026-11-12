# 250 — Verificação das mensagens fixadas e da busca no grupo

> Relatório textual da task [`250-fixar-mensagem-e-busca-no-grupo.spec.md`](../250-fixar-mensagem-e-busca-no-grupo.spec.md). Capturas e logs brutos ficam em
> `.artifacts/250/` (ignorada pelo Git); o veredito abaixo não depende deles.

## O que foi rodado (2026-11-12)

| Gate | Resultado |
|---|---|
| `npm run test --workspace=shared` | 353 testes, todos passam |
| `npm run test --workspace=backend` (unitários) | 1773 testes, todos passam (inclui as rotas novas do controller) |
| `npm run test:integracao` | 518 testes, todos passam: `grupo-fixada.service.integracao.test.ts` (7 cenários), `grupo-fixada.repository.integracao.test.ts` (4) e o cenário novo da **suíte de contrato** (`somenteGrupos`), que roda no Postgres |
| `npm run test --workspace=frontend` | 236 arquivos, 2851 testes, todos passam (novos: faixa de fixadas, busca no grupo, o popup com fixar, desafixar, limite, `SINCRONIZAR` e lupa, e as rotas no serviço HTTP) |
| `npm run lint:tudo` | zero erros |
| `npm run build` do backend e do frontend | sem erros; bundle inicial 1,12 MB (limite de 1,15 MB) |
| Migration `0089` | aplicada no banco de verificação sem erro |

## Verificação ao vivo

API real (`project20_verify`, PostgreSQL) e `ng serve` isolados, Playwright com Ana e Bruno nos navegadores (Carla, a gestora e as demais chamadas pela API). **19 de 19 verificações em cada um dos cinco formatos (`1920×1080`, `1366×768`, `1080×1920`, `720×1280`, `960×1080`) e nos temas claro e escuro.** Cobre: a Ana fixa pelo menu da mensagem (uma mensagem do começo de uma conversa longa) e a faixa aparece; o Bruno a vê **em tempo real**, sem recarregar, e clicar nela rola até a mensagem original e a destaca; a segunda fixada mostra "2 fixadas" e a lista; fixar de novo não duplica; a 11ª é recusada com o motivo; desafixar libera vaga e some para todos em tempo real; a busca acha o texto **sem acento** só no grupo (não traz o outro grupo nem a conversa um a um que tinham a mesma palavra), realça o termo, o filtro "Com código" traz só a mensagem com bloco de código e clicar no resultado leva à mensagem; quem saiu do grupo recebe 403 nas fixadas e na busca; no canal o membro por `demanda_usuario` fixa e o gestor que só lê por tipo vê as fixadas mas recebe 403 ao fixar e ao buscar; mensagem de outro grupo não se fixa (404).

## Decisões tomadas pelos padrões da spec — a confirmar

- Qualquer membro fixa e desafixa (no canal, o membro pela regra do canal); limite de 10 por grupo; **sem** mensagem do sistema ao fixar.
- O gestor que só lê o canal por tipo vê as fixadas (leitura) mas não fixa nem busca.
- Só mensagem de pessoa deste grupo se fixa.
- A busca no grupo é só de membro e usa um campo novo do contrato do armazenamento (`somenteGrupos`).

## Limites e pendências

- Elasticsearch e OpenSearch ao vivo não foram exercitados: o filtro novo do índice (`terms` em `conversa_id`) é coberto por teste unitário da consulta e pelo cenário de contrato, que fica desligado sem `CHAT_INTEGRACAO=1`.
- Com a lista de fixadas aberta, a mais recente aparece duas vezes (na faixa e no primeiro item da lista); é só acabamento.
- Editar ou apagar a mensagem fixada, reordenar fixadas e fixar na conversa um a um continuam fora do escopo.
