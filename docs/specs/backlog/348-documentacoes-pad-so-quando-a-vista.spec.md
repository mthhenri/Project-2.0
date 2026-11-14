# 348-documentacoes-pad-so-quando-a-vista.spec.md

> Task 20/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-027 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/documentacao.

## Objetivo

Com o pad recolhido, abrir Documentações não pede `GET /anotacao`; "Mostrar o pad" carrega na hora.

## Contexto

**A-027 · Baixa · Documentações: o pad é carregado ao abrir a tela mesmo quando está recolhido**

O `effect` do construtor chama `pad.garantirCarregado()` sem olhar `padRecolhido()`, que fica guardado no navegador. Com o pad recolhido, `app-pad-painel` nem é renderizado.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.ts:44 — `padRecolhido` lido do localStorage
- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.ts:52-55 — `garantirCarregado` incondicional
- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.html:73 e 91-103 — o painel só existe com `!padRecolhido()`

Como observar: Recolher o pad em Documentações e recarregar a página: sai `GET /anotacao?usuarioId=…` sem o pad na tela.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. O `effect` de `documentacao.page.ts` lê `padRecolhido()` e só chama `garantirCarregado` com o pad à vista.
2. Teste de componente: recolhido não carrega; ao mostrar, carrega uma vez.

## Critérios de Aceite

- Ao vivo: com o pad recolhido, abrir a tela faz só `GET /demanda/documentacao`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

