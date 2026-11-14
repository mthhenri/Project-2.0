# 391-supervisao-de-par-sem-conversa-nao-cria-conversa.spec.md

> Task 63/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-078 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/mensagem-direta.

## Objetivo

Pedir a supervisão de dois desenvolvedores que nunca trocaram mensagem responde "não encontrada", sem efeito nenhum. Hoje o `GET` faz nascer uma conversa com o aviso de leitura.

## Contexto

**A-078 · Média · Supervisão de par que nunca conversou: o GET grava auditoria e cria mensagem do sistema**

`lerConversaSupervisionada` confere só que os dois ids existem e não são gestores; não confere se há mensagem entre eles. Para um par de desenvolvedores sem conversa, a rota grava a auditoria e a mensagem do sistema "leu esta conversa", publicada aos dois, fazendo nascer uma conversa que não existia.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.ts:98-102 — só `listarTiposPorIds` e `conversaEhSupervisionavel`; nenhuma consulta de existência da conversa
- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.ts:107-119 — `registrarLeitura` e `avisarParticipantes` rodam antes de `listarConversa` (122)
- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.ts:150-162 — o aviso chama `armazenamento.gravar` com autor SISTEMA e publica `MENSAGEM` aos participantes
- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.test.ts:109 — o teste de "não encontrada" cobre só id inválido e usuário inexistente

Como observar: Como GESTOR: GET /api/v1/mensagem-direta/supervisao/conversa/4-9, com 4 e 9 desenvolvedores que nunca trocaram mensagem. Esperado: 404 "Conversa". O código responde 200, grava linha de auditoria e uma mensagem do sistema na conversa 4-9, entregue pelo stream aos dois.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14: `GET /mensagem-direta/supervisao/conversa/2-6` (dois desenvolvedores sem nenhuma mensagem) respondeu 200, gravou 1 auditoria e criou a mensagem do sistema "leu esta conversa"; a conversa passou a aparecer na lista dos dois.

## Entregáveis

1. `lerConversaSupervisionada` lê a primeira página antes de auditar e responde 404 quando não há mensagem.
2. Teste de integração para o par sem conversa.

## Critérios de Aceite

- Repetir o roteiro: 404, nenhuma linha nova em `mensagem_direta` nem em `mensagem_direta_supervisao`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

