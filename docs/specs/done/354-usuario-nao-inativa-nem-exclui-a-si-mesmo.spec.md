# 354-usuario-nao-inativa-nem-exclui-a-si-mesmo.spec.md

> Task 26/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-045, A-046 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/usuario. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A regra que a tela aplica ("o gestor não inativa nem exclui a própria conta") passa a valer na API, ou fica registrado que é só conveniência da tela.

## Contexto

**A-045 · Baixa · Usuários: a trava de "não inativar nem excluir a si mesmo" existe só na tela; `PUT /usuario/:id` e `DELETE /usuario/:id` aceitam**

A tela desabilita o switch e esconde a lixeira na própria linha. Na `UsuarioService` do backend, `alterar` só impede o gestor de rebaixar a si mesmo e `excluir` não confere quem pede; as únicas barreiras são o último administrador ativo e a existência de execuções.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:261-264 — `eOutraPessoa`
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:171-176 e 238 — switch desabilitado e lixeira oculta na própria linha
- backend/src/modules/usuario/services/usuario.service.ts:136-183 — `alterar`: a única regra sobre si mesmo é o rebaixamento (163-166)
- backend/src/modules/usuario/services/usuario.service.ts:215-237 — `excluir` sem comparar com `usuarioAtivo.sub`

Como observar: Como gestor, enviar `PUT /api/usuario/<meu id>` com `{ "ativo": false }` ou `DELETE /api/usuario/<meu id>` pelo DevTools: responde 200 (salvo último administrador ativo ou usuário com execução).

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

**A-046 · Baixa · Usuário pode inativar ou excluir a si mesmo**

A única guarda 'a si mesmo' é o gestor rebaixar o próprio tipo. Inativar (ativo=false) e excluir o próprio usuário passam: o gestor sempre, o administrador quando existe outro administrador ativo; o token deixa de valer na requisição seguinte. A regra não está escrita no resumo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/services/usuario.service.ts:163-166 — só 'Um gestor não pode rebaixar a si mesmo'
- backend/src/modules/usuario/services/usuario.service.ts:170-174 — ativo=false passa só pela guarda do último administrador
- backend/src/modules/usuario/services/usuario.service.ts:215-230 — excluir não compara dto.id com usuarioAtivo.sub
- backend/src/modules/autenticacao/strategies/jwt.strategy.ts:31-33 — inativo/excluído vira 401 na hora
- backend/src/modules/usuario/services/usuario.service.test.ts:112 — único teste 'a si mesmo' é o de rebaixar

Como observar: Como GESTOR: PUT /usuario/<próprio id> {ativo:false} → 200; a requisição seguinte com o mesmo token → 401. Como GESTOR sem execuções: DELETE /usuario/<próprio id> → 200. Se a regra for proibir, o esperado é 400.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor

**Antes:** os botões ficam desabilitados para a própria linha, mas `PUT /usuario/:id` com `ativo: false` e `DELETE /usuario/:id` aceitam o próprio id.

**Opções:**

1. É regra de negócio: `UsuarioService.alterar` e `excluir` recusam com `BusinessException` quando `usuarioAtivo.sub === dto.id`, e o `SYSTEM.SPEC.md` §14 ganha a linha.
2. É só conveniência da tela: nada muda no backend e o `SYSTEM.SPEC.md` registra isso.

Recomendação da auditoria: opção 1 (o último administrador já é protegido; um gestor comum ainda consegue se trancar para fora pela API).

**Decisão (2026-11-16):** Em 2026-11-16 o autor confirmou a recomendação da auditoria, **opção 1**: é regra de negócio. `UsuarioService.alterar` (com `ativo: false`) e `excluir` recusam com 400 quando o alvo é quem pede, para gestor e administrador; a regra está no `SYSTEM.SPEC.md` §14.

## Entregáveis

1. A opção escolhida implementada, com teste da service para alterar e excluir a si mesmo.
2. O `SYSTEM.SPEC.md` §14 atualizado com a regra escolhida.

## Critérios de Aceite

- `PUT /usuario/<próprio id>` com `{ "ativo": false }` e `DELETE /usuario/<próprio id>` respondem conforme a opção escolhida (400 com mensagem, na opção 1).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

