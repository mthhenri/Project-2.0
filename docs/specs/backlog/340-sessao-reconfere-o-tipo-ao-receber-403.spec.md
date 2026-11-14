# 340-sessao-reconfere-o-tipo-ao-receber-403.spec.md

> Task 12/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-015 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/casca.

## Objetivo

Quando o backend recusa por permissão, o front reconfere o usuário (tipo e ativo) em vez de continuar com o tipo lido na abertura da casca.

## Contexto

**A-015 · Baixa · O tipo do usuário na sessão só é conferido quando o layout nasce; um 403 não o atualiza**

Menus, guards e botões decidem pelo tipo guardado em usuario_sessao (localStorage). Esse valor só é trocado pelo do servidor no construtor do layout. Numa janela que fica aberta por dias (o Project Desktop) uma troca de tipo não chega à interface: o rebaixado continua vendo telas e botões que respondem 403, o promovido não vê os novos. Na abertura, os guards de rota decidem antes de a resposta do atualizarSessao chegar. O interceptor, ao receber 403, só mostra 'Acesso não permitido'.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/layout.component.ts:22-25 — atualizarSessao() só no construtor do layout
- frontend/src/app/core/services/usuario-sessao.service.ts:65-73 — o tipo vem do localStorage na partida
- frontend/src/app/core/guards/gestor.guard.ts:5-9, administrador.guard.ts:6-10, permissao.guard.ts:7-13 — guards leem a sessão em memória, sem esperar o servidor
- frontend/src/app/core/interceptors/error-handler.interceptor.ts:29-31 — 403 só gera toast
- backend/src/modules/autenticacao/strategies/jwt.strategy.ts:25-36 — o backend usa o tipo atual a cada requisição (a proteção real está lá)

Como observar: Com um gestor logado e a aplicação aberta, outro administrador troca o tipo dele para desenvolvedor. Sem recarregar, o menu ainda mostra Usuários e Calendário; abrir uma delas gera 403 e toasts 'Acesso não permitido'.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. O `errorHandlerInterceptor`, no 403, pede `AutenticacaoService.atualizarSessao()` no máximo uma vez a cada poucos segundos.
2. Menus e guards se realinham pelos sinais da sessão; se a tela atual deixou de ser permitida, o usuário é levado à raiz.
3. Teste do interceptor (403 chama a reconferência uma vez; rajada de 403 não repete).

## Critérios de Aceite

- Ao vivo: rebaixar um gestor a desenvolvedor com a sessão dele aberta; a primeira ação recusada atualiza o menu sem F5.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.
