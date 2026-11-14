# 354-usuario-nao-inativa-nem-exclui-a-si-mesmo.spec.md

> Task 26/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-034 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/usuario. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A regra que a tela aplica ("o gestor não inativa nem exclui a própria conta") passa a valer na API, ou fica registrado que é só conveniência da tela.

## Contexto

**A-034 · Baixa · Usuários: a trava de "não inativar nem excluir a si mesmo" existe só na tela; `PUT /usuario/:id` e `DELETE /usuario/:id` aceitam**

A tela desabilita o switch e esconde a lixeira na própria linha. Na `UsuarioService` do backend, `alterar` só impede o gestor de rebaixar a si mesmo e `excluir` não confere quem pede; as únicas barreiras são o último administrador ativo e a existência de execuções.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:261-264 — `eOutraPessoa`
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:171-176 e 238 — switch desabilitado e lixeira oculta na própria linha
- backend/src/modules/usuario/services/usuario.service.ts:136-183 — `alterar`: a única regra sobre si mesmo é o rebaixamento (163-166)
- backend/src/modules/usuario/services/usuario.service.ts:215-237 — `excluir` sem comparar com `usuarioAtivo.sub`

Como observar: Como gestor, enviar `PUT /api/usuario/<meu id>` com `{ "ativo": false }` ou `DELETE /api/usuario/<meu id>` pelo DevTools: responde 200 (salvo último administrador ativo ou usuário com execução).

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** os botões ficam desabilitados para a própria linha, mas `PUT /usuario/:id` com `ativo: false` e `DELETE /usuario/:id` aceitam o próprio id.

**Opções:**

1. É regra de negócio: `UsuarioService.alterar` e `excluir` recusam com `BusinessException` quando `usuarioAtivo.sub === dto.id`, e o `SYSTEM.SPEC.md` §14 ganha a linha.
2. É só conveniência da tela: nada muda no backend e o `SYSTEM.SPEC.md` registra isso.

Recomendação da auditoria: opção 1 (o último administrador já é protegido; um gestor comum ainda consegue se trancar para fora pela API).

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
