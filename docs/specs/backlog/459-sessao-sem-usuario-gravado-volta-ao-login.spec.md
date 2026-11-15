# 459-sessao-sem-usuario-gravado-volta-ao-login.spec.md

> Task 131/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-175 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/casca.

## Objetivo

Com `access_token` presente e `usuario_sessao` ausente ou inválido, a casca deixa de abrir sem usuário (menu mínimo, sem nome, guards redirecionando).

## Contexto

**A-175 · Baixa · Token presente sem usuario_sessao: o app abre sem usuário e não reconstrói a sessão**

autenticacaoGuard só confere a existência de 'access_token'. Se 'usuario_sessao' estiver ausente ou com JSON inválido, a casca abre com usuarioAtual nulo (menu mínimo, sem nome, guards de tipo redirecionando) e atualizarSessao() desiste logo na primeira linha porque não há usuário. Nada recupera a sessão até um 401 ou logout manual.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/guards/autenticacao.guard.ts:6-8 — passa com qualquer valor em 'access_token'
- frontend/src/app/core/services/usuario-sessao.service.ts:67 e 70-72 — sem dado salvo retorna; JSON inválido remove a chave e segue sem usuário
- frontend/src/app/core/services/autenticacao.service.ts:47-48 — atualizarSessao retorna se !usuario

Como observar: No DevTools, apagar 'usuario_sessao' mantendo 'access_token' e recarregar: a casca abre sem nome e só com os itens de quem não é gestor.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. O `autenticacaoGuard` exige as duas chaves (ou reconstrói o usuário pelo id do token com `GET /usuario/:id`); teste do guard.

## Critérios de Aceite

- Apagar só `usuario_sessao` do `localStorage` e recarregar leva ao login (ou reconstrói a sessão), nunca à casca sem usuário.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

