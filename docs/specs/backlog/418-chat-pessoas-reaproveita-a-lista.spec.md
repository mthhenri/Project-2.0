# 418-chat-pessoas-reaproveita-a-lista.spec.md

> Task 90/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-116 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-08.
> Severidade: Baixa. Área: frontend/mensagem-direta.

## Objetivo

Nova conversa, Novo grupo e Detalhes do grupo reaproveitam a lista de pessoas já carregada por um tempo curto; a presença continua vindo pelo stream.

## Contexto

**A-116 · Baixa · `GET /mensagem-direta/pessoas` repetido a cada abertura de Nova conversa, Novo grupo e Detalhes do grupo**

`carregarPessoas` só evita a chamada simultânea; não reaproveita a lista já carregada. Só o caminho da busca confere `pessoas() === null`; os outros quatro gatilhos pedem a lista inteira toda vez, embora a presença venha pelo stream.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:692-698 — a única guarda é `if (this.carregandoPessoas()) return;` antes de `listarPessoas()`
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-lista/mensagem-direta-lista.component.ts:61 — único chamador com `if (this.estado.pessoas() === null)`
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-lista/mensagem-direta-lista.component.ts:74-76 — `novaConversa()` chama `carregarPessoas()` sempre
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:271, :868 e :880 — atalho do Desktop, `novoGrupo()` e `abrirDetalhesDoGrupo()`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:701-704 — a presença da lista só vale enquanto o stream não está conectado

Como observar: Popup → "Nova conversa" → voltar → "Nova conversa" de novo; ou abrir e fechar os Detalhes de um grupo várias vezes. Cada abertura mostra um GET /mensagem-direta/pessoas.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `carregarPessoas` usa a lista em memória por um prazo curto (o padrão de 60 s do `CatalogoEmMemoria`); "tentar de novo" força a leitura.
2. Teste do service de estado.

## Critérios de Aceite

- Ao vivo: abrir "Nova conversa" e depois "Novo grupo" faz 1 `GET /mensagem-direta/pessoas`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

