# 212-mensagem-direta-avisos-no-project.spec.md

> Task 8/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md). Modelagem em [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md)
> (§4 `mensagem_direta_preferencia` e `mensagem_direta_leitura`). Depende da [`210`](../done/210-mensagem-direta-popup-no-project.spec.md) e da [`211`](../done/211-mensagem-direta-compositor.spec.md).
> Desenho aprovado: mockup 2 (aviso no canto e menu de notificações) e a lista com conversa silenciada.

## Objetivo

Avisar o usuário de mensagem nova dentro do Project, sem ser inconveniente: um **aviso** no canto da tela (e som, se ele quiser), que ele pode **desligar**, **silenciar por um tempo** (reunião) ou **silenciar por conversa**. Todo o backend já existe (preferências e silêncio por conversa, tasks 205 e 208);
esta task é o lado do Project.

## Entregáveis

1. **Preferências no front:** o estado carrega `GET /mensagem-direta/preferencia` ao iniciar e grava com `PUT` (o conjunto inteiro), com atualização na hora e volta ao valor anterior se o servidor recusar.
2. **Menu "Notificações"** no cabeçalho da lista do popup (sino): interruptores **Avisos de mensagem** (popup dentro do Project), **Aviso no Project Desktop** (só grava a preferência; quem a usa é a 213) e **Som**; e "Silenciar tudo": **Por 1 hora (reunião)**, **Até amanhã às 8h** (no fuso do sistema) e
   **Até eu reativar**; com o silêncio ativo mostra "Silenciado até hh:mm" e o botão "Reativar".
3. **Silêncio por conversa:** botão de sino no cabeçalho da conversa (silencia e reativa, com tooltip) usando `PUT /mensagem-direta/conversa/:usuarioId/silencio`; o ícone de sino cortado da lista passa a refletir a mudança na hora. Conversa silenciada **não conta** no contador do topbar (o contador da própria linha na lista continua).
4. **Aviso de mensagem nova** (`app-mensagem-direta-avisos`, no layout): cartão no canto superior direito (avatar, nome, prévia sem marcação; "@você" destacado quando a mensagem menciona o usuário; fechar; botão **Responder** e clique no cartão abrem a conversa), some sozinho em 8 s
   (pausa com o mouse ou o foco em cima), no máximo 3 empilhados, e mensagens seguidas da mesma pessoa **atualizam o mesmo cartão** ("3 mensagens novas") em vez de empilhar. Anunciado com `aria-live="polite"`. **Som** curto (gerado pelo navegador, sem arquivo) quando a preferência está ligada.
5. **Quando avisa** (regra pura, com teste): só mensagem **de outra pessoa**, recebida pelo stream, e nunca com os avisos desligados nem com o silêncio geral ativo; conversa silenciada só avisa se a mensagem **menciona** o usuário; não avisa se o usuário já está olhando aquela conversa (popup aberto nela e página visível).
6. **Testes:** unitários da regra, do rótulo e do cálculo do silêncio (incluindo "amanhã às 8h" em outro fuso); de componente do menu, do aviso e do botão da conversa; ao vivo com dois usuários nos três viewports e nos dois temas.
7. **Documentação:** `docs/SYSTEM.SPEC.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- Testes e builds do frontend passam (backend e `shared` não mudam); `npm run repo:verificar` passa.
- Ao vivo: mensagem do colega com o popup fechado mostra o aviso e soma o contador; com a conversa aberta e a página visível não avisa; desligar os avisos, silenciar por 1 hora e silenciar a conversa calam o aviso (e a menção fura só o silêncio da conversa); o som toca quando ligado;
  as escolhas sobrevivem a recarregar a página; claro e escuro; `1920×1080`, `1366×768` e `1080×1920`.
- Sem `ngModel`, `innerHTML`, `title` nem `style=""` inline; tooltip só do PrimeNG.

## Fora de Escopo

- Notificação do sistema operacional (API `Notification` do navegador, que pede permissão) e título da aba com contador; o aviso fora do Project é a janela do Desktop (213). O interruptor "Aviso no Project Desktop" só guarda a escolha.
- Sincronizar a preferência entre abas ou computadores em tempo real (vale ao carregar); aviso de menção para quem não participa da conversa (regra da 208).
- Mostrar "em reunião até hh:mm" na presença.

## Dependências

`208` (rotas de preferência e silêncio), `209` (eventos), `210` e `211` (popup e menções). Fontes: mockup 2, `estaSilenciado`, `silenciarAteDeReuniao` e `PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA` do `shared`.

## Riscos e Mitigação

- **Aviso em excesso:** a regra é pura e testada; mensagens seguidas atualizam o mesmo cartão e há teto de 3.
- **Som bloqueado pelo navegador** (sem interação prévia): a falha é engolida e o aviso aparece sem som.
- **Preferência que não gravou:** a tela volta ao valor anterior e mostra o erro no próprio menu; nunca fica uma escolha só visual.
- **Relógio e fuso:** "amanhã às 8h" é calculado no fuso do sistema (`APP_TIMEZONE`), não no do navegador.
