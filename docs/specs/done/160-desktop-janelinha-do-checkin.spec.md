# Task 160 — Project Desktop: janelinha do check-in

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 7. Conversa com o autor de 2026-10-18; protótipo de comportamento validado.

## Objetivo

Fazer o Project Desktop mostrar o check-in na hora certa: uma janelinha pequena, separada, obrigatória, mesmo com o Project minimizado e o desenvolvedor trabalhando em outro programa.

## Comportamento (combinado com o autor)

- **Project minimizado** (o desenvolvedor está no editor): aparece **só a janelinha** (algo perto de 480 × 560 px), carregando a rota `/checkin` da task 151, **sem** o Project inteiro por trás.
- A janelinha **arrasta** pelo título (para o desenvolvedor liberar o código que quer consultar), não sai do monitor e fica **sempre por cima**, **sem fechar nem minimizar**. O único botão é "Estou em reunião" (a suspensão da 148); ela fica até a descrição ser confirmada ou a suspensão valer.
- **Project aberto** no desktop (ou no navegador): o check-in aparece **dentro do Project**, como janelinha no centro com a tela escurecida (comportamento da 161); o desktop não abre a janelinha separada.
- Em qualquer área de trabalho do Windows: o app minimiza e restaura a janela atual antes de mostrar a janelinha.
- Terminando (descrição confirmada) ou suspendendo, a janelinha some.

## Entregáveis

1. Janela do check-in no `desktop/` (`alwaysOnTop`, não minimizável, não fechável, arrastável, uma por vez), carregando `/checkin`.
2. Lógica de quando mostrar (função pura testável): só com o Project minimizado/oculto, só com check-in disparado pelo backend (161), nunca duas, some ao registrar ou suspender.
3. Comunicação mínima com a página `/checkin` para saber que terminou (a 151 já devolve o estado "registrado"/"suspenso"); ajuste da 151 só se faltar um sinal claro.
4. Documentação e testes das funções puras.

## Critérios de Aceite

- No Windows real, com o Project minimizado e uma execução ativa, a janelinha aparece à frente do editor, arrasta, não fecha nem minimiza, e some ao descrever ou suspender.
- Com o Project aberto no desktop, só aparece o check-in dentro do Project.
- Build do `desktop` e `npm test` na raiz; verificação visual manual declarada se o ambiente não rodar o Electron.

## Fora de Escopo

- A casca e a bandeja (152) e o horário do check-in (161).

## Dependências

`151`, `152` e `161`.

## Riscos e Mitigação

- O ambiente de verificação pode não executar o Electron: a task fica **aberta** com o que foi testado e o que falta (janela real).
