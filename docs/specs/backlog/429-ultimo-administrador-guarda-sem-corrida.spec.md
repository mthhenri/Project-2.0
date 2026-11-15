# 429-ultimo-administrador-guarda-sem-corrida.spec.md

> Task 101/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-136 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/usuario.

## Objetivo

Duas requisições ao mesmo tempo, cada uma tirando um administrador diferente, não conseguem deixar o sistema sem administrador ativo.

## Contexto

**A-136 · Baixa · Guarda do último administrador ativo sem proteção de concorrência**

A service lista os administradores ativos e, em outra chamada, grava a alteração/exclusão, sem transação nem trava visíveis. Duas requisições simultâneas tirando administradores diferentes podem ambas passar e deixar o sistema sem administrador ativo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/services/usuario.service.ts:190-197 — validarPermanenciaDeAdministradorAtivo lê listarAdministradoresAtivos e decide em memória
- backend/src/modules/usuario/services/usuario.service.ts:173-176 — alterar: guarda e depois usuarioRepositorio.alterar em chamadas separadas
- backend/src/modules/usuario/services/usuario.service.ts:223-230 — excluir: mesmo desenho

Como observar: Com dois administradores A e B, disparar ao mesmo tempo: A faz PUT /usuario/<B> {ativo:false} e B faz PUT /usuario/<A> {ativo:false}. Esperado: uma das duas dá 400 'O sistema deve ter ao menos um administrador ativo'. O código pode responder 200 às duas.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. A conferência e a gravação na mesma transação (`SELECT ... FOR UPDATE` dos administradores, ou `UPDATE` condicionado a existir outro administrador ativo), no repository.
2. Teste de integração com as duas operações concorrentes.

## Critérios de Aceite

- `npm run test:integracao`: das duas operações simultâneas, uma é recusada.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

