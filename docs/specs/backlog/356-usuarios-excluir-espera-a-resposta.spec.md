# 356-usuarios-excluir-espera-a-resposta.spec.md

> Task 28/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-036 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: frontend/usuario.

## Objetivo

Excluir um usuário com execução registrada (o backend responde 400: só pode ser inativado) não tira a linha da tela antes da resposta.

## Contexto

**A-036 · Informativo · Usuários: Excluir aparece para todo usuário gerenciável, mas `DELETE /usuario/:id` responde 400 a quem tem execução registrada**

A tela remove a linha antes da resposta e a devolve no erro. O backend recusa a exclusão de usuário com execução (só inativa). O resumo da listagem não diz se o usuário tem execuções, então a tela não tem como saber.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:238-249 — lixeira sob `podeGerenciar && eOutraPessoa`
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:287-305 — linha sai antes do DELETE e volta no `error`
- backend/src/modules/usuario/services/usuario.service.ts:225-228 — `BusinessException` quando há execuções
- shared/src/dtos/usuario/UsuarioResumoDto.ts — sem indicador de execução

Como observar: Clicar na lixeira de um desenvolvedor com execuções: a linha some, `DELETE /usuario/:id` responde 400, aparece "O usuário possui execuções registradas e não pode ser excluído; inative-o" e a linha volta.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. A exclusão remove a linha no sucesso; no 400, a linha fica e a mensagem do backend aparece.
2. Teste de componente para o 400.

## Critérios de Aceite

- Ao vivo: excluir um usuário com execução mostra a mensagem e a linha continua onde estava.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Esconder o botão para quem tem execução: pede um campo novo no resumo (contrato).

## Dependências

Nenhuma.

