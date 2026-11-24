# 491-detalhe-no-avatar-da-pia.spec.md

> Task solta, pedida pelo autor em 2026-11-24, depois da identidade visual (task 489). O autor pediu discrição: a spec
> descreve só o necessário para a manutenção, e os commits citam apenas "detalhe de interação no avatar da Piá".

## Objetivo

Um retorno pequeno e escondido no avatar da Piá do chat da IA: tocar o avatar várias vezes seguidas faz a Piá
responder com um som curto e um leve balanço do avatar.

## Entregáveis

1. **Regra pura** (`frontend/src/app/modules/chat/utils/toques-rapidos.util.ts`): recebe os toques guardados e o
   instante do toque novo; completa quando há **5 toques em menos de 2 segundos** (do primeiro ao quinto) e então zera
   a contagem.
2. **Som** (`frontend/src/app/modules/chat/services/pia-som.service.ts`): gerado pelo navegador (Web Audio, sem
   arquivo), como o aviso de mensagem do chat entre colaboradores. O desenho é o da prévia aprovada pelo autor
   ("Fiel à gravação"): três notas com contorno de frequência, uma segunda voz na última e um sopro de ruído filtrado nas
   duas primeiras; volume 0,3. Um por vez: enquanto toca, um novo pedido não toca outro. Sem áudio disponível (ou
   bloqueado), não faz nada.
3. **Diretiva** (`frontend/src/app/modules/chat/directives/avatar-da-pia.directive.ts`, `[appAvatarDaPia]`): no
   avatar da Piá do chat da IA (mensagem da IA e estado vazio), conta os toques (`pointerup`) pela regra, toca o som e
   marca o avatar com a classe `app-pia-cantando` enquanto ele dura. Não aparece texto, aviso nem cursor de clique.
4. **Animação** global em `styles.scss` (`app-pia-cantando`): o balanço do avatar marcado; desligado com
   `prefers-reduced-motion`. Fica fora do `chat.page.scss`, que já está no limite do orçamento de estilo do build.

## Critérios de Aceite

- Teste da regra pura (5 rápidos completam; 4 não; toques espaçados reiniciam; o sexto não completa de novo) e testes
  da diretiva e do serviço; `npm run test --workspace=frontend`, `npm run build --workspace=frontend` e
  `npm run lint:tudo` sem erros.
- Verificação ao vivo no chat da IA: 5 toques rápidos no avatar tocam (o som é observado pelo `AudioContext`
  instrumentado no Playwright) e marcam o avatar; 4 toques ou toques lentos não. Só o avatar da Piá do chat da IA
  responde (check-in e grupo, não).

## Fora de Escopo

- Outros gatilhos (atalho de teclado, sorte ao encerrar o dia): o autor não escolheu nesta task.
- Arquivo de áudio gravado.
- Qualquer menção em tela, ajuda ou textos do app.

## Dependências

- Task 489 (o avatar da Piá, `app-logo-pia`).
- Prévia aprovada: `491-detalhe-no-avatar-da-pia/proposta.md`.
