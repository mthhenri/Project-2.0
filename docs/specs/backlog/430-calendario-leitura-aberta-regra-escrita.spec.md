# 430-calendario-leitura-aberta-regra-escrita.spec.md

> Task 102/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-128 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: docs e backend/calendario. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Escrever a regra: o código trata a leitura como aberta (há teste e ferramenta de IA), mas o `SYSTEM.SPEC.md` lista "calendário" entre o que o auxiliar não pode.

## Contexto

**A-128 · Informativo · Calendário: leituras abertas aos quatro tipos, sem regra escrita no resumo**

GET /calendario, /calendario/verificar e /calendario/:id não têm decorador: qualquer autenticado lê (medido 200 para o desenvolvedor). O código trata como intencional (teste e ferramenta de IA), mas o resumo lista 'calendário' entre o que o auxiliar não pode e o menu é só de gestor; não achei consumidor não gestor dessas rotas no frontend.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/calendario/controllers/calendario.controller.ts:52-54, :60-63, :69-72 — três GET sem @GestorOnly
- backend/src/modules/calendario/controllers/calendario.controller.test.ts:14 — 'listar, recuperar e verificar ficam abertos a qualquer autenticado'
- backend/src/modules/calendario/ferramentas/consultar-dias-nao-uteis.ferramenta.ts:16 e :24 — 'leitura aberta a qualquer usuário, como na tela'; permissao 'QUALQUER'
- frontend/src/app/shared/layout/navegacao.ts:42 — item Calendário com somenteGestor: true
- grep de CalendarioService|calendario.service em frontend/src/app fora de modules/calendario — nenhuma ocorrência

Como observar: Como DESENVOLVEDOR ou AUXILIAR: GET /calendario e GET /calendario/1 → 200. Se a regra for 'calendário é do gestor', o esperado seria 403 ao menos em GET /calendario/:id (tela de edição).

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: `GET /calendario`, `GET /calendario/:id` e `GET /calendario/verificar` respondem 200 a desenvolvedor e auxiliar.

## Decisão do autor pendente

**Antes:** as três leituras não têm decorador de permissão.

**Opções:**

1. A leitura é aberta (o dado já chega a todos pelo ponto e pela IA): registrar.
2. Restringir `GET /calendario` e `GET /calendario/:id` a gestor, mantendo `/verificar`.

Recomendação da auditoria: opção 1.

## Entregáveis

1. A regra no `SYSTEM.SPEC.md` §14; na opção 2, os decoradores e os testes.

## Critérios de Aceite

- O documento diz quem lê o calendário e o teste do controller fixa isso.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

