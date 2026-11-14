# 380-mover-atividade-regra-escrita.spec.md

> Task 52/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-064 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Mesmo fluxo do vazamento pelas ferramentas de proposta..
> Severidade: Baixa. Área: backend/atividade. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Escrever a regra de mover atividade: hoje só existe pela IA (o corpo de `PUT /atividade/:id` não tem `demandaId`) e a service não compara o projeto de origem com o de destino.

## Contexto

**A-064 · Baixa · Mover atividade só existe pela IA e não tem regra de projeto escrita**

O corpo de PUT /atividade/:id não tem `demandaId` e o ValidationPipe recusa campo fora do DTO, então a rota não move atividade; o único chamador com `demandaId` é o executor MOVER_ATIVIDADE. O documento fala em mover atividade 'inclusive pelo chat'. A service não compara projeto de origem e destino: o dono desenvolvedor move para qualquer demanda aberta de que seja membro, e auxiliar/gestor para qualquer demanda aberta.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- shared/src/dtos/atividade/AtividadeAlterarDto.ts:9-24 — só nome, status e prioridade
- backend/src/main.ts:30-33 — ValidationPipe com whitelist e forbidNonWhitelisted
- backend/src/modules/atividade/services/atividade.service.ts:216-218 e 249-266 — validarMudancaDeDemanda: dono/tipo, existência, status e vínculo; nada sobre projeto
- backend/src/modules/atividade/executores/mover-atividade.executor.ts:46 e 59 — únicos chamadores de alterar com demandaId
- docs/SYSTEM.SPEC.md:1405 — 'concluir demanda e mover atividade (inclusive pelo chat)'
- frontend/src/app/modules/atividade/services/atividade.service.ts:36 — `demandaId` só como filtro de listagem

Como observar: Gestor: PUT /api/v1/atividade/:id {"demandaId":2} dá 400 do ValidationPipe (campo não permitido). Pelo chat, 'mova a atividade X para a demanda <de outro projeto>' e confirmar: move, levando as execuções.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** o dono desenvolvedor move a atividade, pelo chat, para qualquer demanda aberta a que tenha acesso, inclusive de outro projeto; não há mover fora do chat.

**Opções:**

1. Mover entre projetos é permitido: só registrar no `SYSTEM.SPEC.md`.
2. Mover só dentro do mesmo projeto: recusar na service.
3. Além disso, a rota passa a aceitar `demandaId` (campo novo no DTO de alteração).

## Entregáveis

1. A regra no `SYSTEM.SPEC.md` §14 e, se mudar o comportamento, a conferência em `validarMudancaDeDemanda` com teste.

## Critérios de Aceite

- O documento descreve o que os testes da service fixam.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.
