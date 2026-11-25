# 492-detalhes-da-pia.spec.md

> Task solta, pedida pelo autor em 2026-11-25, continuação da 491. O autor pediu discrição: a spec descreve só o
> necessário para a manutenção, e os commits citam apenas "ajustes no detalhe da Piá".

## Objetivo

Ajustar o retorno da 491: volume pela metade e três gatilhos novos.

## Entregáveis

1. **Volume:** `PICO_DO_VOLUME` de `pia-som.service.ts` passa de 0,3 para 0,1 (decisão do autor em duas rodadas). O aviso do chat entre colaboradores não muda.
2. **No chat da IA, por texto:** a mensagem reconhecida por `ehMensagemDoCanto` (comparação sem maiúsculas, acentos,
   pontuação, espaços e hífens) toca o som e balança o avatar mais recente (ou o do estado vazio). Ela limpa o campo e
   **não** vai ao servidor nem à IA, sem balão nem aviso. Vale só no envio novo, não no "Tentar de novo".
3. **Em 29/03** (fuso do sistema): na primeira vez no dia em que o chat da IA abre, toca uma vez, com o balanço.
4. **Cedo:** abrindo o Project (casca) das 05:00 às 08:00, inclusive, no fuso do sistema, toca uma vez no dia.
5. **Uma vez por dia** (itens 3 e 4): a data fica no `localStorage`, uma chave por gatilho, com `try/catch`; sem
   armazenamento, não toca.
6. **Sem interação:** se o navegador ainda não liberou o áudio, o pedido espera o primeiro `pointerdown` ou `keydown`.
   O Project Desktop não define `autoplayPolicy` (o padrão do Electron libera), e o adiamento vale pelo estado do áudio.

Regras puras em `frontend/src/app/modules/chat/utils/detalhes-da-pia.util.ts`.

## Critérios de Aceite

- Testes das regras (texto, 29/03 no fuso, das 05:00 às 08:00, uma vez por dia), do serviço (adiamento) e do desvio no chat (não
  chama o serviço do chat; chama o som). Testes, build do frontend e `npm run lint:tudo` sem erros.
- Ao vivo, com o `AudioContext` instrumentado e o relógio do Playwright: texto, 29/03, dentro e fora da janela da manhã e o segundo
  acesso no mesmo dia, que não toca.

## Fora de Escopo

- Qualquer menção em tela, ajuda ou textos do app. Arquivo de áudio.
