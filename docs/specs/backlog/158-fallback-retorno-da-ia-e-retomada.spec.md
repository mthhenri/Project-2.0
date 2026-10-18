# Task 158 — Fallback: retorno da IA, "agora não" e retomada

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 10. Seções "Fallback" (Voltou, Ao voltar) e "Fora do banco".

## Objetivo

Quando a IA volta, perguntar ao usuário se quer voltar para ela (sem interromper o que ele faz), permitir "Agora não" com botão para voltar depois e, ao voltar, a IA retomar de onde parou.

## Entregáveis

1. Aviso "A IA voltou. Quer voltar a usar o chat?" com "Voltar para a IA" e "Agora não": o "agora não" fica no navegador (`localStorage`, por sessão) e deixa um botão "Voltar para a IA" visível na topbar enquanto durar o modo convencional.
2. Retomada: ao voltar para o chat, a IA lê o estado atual (execução ativa, o que mudou durante a queda: execuções iniciadas ou pausadas à mão, atividades criadas) e continua dali, com uma mensagem curta do sistema ("estado atualizado durante a queda"). Propostas **pendentes** de antes da queda são mostradas como estavam ou expiradas se a ação ficou obsoleta (estado mudou).
3. Sem perder a conversa do dia: as mensagens continuam as mesmas depois do retorno.
4. Testes de backend da leitura de "o que mudou" (execuções e atividades desde o último instante conhecido) e da expiração de proposta obsoleta.

## Critérios de Aceite

- Na aplicação real: derrubar a IA, fazer uma ação manual (iniciar execução em Atividades), ligar a IA de novo; o aviso aparece, "Agora não" mantém o convencional, "Voltar para a IA" retoma e a IA sabe da execução iniciada à mão.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Retomada de proposta no meio da confirmação além de expirá-la; histórico de quedas.

## Dependências

`157`, `145` e `139`.

## Riscos e Mitigação

- O estado de falha só se recupera com uma chamada bem-sucedida: o aviso "voltou" só aparece quando o backend já viu essa chamada.
