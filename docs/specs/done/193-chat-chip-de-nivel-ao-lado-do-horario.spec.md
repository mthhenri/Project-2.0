# Task 193 — Chip de nível da IA ao lado do horário

> Origem: ideia I-008 (anotações do autor, 2026-10-19). Guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5 (chat).

## Objetivo

O chip "Rápido / Padrão / Analítico" sai do alto da resposta da IA e passa para o rodapé da mensagem, ao lado do horário.

## Entregáveis

1. `chat.page.html`: o `span.chat__nivel` sai de cima do texto e entra em `chat__rodape-mensagem`, **depois** do horário e antes do botão de copiar.
2. `chat.page.scss`: o chip fica no tamanho de metadado (mesma fonte do horário, discreto); sem mudar as cores existentes.
3. Mensagens sem `nivel` (check-in, sistema, antigas) seguem sem chip.

## Critérios de Aceite

- Resposta da IA mostra `dd/MM/yyyy HH:mm · [Rápido]` embaixo; nada de chip no alto.
- O `aria-label` "Nível usado: ..." continua; os testes do chat que procuram o chip continuam passando.
- Verificação ao vivo nos três viewports com respostas dos três níveis (mensagens plantadas no banco, sem depender da IA).

## Fora de Escopo

- Mudar a lógica do selo de nível (task 188).
