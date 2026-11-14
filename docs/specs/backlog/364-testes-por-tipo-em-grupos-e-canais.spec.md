# 364-testes-por-tipo-em-grupos-e-canais.spec.md

> Task 36/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-045 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/mensagem-direta.

## Objetivo

Cobrir o que hoje nenhum teste exercita: o auxiliar em canal de demanda e de projeto, a supervisão chamada com cursor e a leitura das fixadas pelo gestor não membro.

## Contexto

**A-045 · Baixa · Nenhum teste de grupo ou canal com AUXILIAR, nem da supervisão com cursor**

Os seis arquivos de teste da unidade não mencionam o auxiliar; os casos por tipo cobrem desenvolvedor, gestor e administrador. A supervisão é testada só na abertura sem cursor, e o único teste de cursor é o do membro. A leitura das fixadas pelo gestor é testada sem tratar de auditoria.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- grep -ci 'auxiliar' → 0 em grupo.service.integracao.test.ts, canal.service.integracao.test.ts, grupo-fixada.service.integracao.test.ts, grupo-resumo-ia.service.integracao.test.ts, mensagem-direta-grupo.controller.test.ts e grupo-regras.test.ts (em backend/src/modules/mensagem-direta/)
- backend/src/modules/mensagem-direta/services/canal.service.integracao.test.ts:104 — "o de fora da demanda recebe 403, demanda inexistente 404, gestor e administrador abrem qualquer um"
- backend/src/modules/mensagem-direta/services/grupo.service.integracao.test.ts:289 — único teste com cursor: "listarMensagens: pagina com cursor e só para membro"
- backend/src/modules/mensagem-direta/services/grupo.service.integracao.test.ts:386 — "abrir audita e avisa uma vez por dia" (sem cursor)
- backend/src/modules/mensagem-direta/services/grupo-fixada.service.integracao.test.ts:154 — "o gestor que só lê por tipo vê as fixadas mas não fixa nem busca"

Como observar: Conferência por grep nos títulos e nas ocorrências dos *.test.ts da unidade; nenhum teste foi executado.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Testes de integração para os três casos, escritos conforme as regras decididas nas specs de canal e de supervisão.

## Critérios de Aceite

- `npm run test:integracao` com os casos novos; cada caso falha se a regra correspondente for desfeita.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

As specs `359-supervisao-do-chat-auditoria-com-ou-sem-cursor`, `360-canal-de-demanda-e-de-projeto-para-o-auxiliar` e `361-canal-leitura-por-tipo-sempre-auditada`.

