# Task 151 — Check-in: tela da janela de check-in

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 7. Fluxo do desenvolvedor, itens 6 e 7; protótipo "Check-in" do artefato de design.

## Objetivo

Criar a tela web do check-in (a janela que o Electron mostra à frente): pergunta da IA, resposta do desenvolvedor, proposta de descrição e confirmação.

## Entregáveis

1. Rota `/checkin` (layout próprio, sem menu lateral), que consulta `GET /checkin/situacao`, abre a conversa de check-in e mostra título "Hora do check-in", atividade, demanda e a duração com selo de rigor (cor muda acima da recomendada).
2. Conversa de check-in com streaming (`POST /checkin/mensagem`), sugestões de resposta e o cartão de proposta de descrição (150) dentro da janela; fecha só quando a proposta é confirmada ou o check-in é dispensado por quem pode (suspensão por reunião, 148).
3. Sem execução ativa a tela explica que não há check-in e se fecha sozinha; IA desligada ou fora do ar mostra o fallback (157) em vez do check-in.
4. Registrar o análogo visual (a tela do chat, 139) e o gate visual.

## Critérios de Aceite

- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Na aplicação real, o fluxo completo (pergunta, resposta, descrição, confirmar) termina com a execução descrita e a janela liberada.

## Fora de Escopo

- O comportamento "sempre à frente" e o timer (152).

## Dependências

`149`, `150` e `139`.
