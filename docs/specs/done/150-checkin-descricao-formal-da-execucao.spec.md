# Task 150 — Check-in: descrição formal da execução

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 7. Fluxo do desenvolvedor, itens 6 e 9.

## Objetivo

Transformar o que o desenvolvedor conta num check-in em uma **descrição formal** (sem "eu", sem gírias) proposta para a execução, com a escolha de continuar na mesma atividade ou trocar.

## Entregáveis

1. Executor `DESCREVER_EXECUCAO`: grava a descrição na execução pelo `ExecucaoService` (permissão por dono) e, conforme a escolha do usuário na proposta, **continua** (pausa e reabre a execução na mesma atividade, mantendo o `inicio_data` do novo trecho) ou **troca** de atividade; desfazer restaura a descrição anterior e o estado da execução quando ainda for seguro.
2. Ferramenta `propor_descrever_execucao` (descrição, atividade seguinte opcional) com a chamada de redação no nível **padrão** (prompt `DESCRICAO_EXECUCAO`), rigor proporcional incluído; a IA nunca descreve almoço nem pausa pessoal.
3. Cartão de proposta: descrição formal editável antes de confirmar, escolha "Continuar nesta atividade" / "Trocar para…" e o tempo da execução.
4. Testes: continuar (pausa e reabre), trocar, descrição recusada em execução de outro usuário, desfazer.

## Critérios de Aceite

- Na aplicação real, um check-in com narrativa informal gera uma descrição formal; confirmar com "continuar" encerra o trecho com a descrição e abre outro na mesma atividade, e com "trocar" abre na atividade escolhida.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- O timer e a janela (151, 152) e o fluxo do chat sem check-in.

## Dependências

`145`, `149` e `131` (prompts).
