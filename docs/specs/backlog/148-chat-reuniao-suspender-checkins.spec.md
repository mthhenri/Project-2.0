# Task 148 — Chat: reunião e suspensão dos check-ins

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 6. Fluxo do desenvolvedor, item 8 (flag "check-in inteligente").

## Objetivo

Quando o desenvolvedor diz que vai entrar numa reunião, a IA propõe **suspender os check-ins** até ele voltar; a suspensão é um estado passageiro em memória no backend.

## Entregáveis

1. `CheckinSuspensaoService` (módulo próprio, estado em memória por usuário, com início e motivo; vale para uma instância, como o estado da IA) com `suspender`, `retomar` e `consultar`; retoma sozinho à meia-noite do fuso do sistema.
2. Executor `SUSPENDER_CHECKIN` (desfazer = retomar) e ferramentas `propor_suspender_checkin` e `propor_retomar_checkin`; só existem para o usuário quando a flag **checkin inteligente** da configuração da IA está ligada.
3. Rota `GET /checkin/suspensao` (o próprio usuário) para o Electron e a topbar consultarem; o cartão de proposta mostra "Suspender check-ins até você voltar".
4. Prompt `CONVERSA`: reconhecer reunião e voltar dela ("voltei").
5. Testes: estado por usuário, retomada, flag desligada esconde as ferramentas, desfazer.

## Critérios de Aceite

- Na aplicação real, "vou entrar numa reunião" propõe a suspensão e confirmar a registra; "voltei" propõe retomar; reiniciar o backend perde a suspensão (comportamento documentado).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- O timer e a janela de check-in (151 e 152) e a descrição do que foi feito antes da reunião (150).

## Dependências

`145` (propostas de execução) e a configuração da IA (`129`).
