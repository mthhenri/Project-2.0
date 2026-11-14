# 355-usuarios-pode-editar-igual-ao-backend.spec.md

> Task 27/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-035 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: frontend/usuario.

## Objetivo

A tela deixa de liberar "Editar" e "Alterar senha" para "a própria pessoa": o backend só aceita de quem tem permissão de gestor, e a divergência hoje só não aparece porque a rota tem guard.

## Contexto

**A-035 · Informativo · Usuários: `podeEditar` libera Editar e Alterar senha para "a própria pessoa", que o backend recusa a quem não é gestor; hoje o guard da rota esconde a diferença**

A regra do front diz "gestor, ou a própria pessoa". No backend, `PUT /usuario/:id` e `PATCH /usuario/:id/senha` são só de gestor e administrador. A rota `/usuario` tem `gestorGuard`, então o ramo nunca é alcançado por outro tipo; pelo mesmo motivo os `@if (sessao.eGestor())` do template são sempre verdadeiros.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:251-254 — `podeEditar` = `podeGerenciar` ou a própria pessoa
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:216-237 — Editar e Alterar senha sob `podeEditar`
- backend/src/modules/usuario/services/usuario.service.ts:136-139 — 403 a quem não é gestor
- backend/src/modules/usuario/controllers/usuario.controller.ts:215-216 — `@GestorOnly()` em `PATCH :id/senha`
- frontend/src/app/modules/usuario/usuario.routes.ts:7 — `canActivate: [gestorGuard]`
- docs/SYSTEM.SPEC.md:1240 — "nem o desenvolvedor altera o próprio perfil"
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:30, 140, 185, 257 e 290 — `sessao.eGestor()` sempre verdadeiro nesta rota

Como observar: Não aparece na aplicação (a rota é só de gestor). Só os testes de componente montam a tela como desenvolvedor ou auxiliar (`usuario-listagem.page.spec.ts:184-200`).

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `podeEditar` passa a ser a mesma regra de `podeGerenciar` e o comentário é corrigido.
2. Teste de componente por tipo de usuário.

## Critérios de Aceite

- Teste cobre gestor sobre desenvolvedor, gestor sobre administrador e administrador sobre todos.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.
