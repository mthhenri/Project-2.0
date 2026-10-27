# Verificação — 244 Check-in que troca sozinho e avisa do tempo

Verificada em 2026-10-26 com o stack real e IA da Anthropic, como o desenvolvedor `dev.teste`. Saídas em `.artifacts/244-chat-checkin-troca-sozinho/`
(ignorada pelo Git). Para passar da duração recomendada (1h30), o início da execução ativa foi recuado para 100 minutos atrás por SQL.

## Gates automáticos

`shared` 275, backend 1513 (inclui os 4 testes novos de `contexto-do-checkin`), integração 350, frontend 2213, builds e `repo:verificar` aprovados. Sem lint (P-001).

## Teste de prompt (`POST /prompt/CHECKIN/testar`, nível RAPIDO, só texto; contexto montado por `montarContextoDoCheckin`)

| Caso | Resultado |
|---|---|
| Continuação (50 min, mesmo bloco) | Aprovado: gera a chamada de `propor_descrever_execucao` com `CONTINUAR` |
| Bloco acabado e já começando outro | Aprovado: vai resolver as atividades (`listar_minhas_atividades`) antes da troca |
| Troca por bug do suporte | **Parcial:** o modelo rápido fez perguntas de detalhe em vez de decidir a troca. Ao vivo, com o modelo e as ferramentas reais, a troca saiu certa (abaixo) |
| Acima do recomendado (130 min) | Aprovado: comenta o tempo (2h10 contra 1h30) e sugere trocar ou quebrar o bloco, sem trava |

## Ao vivo no check-in (`/checkin`, 1920×1080)

- Execução de 1h42 mostra "acima do recomendado".
- Relato "terminei a investigação… vou voltar para o tratamento de erro de credencial": a IA pediu mais detalhe (rigor ligado, regra de antes) e **avisou do tempo** sugerindo trocar ou quebrar o bloco, sem trava.
- Resposta "foi só isso, pode registrar, marcar como desenvolvida e seguir": a descrição foi **registrada**, a atividade do caso 4821 virou `DESENVOLVIDA`, a execução seguiu na atividade **existente** "Tratar erro de credencial" (rodando) e **nenhuma atividade nova** foi criada. Banco conferido.

## Limites e achados

- Só 1920×1080 no check-in (a janela é uma tela de layout próprio); 1366×768 e 1080×1920 foram percorridos no chat, não nele. O check-in dentro do Project Desktop não foi exercitado.
- O desfazer da troca do check-in não foi exercitado ao vivo: a janela fecha ao registrar. O desfazer do grupo no chat foi recusado com segurança quando a execução já tinha sido encerrada (ver 243).
- O caso do bloco acabado sem próxima atividade (pausar e marcar) não foi percorrido.
