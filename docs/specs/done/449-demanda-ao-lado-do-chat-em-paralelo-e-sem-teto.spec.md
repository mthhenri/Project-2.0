# 449-demanda-ao-lado-do-chat-em-paralelo-e-sem-teto.spec.md

> Task 121/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-162 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-05.
> Severidade: Média. Área: frontend/chat.

## Objetivo

O painel de leitura da demanda pede as atividades junto com a demanda e usa `allRows`. Hoje as atividades esperam a demanda responder e vêm com `itensPorPagina: 100`: acima de 100, o checklist, o total de minutos e a contagem ficam errados.

## Contexto

**A-162 · Média · Demanda aberta ao lado do chat: atividades em cascata e com teto fixo de 100**

`DemandaLeituraComponent` só pede as atividades depois que `GET /demanda/:id` responde, embora a segunda chamada use apenas o id que já tinha. A lista vem com `itensPorPagina: 100`, e dela saem o checklist, o total de minutos e a contagem de desenvolvidas: acima de 100 atividades os números ficam errados em silêncio. A decisão vigente é `allRows: true` quando se precisa da lista inteira.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/components/demanda-leitura/demanda-leitura.component.ts:118-123 — `demandaService.recuperar(id)` e, dentro do `next`, `this.carregarAtividades(id)`
- frontend/src/app/modules/chat/components/demanda-leitura/demanda-leitura.component.ts:134 — `atividadeService.listar({ demandaId: id, itensPorPagina: LIMITE_DE_ATIVIDADES })`
- frontend/src/app/modules/chat/components/demanda-leitura/demanda-leitura.component.ts:25 — `const LIMITE_DE_ATIVIDADES = 100;`
- frontend/src/app/modules/chat/components/demanda-leitura/demanda-leitura.component.ts:93-94 — `minutosExecutados` e `desenvolvidas` são calculados sobre `atividades()`

Como observar: /chat em Perguntas, clicar numa demanda de "Minhas demandas": GET /demanda/:id e, só depois da resposta, a listagem de atividades da demanda com itensPorPagina=100.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. As duas leituras em paralelo e `allRows: true` em `demanda-leitura.component.ts` (decisão da task 323); teste de componente.

## Critérios de Aceite

- Ao vivo: abrir uma demanda ao lado do chat mostra `GET /atividade?demandaId=:id&allRows=true` partindo junto com `GET /demanda/:id`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

