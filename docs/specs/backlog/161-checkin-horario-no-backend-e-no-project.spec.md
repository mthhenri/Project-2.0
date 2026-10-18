# Task 161 — Check-in: horário sorteado no backend e janelinha dentro do Project

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 7. Conversa com o autor de 2026-10-18: o timer deixa de viver no Electron (como no V1) e passa para o backend, e o check-in aparece também **dentro do Project** no navegador.

## Objetivo

Deixar o backend dono de **quando** é o próximo check-in, e fazer o Project (navegador ou desktop) mostrar o check-in como janelinha sobre a tela escurecida quando a hora chegar.

## Entregáveis

1. **Backend**: o `CheckinService` sorteia o próximo horário entre o mínimo e o máximo da configuração (por usuário, em memória como a suspensão da 148), **só enquanto há execução ativa** e sem suspensão; recalcula ao registrar o check-in, ao iniciar, trocar ou pausar a execução e ao voltar da reunião; não dispara logo depois de um início (conta a partir do `inicio_data`). `GET /checkin/situacao` passa a devolver `proximoCheckinData` (ou nulo) e se o check-in **está disparado** agora.
2. **Frontend**: serviço que consulta a situação, mostra a janelinha do check-in (a conversa e o cartão da 151) como **diálogo central com a tela escurecida** em qualquer rota do `LayoutComponent`, fixo até a descrição ser confirmada ou a suspensão valer (com "Estou em reunião"). A rota `/checkin` continua existindo para o desktop (160).
3. **Dois lugares abertos ao mesmo tempo** (navegador e desktop): o estado vem do backend, então registrar em um libera o outro na próxima consulta.
4. Funções puras testadas (sorteio, quando não disparar, recálculo) com `node:test` e documentação.

## Critérios de Aceite

- Na aplicação real: com execução ativa e o intervalo reduzido na configuração para o teste, o check-in aparece sozinho no Project aberto, escurece a tela, não fecha sem descrição ou suspensão, e o próximo horário é sorteado de novo; sem execução ativa nada aparece.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro (análogo: a janela da 151 e os diálogos do sistema); testes de `backend` e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- O app desktop e a janelinha fora do Project (152 e 160).

## Dependências

`149`, `148` e `151`.
