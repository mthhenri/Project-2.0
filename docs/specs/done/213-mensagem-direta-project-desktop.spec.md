# 213-mensagem-direta-project-desktop.spec.md

> Task 9/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md). Modelagem em [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md) (§10, "Project Desktop").
> Depende da [`209`](../done/209-mensagem-direta-tempo-real.spec.md), da [`210`](../done/210-mensagem-direta-popup-no-project.spec.md), da [`211`](../done/211-mensagem-direta-compositor.spec.md) e da [`212`](../done/212-mensagem-direta-avisos-no-project.spec.md).

## Objetivo

Levar o chat para **fora do Project**: com o Project Desktop em segundo plano (minimizado ou oculto na bandeja), um **atalho global** abre uma janela flutuante de chat; se na área de transferência há **código**, a janela abre numa conversa nova com o trecho já em bloco, para o usuário conferir antes de enviar.
Mensagem nova com o Project oculto vira **notificação do sistema** (se o usuário não desligou). O que já existe: popup interno (210), compositor (211), preferências com `avisoDesktopAtivo` e `atalhoGlobal` (205/208/212). Esta task é o lado do Desktop e as telas que ele precisa.

## Regras

- **Quem mostra o chat:** Project **visível** → o atalho abre o **popup interno** (o Desktop só avisa a página); Project **minimizado ou oculto** → a **janela do Desktop**. Nunca as duas ao mesmo tempo. Atalho com a janela do Desktop aberta a fecha.
- **Área de transferência:** lida **só no instante do atalho**, nunca antes nem em segundo plano. O Desktop envia o texto à página; é a página que decide (mesma regra do botão "colar como código" do compositor, `pareceCodigo`) se vira rascunho em bloco de código. Texto que não parece código **não** vira rascunho.
  Texto acima do limite da mensagem não é enviado à página.
- **Atalho:** vem da preferência do usuário (`atalhoGlobal`, padrão `Ctrl+Shift+Space`), lido de `GET /mensagem-direta/preferencia` com o token do login (a cada 60 s; sem login, sem atalho). Mudou a preferência → o atalho antigo sai e o novo entra. Atalho que o sistema não deixa registrar (em uso por outro programa) aparece no menu da bandeja como indisponível e no menu "Notificações" do Project.
- **Aviso com o Project oculto:** o front (que segue carregado, só sem janela) decide pelas regras da 212 (`decidirAviso`) e, com a janela oculta **e** `avisoDesktopAtivo`, entrega o aviso ao Desktop em vez do cartão; o Desktop mostra a **notificação do sistema** (som do sistema só se a preferência de som estiver ligada) e, ao clicar, abre a janela de chat naquela conversa.
- **Janela de chat:** sem moldura, sempre por cima (inclusive de programas em tela cheia), 420 × 640, no canto inferior direito do monitor onde está o cursor, arrastável pelo cabeçalho sem sair do monitor; Esc ou o botão a fecham (a janela é **destruída** ao fechar: não fica uma sessão do chat escondida). Carrega a rota `/chat-popup` do front.
  Links de demanda e atividade dentro dela abrem no **Project** (a janela principal vai para a rota), nunca dentro da janelinha.
- **Segurança:** a ponte (`preload`) expõe só funções nomeadas; o `main` confere quem enviou cada mensagem (janela do Project ou do chat), valida o formato e limita os tamanhos; a janela de chat é `sandbox`, sem `nodeIntegration`, e só navega na própria origem.

## Entregáveis

1. **Desktop** — `politica-do-chat.ts` (funções puras com teste: ler a preferência do corpo da API, escolher entre popup interno / janela / fechar, preparar o texto da área de transferência, validar o aviso e o pedido de navegação, posição da janela); `main.ts` (atalho global, janela de chat, notificação, itens da bandeja, reconferência da preferência), `preload.ts` (ponte nova), versão `1.1.0`, `README.md`.
2. **Front** — `ProjectDesktopService` (ponte tipada; no navegador não faz nada); rota `chat-popup` com `ChatPopupPage` (lista, conversa e nova conversa preenchendo a janela; cabeçalho arrastável; Esc fecha); `rascunho` do Desktop no estado (abre a nova conversa e, ao escolher a pessoa, semeia o compositor); o layout escuta o pedido do atalho (abre o popup interno, com o rascunho se houver) e o de navegação; o serviço de avisos entrega ao Desktop quando a janela está oculta.
3. **Atalho no menu "Notificações"** (só no Desktop): mostra o atalho, deixa gravar outro tecla a tecla (validado pela mesma regex do servidor) e avisa quando o sistema recusou. Lógica pura do evento de teclado → texto do atalho, com teste.
4. **Testes:** Desktop (`npm run test --workspace=desktop`), front (serviço da ponte, página da janela, rascunho, entrega do aviso, atalho do menu) e ao vivo (ver critérios).
5. **Documentação:** `desktop/README.md`, `docs/SYSTEM.SPEC.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- Testes do desktop e do frontend passam; builds do desktop e do frontend compilam (orçamento do bundle inicial respeitado); `npm run repo:verificar` passa. Backend e `shared` não mudam.
- Ao vivo (Electron real contra o front e a API de desenvolvimento): com o Project oculto, o atalho abre a janela; com código copiado em outro programa, abre na nova conversa com o bloco; escolher a pessoa e enviar chega ao colega; com o Project visível o atalho abre o popup interno e **não** a janela;
  mensagem do colega com o Project oculto gera a notificação, e o clique abre a janela naquela conversa; com `avisoDesktopAtivo` desligado, nada aparece; trocar o atalho no menu passa a valer em até 60 s; link de demanda na janela leva o Project para a rota.
- Visual: a janela de chat comparada com o popup interno (análogo aprovado), claro e escuro, no tamanho real da janela (420 × 640).
- Sem `ngModel`, `innerHTML`, `title` nem `style=""` inline.

## Fora de Escopo

- Assinar o executável, atualização automática do Desktop (a 198 só avisa) e instalador; Linux/macOS (o Desktop é Windows).
- Notificação com resposta rápida dentro do aviso do sistema; sincronizar a preferência entre computadores em tempo real (vale em até 60 s).
- Aviso com o Desktop **fechado** (push) e aplicativo mobile (fora da guarda-chuva).

## Dependências

`209` (stream), `210`/`211` (popup e compositor), `212` (regra de aviso, preferências e menu), `198` (aviso de versão nova). Fontes: `ATALHO_GLOBAL_PADRAO`, `REGEX_ATALHO_GLOBAL`, `LIMITE_TEXTO_MENSAGEM_DIRETA` do `shared`; janelinha do check-in (task 160) como molde.

## Riscos e Mitigação

- **Atalho em uso por outro programa:** o registro falha de forma silenciosa no Electron; o resultado de `register` é conferido e a indisponibilidade é mostrada.
- **Clipboard com dado sensível:** só é lido no atalho, só vai à janela de chat e só vira rascunho se parecer código; o usuário confere antes de enviar. Nada é gravado em disco nem enviado sem ação do usuário.
- **Duas sessões do chat (Project e janela):** a janela é destruída ao fechar e não gera avisos próprios (o serviço de avisos fica suprimido nela); o servidor trata as duas conexões (presença é união).
- **Usuário que sai (logout):** sem token, o atalho é desregistrado e a janela de chat é destruída na próxima conferência.
- **Janela de chat presa em tela cheia / sem foco:** nível `screen-saver` e foco explícito; Esc funciona com o campo em foco.
