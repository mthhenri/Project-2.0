# 346-documentacoes-erros-tratados-pela-tela.spec.md

> Task 18/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-024 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/documentacao.

## Objetivo

O 409 de `PATCH /demanda/:id/textos` é tratado só pela tela, sem o toast global de erro por cima.

## Contexto

**A-024 · Baixa · Documentações: conflito de versão (409) em `PATCH /demanda/:id/textos` mostra também o toast "Erro interno. Tente novamente."**

`alterarTextos` não marca o erro como tratado pela tela. O interceptor global não tem caso para 409 e cai no `default`, que mostra "Erro interno. Tente novamente."; em seguida o componente mostra o aviso certo ("Outra pessoa gravou este texto…"). Nos outros erros de gravação saem dois toasts (o global e o do componente). `GET /demanda/:id` e `GET /demanda/documentacao` com erro também mostram toast global mais o estado de erro da tela.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/services/demanda.service.ts:92-94 — `alterarTextos` sem contexto de erro tratado
- frontend/src/app/core/interceptors/error-handler.interceptor.ts:18 e 41-42 — só pula com `ERRO_TRATADO_PELA_TELA`; 409 cai no `default` ("Erro interno. Tente novamente.")
- frontend/src/app/modules/documentacao/components/documentacao-demanda/documentacao-demanda.component.ts:334-340 — o componente trata o 409 com aviso e, nos demais erros, acrescenta outro toast
- frontend/src/app/modules/usuario/services/anotacao.service.ts:36 — o pad, para o mesmo caso, usa `comFeedbackProprioEErroTratado()`
- frontend/src/app/modules/demanda/services/demanda.service.ts:78-80 e 87-89 — `recuperar` e `listarParaDocumentacao` sem contexto

Como observar: Abrir a mesma demanda em Documentações em duas abas; gravar numa; na outra, alterar e Gravar: resposta 409, aviso "Outra pessoa gravou…" e, junto, toast vermelho "Erro interno. Tente novamente.".

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `DemandaService.alterarTextos` com `comErroTratadoPelaTela()`; `recuperar` ganha o parâmetro opcional de erro tratado pela tela, usado por Documentações.
2. Teste de componente: o 409 mostra só a mensagem de conflito.

## Critérios de Aceite

- Ao vivo: duas abas na mesma demanda, gravar numa e depois na outra mostra um aviso só.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.
