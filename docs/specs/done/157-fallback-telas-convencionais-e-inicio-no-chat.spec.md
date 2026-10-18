# Task 157 — Fallback: telas convencionais, pad editável e login no chat

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 10. Seção "Fallback" e "Fluxo do desenvolvedor", item 1.

## Objetivo

Fechar o fallback das telas: com a IA indisponível o usuário volta sozinho ao fluxo convencional, e com a IA no ar o login cai no chat do dia.

## Entregáveis

1. Consolidar a regra única "a IA está no ar?" (`IaDisponibilidadeService`, task 139) e aplicá-la: menu (já feito para Atividades e Execuções), pad editável (146), iniciar/pausar manuais na tela de Atividades e edição da descrição da execução, com teste de que cada tela convencional **funciona** com a IA fora do ar.
2. Detecção automática (`deteccao_automatica` da configuração): com a flag ligada, falhas do provedor marcam a IA fora do ar para todos e a primeira chamada bem-sucedida a recupera (comportamento da task 130, apenas conferido); com ela desligada, só o desligamento manual troca as telas. Documentar e testar.
3. Login: com a IA no ar o destino é `/chat`; com a IA desligada ou fora do ar, `/atividade` como hoje (a memória do projeto registra que `/atividade` é intencional; ajustar essa nota em `docs/` junto).
4. Se o usuário está no chat quando a IA cai, mostra o aviso e oferece "Ir para Atividades".

## Critérios de Aceite

- Na aplicação real: IA ligada leva o login ao chat; desligar pela tela de Configurações habilita Atividades, Execuções e a edição do pad em até 1 minuto; ligar de novo desabilita de novo.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- A pergunta "A IA voltou, quer voltar a usar?" e a retomada (158).

## Dependências

`139`, `146`, `145` e `132` (flags).
