# Task 147 — Chat: bom dia proativo

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 6. Fluxo do desenvolvedor, itens 1 e 2.

## Objetivo

Ao abrir o chat do dia, a IA cumprimenta sozinha com o plano do dia em ordem de prioridade ("ontem você parou em…"), lendo o pad e as atividades.

## Entregáveis

1. Backend: rota `POST /chat/bom-dia` (SSE, mesmo formato de `POST /chat/mensagem`) que só age se a conversa do dia **ainda não tem mensagem da IA**; usa as ferramentas de leitura (`consultar_pad`, `listar_minhas_atividades`, `consultar_execucao_ativa`) no nível rápido e grava só a mensagem da IA (não há mensagem do usuário que a provoque). Chamadas repetidas ou concorrentes não duplicam o bom dia (409 ou resposta vazia).
2. Prompt `CONVERSA` ganha a instrução do bom dia (plano por prioridade, o que ficou em andamento ontem, sem inventar).
3. Frontend: ao abrir `/chat` de hoje com a conversa vazia e a IA no ar, dispara o bom dia e mostra a resposta chegando; o estado vazio da 141 só aparece com a IA desligada ou se o bom dia falhar. Sem repetir a cada F5.
4. Testes: só uma vez por dia, só com IA no ar, sem mensagem do usuário.

## Critérios de Aceite

- Na aplicação real, o primeiro acesso do dia mostra o bom dia com as atividades por prioridade e o contexto do pad; F5 não gera outro; no dia seguinte gera de novo.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Bom dia do gestor (resumo da equipe), notificação do sistema e o bom dia no check-in.

## Dependências

`144` e `146` (leitura de atividades e pad) e `139` (tela).
