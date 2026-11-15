# 462-desktop-janela-de-chat-reaproveitada.spec.md

> Task 134/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-179, A-180 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: desktop e frontend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir se vale reaproveitar a janela de chat: hoje cada abertura pelo atalho global cria uma janela nova em `/chat-popup`, que carrega a SPA, abre um segundo `GET /mensagem-direta/eventos` do mesmo usuário e repete a lista de conversas e a preferência.

## Contexto

**A-179 · Baixa · Cada abertura da janela de chat carrega a SPA inteira e abre um segundo stream de eventos**

O atalho global com o Project oculto cria uma BrowserWindow nova em /chat-popup; fechar destrói a janela, então a abertura seguinte repete tudo. A janela inicia o estado do chat por conta própria: segundo GET /mensagem-direta/eventos do mesmo usuário (a janela principal oculta mantém o dela), mais /conversas e /preferencia. A rota fica fora do layout, então o resto da casca não se repete.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:626-643,687 — new BrowserWindow e loadURL(enderecoDaJanelaDeChat(...)) a cada abertura
- desktop/src/main.ts:690-697 — fecharJanelaDeChat destrói a janela (comentário: não fica escondida com sessão aberta)
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-popup/mensagem-direta-popup.component.ts:137-138 — ngOnInit chama estado.iniciar()
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:200-209 — iniciar abre o stream, carregarConversas() e avisos.carregarPreferencia()
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-eventos.service.ts:102 — fetch de /mensagem-direta/eventos
- frontend/src/app/modules/mensagem-direta/pages/chat-popup/chat-popup.page.ts:44 — nesta janela os avisos ficam suprimidos, e ainda assim a preferência é relida
- frontend/src/app/shared/layout/layout.component.html:11 — a janela principal já tem o mesmo popup e o mesmo estado iniciados

Como observar: Project na bandeja, apertar o atalho global do chat. No DevTools da janela de chat (app não empacotado): index e chunks, GET /mensagem-direta/eventos pendente, /conversas e /preferencia. Fechar com Esc e apertar de novo: repete tudo.

Verificação na auditoria: código, por um auditor; o Electron não roda no ambiente da auditoria.

**A-180 · Baixa · Janela /chat-popup do Desktop abre um segundo stream e repete lista e preferência**

A rota `/chat-popup` monta o mesmo popup, cujo `ngOnInit` chama `estado.iniciar()`. Por ser outra janela, ela abre um segundo `GET /mensagem-direta/eventos` e repete `GET /conversas` e `GET /preferencia`, além da conversa pedida ou de `GET /pessoas`. A rota fica fora do layout, e todo `SINCRONIZAR` passa a ser relido nas duas janelas.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/app.routes.ts:48-52 — rota `chat-popup` fora do layout, só com `autenticacaoGuard`
- frontend/src/app/modules/mensagem-direta/pages/chat-popup/chat-popup.page.html:1 — `<app-mensagem-direta-popup [emJanela]="true" />`
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-popup/mensagem-direta-popup.component.ts:138 — `this.estado.iniciar()` também na janela
- frontend/src/app/modules/mensagem-direta/pages/chat-popup/chat-popup.page.ts:51-58 — abre grupo, conversa ou `abrirPeloDesktop`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:271 — `carregarPessoas()` quando há código copiado

Como observar: No Project Desktop, com o Project aberto, acionar o atalho global do chat. Rede da janela nova: GET /mensagem-direta/eventos, GET /conversas, GET /preferencia e GET /pessoas ou /conversa/ID; a janela principal mantém o stream dela.

Verificação na auditoria: código, por um auditor; o Electron não roda no ambiente da auditoria.

## Decisão do autor pendente

**Antes:** fechar destrói a janela; a próxima abertura repete tudo.

**Opções:**

1. Manter a janela viva e escondida por alguns minutos depois de fechar (reaproveita o bundle, o stream e a lista).
2. Compartilhar o estado entre as janelas (IPC do Desktop ou `BroadcastChannel`), sem stream próprio na janela de chat.
3. Aceitar o custo como está.

## Entregáveis

1. A opção escolhida em `desktop/src/main.ts` (e no estado do chat, na opção 2), com teste da política da janela.

## Critérios de Aceite

- Na opção 1: abrir, fechar e abrir a janela de chat em menos de um minuto não recarrega a SPA.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

