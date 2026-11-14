# 337-sessao-nao-reconfere-logo-apos-o-login.spec.md

> Task 9/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-011 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/casca.

## Objetivo

A reconferência da sessão ao abrir a casca (P-062) é pulada quando a sessão acabou de ser definida pelo login.

## Contexto

**A-011 · Baixa · Logo após o login a casca pede GET /usuario/:id, que repete o usuário que o login acabou de devolver**

atualizarSessao() existe para trocar o usuário guardado há dias pelo atual (P-062) e roda sempre que o layout nasce. No fluxo de login o usuário foi gravado na sessão um instante antes, pela resposta de POST /autenticacao/login, com os cinco campos que a interface usa (id, login, nomeCompleto, tipo, corAvatar).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/services/autenticacao.service.ts:25-29 — o login grava o token e definirUsuario(resposta.dados.usuario)
- frontend/src/app/shared/layout/layout.component.ts:22-25 — o construtor do layout chama atualizarSessao() sempre
- frontend/src/app/core/services/autenticacao.service.ts:46-57 — GET /usuario/:id sem olhar a idade da sessão
- shared/src/dtos/autenticacao/AutenticacaoTokenDto.ts:14 — usuario: { id, login, nomeCompleto, tipo, corAvatar }

Como observar: Fazer login: entre as requisições da casca aparece GET /usuario/:id cuja resposta não muda nada na tela.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `AutenticacaoService` marca o instante em que o login definiu a sessão e `atualizarSessao()` não pede nada dentro de poucos segundos dele.
2. Teste do serviço: login seguido da montagem do layout não chama `GET /usuario/:id`; recarregar a página chama.

## Critérios de Aceite

- Ao vivo: o login gera uma requisição a menos na primeira tela; F5 continua reconferindo o usuário.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

A reconferência a cada abertura da casca (decisão do P-062).

## Dependências

Nenhuma.
