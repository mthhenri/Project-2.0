# 368-proposta-ajuste-que-falha-restaura-os-dados.spec.md

> Task 40/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-051 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/proposta-ia.

## Objetivo

Quando o executor recusa um ajuste, a proposta volta a `PENDENTE` com os dados originais. Hoje ela fica pendente com os dados enviados por quem ajustou, mesmo que seja outra pessoa e que a aba seja uma que ela não edita.

## Contexto

**A-051 · Média · Ajuste que falha deixa a proposta pendente com os dados enviados pelo cliente, inclusive em proposta de outra pessoa**

`resolver` grava os `dados` do ajuste ao reivindicar a proposta e, se o executor falha, devolve a `PENDENTE` sem restaurar os dados originais. Em `ALTERAR_TRECHO_PLANO`, quem só acessa o plano passa em `podeResolver` e pode ajustar a proposta de outro: um desenvolvedor manda `aba: DESCRICAO_CLIENTE` com texto seu, leva 403, e a proposta do gestor fica pendente com esse texto, pronta para ele confirmar como se fosse da IA.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:281-287 — `transitar` de PENDENTE para AJUSTADA já com `dados` do cliente
- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:294-300 — a compensação volta a PENDENTE sem passar `dados`
- backend/src/modules/proposta-ia/repositories/proposta-ia.repository.ts:153 — `dados = COALESCE(CAST(:dados AS jsonb), proposta_ia.dados)`: sem dados na volta, ficam os do ajuste
- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:113-115 — `ajustar` usa `obterDoUsuario` (aceita `podeResolver`, linha 325) e passa `dto.dados` inteiros, inclusive `planoId` e `aba`
- backend/src/modules/plano/executores/alterar-trecho-do-plano.executor.ts:72-80 — `podeResolver` só chama `planoService.recuperar`, sem olhar a aba
- backend/src/modules/plano/executores/alterar-trecho-do-plano.executor.ts:83-86 — `lerPlano` lança `UnauthorizedAccessException` (não é `PropostaObsoletaException`, então a proposta volta a PENDENTE)

Como observar: Gestor tem proposta ALTERAR_TRECHO_PLANO pendente (id P) num plano que o desenvolvedor acessa. Como DESENVOLVEDOR: POST /proposta-ia/P/ajustar {"dados":{"planoId":<id>,"aba":"DESCRICAO_CLIENTE","trechoAntigo":"<trecho que existe>","trechoNovo":"<texto do desenvolvedor>"}}. Esperado: 403 e a proposta intacta. O código: 403, mas GET /proposta-ia/P passa a mostrar os dados do desenvolvedor com status PENDENTE. O mesmo vale para o próprio dono: um ajuste que falha troca o conteúdo do cartão.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Em `PropostaIaService`, a compensação regrava os dados originais (ou os dados do ajuste só são persistidos depois de o executor concluir).
2. Em proposta de outra pessoa, o ajuste que troca `planoId` ou `aba` é recusado.
3. Testes: executor falhando preserva os dados; ajuste de terceiro trocando a aba é recusado.

## Critérios de Aceite

- Teste que reproduz o caso do dossiê: desenvolvedor ajusta a proposta do gestor para a aba do cliente, recebe 403, e `GET /proposta-ia/:id` devolve os dados originais.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

