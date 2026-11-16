# 466-desktop-conferencia-de-versao-so-conta-quando-responde.spec.md

> Task 138/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-184 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: desktop.

## Objetivo

Uma falha de rede na conferência de versão deixa de adiar a próxima em uma hora, e a conferência deixa de atrasar a leitura da situação do check-in no mesmo ciclo.

## Contexto

**A-184 · Informativo · Conferência de versão do Desktop: falha de rede conta como feita e a leitura da situação espera por ela**

O horário da última conferência é gravado antes da resposta, então uma falha deixa o Desktop uma hora sem saber de versão nova. A conferência é aguardada antes de GET /checkin/situacao no mesmo tique (até 8 s de atraso, uma vez por hora) e só acontece com login, por pegar carona na conferência do check-in.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:545-548 — ultimaConferenciaDeVersao = Date.now() antes do chamarApi; versaoPublicada só muda se o corpo não for null
- desktop/src/main.ts:553-556 — sem token retorna antes; `await conferirVersao(token)` vem antes de checkin/situacao
- desktop/src/politica-da-versao.ts:33-37 — intervalo de 60 minutos

Como observar: Abrir o Desktop com o backend fora do ar por um instante e religar: o item 'Nova versão disponível' só aparece na bandeja depois de uma hora.

Verificação na auditoria: código, por um auditor; o Electron não roda no ambiente da auditoria.

## Entregáveis

1. O horário da última conferência é gravado só depois de resposta válida (ou a falha agenda nova tentativa em poucos minutos); a regra em `politica-da-versao.ts` com teste.
2. A conferência de versão sai do caminho da leitura do check-in.

## Critérios de Aceite

- Teste da política: depois de uma falha, a próxima conferência acontece antes de uma hora.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Convém junto com `487-desktop-checkin-conferencia-agendada` (as duas mexem em `conferirCheckin`).

