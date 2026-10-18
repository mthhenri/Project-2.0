# Task 149 — Check-in: backend, conversa de check-in e rigor proporcional

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 7. Fluxo do desenvolvedor, itens 6 e 7.

## Objetivo

Dar ao check-in o que ele precisa no backend: a situação da execução ativa, a conversa do check-in (contexto `CHECKIN`) e o rigor proporcional à duração.

## Entregáveis

1. `GET /checkin/situacao` (o próprio usuário): execução ativa (atividade, demanda, `inicio_data`, duração), se há suspensão (148), os intervalos e a duração recomendada da configuração ativa da IA; sem execução ativa, devolve "sem check-in".
2. `POST /checkin/mensagem` (SSE, mesmo formato do chat) com o prompt `CHECKIN` no nível rápido, mensagens gravadas com `contexto` `CHECKIN` na conversa do dia (a conversa do chat continua separando pelo `contexto`), ferramentas de leitura e de proposta.
3. **Rigor proporcional** (flag `rigor_proporcional`): acima da duração recomendada a IA é instruída a pedir mais detalhe antes de propor a descrição ("foram 2h40, teve mais alguma coisa?"); a duração entra no contexto do prompt, calculada no backend. Não é trava: qualquer duração é aceita.
4. Prompt `CHECKIN` padrão (nova versão de seed) com o tom, o rigor e a regra de que a narrativa crua fica no chat e só a descrição formal vai para a execução.
5. Testes: situação com e sem execução, suspensão, rigor ligado e desligado, contexto gravado como `CHECKIN`.

## Critérios de Aceite

- Na aplicação real, com uma execução ativa há mais de 1h30, a IA pede mais detalhe; abaixo disso, vai direto à descrição; sem execução ativa a rota diz que não há check-in.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- A proposta de descrição em si (150), a janela (151) e o Electron (152).
- Sorteio do intervalo (é do Electron, 152).

## Dependências

`148`, `144`, `138` (conversa) e `131` (prompts).
