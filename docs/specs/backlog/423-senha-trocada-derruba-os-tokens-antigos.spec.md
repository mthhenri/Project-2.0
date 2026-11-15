# 423-senha-trocada-derruba-os-tokens-antigos.spec.md

> Task 95/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-130 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/autenticacao e usuario. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Quem tinha um token (inclusive alguém que não devia) perde o acesso quando a senha da conta é trocada. Hoje o token continua valendo até vencer (7 dias).

## Contexto

**A-130 · Média · Troca de senha não derruba tokens já emitidos**

A cada requisição a strategy confere só se o usuário existe e está ativo; a troca de senha grava o hash e mais nada. Quem tinha um token (inclusive um invasor) continua com acesso até o token vencer, mesmo depois de o gestor trocar a senha da conta.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/autenticacao/strategies/jwt.strategy.ts:25-36 — validate() rejeita só usuário inexistente ou !ativo; não compara nada com a data da senha
- backend/src/modules/usuario/services/usuario.service.ts:283-284 — alterarSenha só chama usuarioRepositorio.alterarSenha com o novo hash
- .env.example:13 — JWT_EXPIRACAO=7d (valor de exemplo; o real depende do ambiente)

Como observar: Login como DESENVOLVEDOR (guardar token A). Como GESTOR: PATCH /usuario/<id do dev>/senha {senhaNova:'OutraSenha#1'} → 200. Com o token A: GET /ponto/diario?data=<hoje>. Esperado: 401. O código responde 200 até o token expirar.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

Exige um dado novo no usuário: é modelagem.

**Antes:** a `JwtStrategy` confere só se o usuário existe e está ativo.

**Opções:**

1. Coluna com o instante da última troca de senha; a strategy recusa token com `iat` anterior.
2. Versão de credencial no usuário, gravada no token e comparada a cada requisição.

## Entregáveis

1. A opção escolhida, com migration (skill `sql-migrations`), a conferência na `JwtStrategy` e testes.

## Critérios de Aceite

- Token emitido antes de `PATCH /usuario/:id/senha` responde 401 depois da troca.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

