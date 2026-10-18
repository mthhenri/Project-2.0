# Task 152 — App Electron: casca e timer do check-in

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 7. Seção "App Electron".

## Objetivo

Criar a casca Electron que carrega a URL do Project como uma aba de navegador, sorteia o intervalo do check-in e traz a janela de check-in sempre à frente até o registro.

## Entregáveis

1. Novo workspace `electron/` (acrescentar ao `workspaces` da raiz, com `package.json`, TypeScript e build para Windows), com a URL do Project configurável (variável de ambiente ou arquivo de configuração), janela principal que carrega o sistema, login normal e as mesmas rotas.
2. Timer: lê `GET /checkin/situacao`, sorteia o próximo intervalo entre o mínimo e o máximo configurados, **só enquanto há execução ativa** e sem suspensão; consulta a execução ativa antes de abrir para não aparecer logo depois de um início (usa o `inicio_data`).
3. Na hora, abre `/checkin` numa janela **sempre à frente** (`alwaysOnTop`), que só fecha com o check-in registrado; depois sorteia o próximo.
4. Documentação: README do workspace (rodar em dev, empacotar, configurar a URL), `docs/SYSTEM.SPEC.md` e `docs/context/`; `.gitignore` do build.
5. Teste do sorteio e das regras de quando não abrir (função pura com `node:test`).

## Critérios de Aceite

- Empacotado num Windows comum, abre o Project, e com uma execução ativa o check-in aparece à frente no intervalo sorteado e só fecha depois de registrado; sem execução ativa não aparece.
- Build do `electron` e `npm test` na raiz; verificação visual manual declarada se o ambiente não rodar o Electron.

## Fora de Escopo

- Atualização automática do app, instalador assinado, tela offline e fila local (descartada pelo autor).

## Dependências

`151` (tela) e `149` (situação).

## Riscos e Mitigação

- O ambiente de verificação pode não executar o Electron: nesse caso a task fica **aberta** com o que foi testado (sorteio, função pura) e o que falta (janela real).
