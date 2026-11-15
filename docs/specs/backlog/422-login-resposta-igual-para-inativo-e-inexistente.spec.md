# 422-login-resposta-igual-para-inativo-e-inexistente.spec.md

> Task 94/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-120 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/autenticacao.

## Objetivo

O login confere a senha antes de dizer "Usuário inativo", e login inexistente custa o mesmo tempo que login existente.

## Contexto

**A-120 · Baixa · Login distingue usuário inativo antes de conferir a senha**

Senha errada e login inexistente dão a mesma mensagem, mas login de usuário inativo responde 'Usuário inativo' com qualquer senha, revelando sem autenticação que o login existe. Login inexistente também retorna sem rodar bcrypt, o que deixa diferença de tempo entre existente e inexistente.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/autenticacao/services/autenticacao.service.ts:26-28 — throw BusinessException('Usuário inativo') antes do bcrypt.compare da linha 30
- backend/src/modules/autenticacao/services/autenticacao.service.ts:22-24 — login inexistente retorna null sem comparar hash
- backend/src/modules/autenticacao/services/autenticacao.service.test.ts:58-64 — teste cobre inativo só com a senha certa; :47-56 cobre a mensagem igual para ativo/inexistente

Como observar: Sem token: POST /autenticacao/login {login:'<login de usuário inativo>', senha:'qualquer'}. Esperado: 400 'Usuário ou senha incorretos. Confira e tente de novo.'. O código dá 400 'Usuário inativo'.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Em `AutenticacaoService`: a mensagem de inativo só sai com a senha certa; login inexistente compara contra um hash fixo.
2. Teste: inativo com senha errada recebe a mesma resposta de credencial errada.

## Critérios de Aceite

- `POST /autenticacao/login` de um inativo com senha errada responde a mensagem genérica.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

