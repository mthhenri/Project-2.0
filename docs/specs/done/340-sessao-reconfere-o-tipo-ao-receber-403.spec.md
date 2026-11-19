# 340-sessao-reconfere-o-tipo-ao-receber-403.spec.md

> Task 12/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-023, A-024 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/casca.

## Objetivo

Guards e menu deixam de decidir com o `usuario_sessao` gravado no `localStorage` no login sem conferir: a primeira navegação espera a reconferência do usuário no servidor (hoje ela roda depois dos guards), e um 403 dispara nova reconferência. O backend já recusa o que o tipo real não pode; o que muda é a tela deixar de mostrar menus e telas de um tipo que o usuário não tem mais (ou que alguém editou no navegador).

## Contexto

**A-023 · Média · O tipo do usuário na sessão só é conferido quando o layout nasce; um 403 não o atualiza**

Menus, guards e botões decidem pelo tipo guardado em usuario_sessao (localStorage). Esse valor só é trocado pelo do servidor no construtor do layout. Numa janela que fica aberta por dias (o Project Desktop) uma troca de tipo não chega à interface: o rebaixado continua vendo telas e botões que respondem 403, o promovido não vê os novos. Na abertura, os guards de rota decidem antes de a resposta do atualizarSessao chegar. O interceptor, ao receber 403, só mostra 'Acesso não permitido'.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/layout.component.ts:22-25 — atualizarSessao() só no construtor do layout
- frontend/src/app/core/services/usuario-sessao.service.ts:65-73 — o tipo vem do localStorage na partida
- frontend/src/app/core/guards/gestor.guard.ts:5-9, administrador.guard.ts:6-10, permissao.guard.ts:7-13 — guards leem a sessão em memória, sem esperar o servidor
- frontend/src/app/core/interceptors/error-handler.interceptor.ts:29-31 — 403 só gera toast
- backend/src/modules/autenticacao/strategies/jwt.strategy.ts:25-36 — o backend usa o tipo atual a cada requisição (a proteção real está lá)

Como observar: Com um gestor logado e a aplicação aberta, outro administrador troca o tipo dele para desenvolvedor. Sem recarregar, o menu ainda mostra Usuários e Calendário; abrir uma delas gera 403 e toasts 'Acesso não permitido'.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

**A-024 · Média · Guards e menu decidem com o usuario_sessao do localStorage; a reconferência é única, assíncrona e posterior aos guards, e o 403 não reconfere**

O tipo do usuário usado por gestorGuard, administradorGuard, permissaoGuard e pela sidebar vem do JSON gravado no login, lido do localStorage sem validação. A única reconferência (atualizarSessao) roda no construtor do LayoutComponent, ou seja, depois que os guards da primeira navegação já decidiram, e só uma vez por abertura do app. Um 403 só mostra o toast genérico: usuário rebaixado continua vendo telas e botões de gestor (cada ação vira 403) e usuário promovido é redirecionado para / no deep link, até recarregar.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/services/usuario-sessao.service.ts:65-69 — restaurarSessao faz JSON.parse de 'usuario_sessao' e põe direto no signal, sem validar
- frontend/src/app/core/guards/gestor.guard.ts:7 — decide por sessao.eGestor() (administrador.guard.ts:8 e permissao.guard.ts:9-10 idem, com o mesmo snapshot)
- frontend/src/app/shared/layout/layout.component.ts:24 — único chamador de atualizarSessao(), no construtor da casca
- frontend/src/app/core/services/autenticacao.service.ts:50-56 — GET /usuario/:id assíncrono; erro é ignorado (error: () => undefined)
- frontend/src/app/core/interceptors/error-handler.interceptor.ts:29-31 — 403 só adiciona o toast 'Acesso não permitido'
- frontend/src/app/core/services/autenticacao.service.ts:28 — login grava dados.usuario com cast duplo (as unknown as UsuarioRecuperadoDto)

Como observar: Entrar como gestor, rebaixar o usuário para DESENVOLVEDOR por outra sessão e, sem recarregar, navegar para /usuario: o guard passa e as chamadas respondem 403. Recarregar direto em /usuario: o guard ainda passa na primeira carga (tipo antigo) e o menu só corrige quando GET /usuario/:id voltar. Editar o campo tipo de usuario_sessao no DevTools também libera a interface (o backend segue recusando).

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. Na primeira navegação, os guards de tipo esperam `AutenticacaoService.atualizarSessao()` (guard assíncrono no layout), em vez de ler o tipo gravado.
2. O `errorHandlerInterceptor`, no 403, pede `AutenticacaoService.atualizarSessao()` no máximo uma vez a cada poucos segundos.
3. Menus e guards se realinham pelos sinais da sessão; se a tela atual deixou de ser permitida, o usuário é levado à raiz.
4. Teste do interceptor (403 chama a reconferência uma vez; rajada de 403 não repete).

## Critérios de Aceite

- Ao vivo: rebaixar um gestor a desenvolvedor com a sessão dele aberta; a primeira ação recusada atualiza o menu sem F5.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

