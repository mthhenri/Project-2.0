# 349-documentacoes-abrir-a-demanda-em-paralelo.spec.md

> Task 21/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-028 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/documentacao.

## Objetivo

Quando há uma demanda guardada da última visita, ela começa a carregar junto com `GET /demanda/documentacao`, não depois.

## Contexto

**A-028 · Baixa · Documentações: ao abrir, `GET /demanda/:id` espera `GET /demanda/documentacao` mesmo quando a demanda guardada já é conhecida**

O id da demanda fica no localStorage, mas `escolhidaId` nasce `null` e só é definido depois da lista; o componente da demanda só é criado depois dela. As duas leituras saem em série.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.ts:41 — `escolhidaId` nasce `null`
- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.ts:62-66 e 76-83 — o id guardado só é lido no `next` da lista
- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.html:25-29 e 50-54 — a área da demanda só renderiza depois da lista
- frontend/src/app/modules/documentacao/components/documentacao-demanda/documentacao-demanda.component.ts:192-195 e 207 — `GET /demanda/:id` no `effect` do `demandaId`

Como observar: Abrir Documentações com uma demanda já escolhida antes: `/demanda/documentacao` termina e só então sai `/demanda/:id`.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `escolhidaId` nasce com o id guardado; se a lista não tiver esse id (demanda excluída ou sem acesso), a tela volta ao "escolha uma" sem toast.
2. Teste de componente dos dois casos.

## Critérios de Aceite

- Ao vivo: as duas requisições saem ao mesmo tempo na abertura.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Convém depois de `346-documentacoes-erros-tratados-pela-tela` (o 404 da demanda precisa ser tratado pela tela).

