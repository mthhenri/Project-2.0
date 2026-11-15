# 452-plano-ligar-a-demanda-pede-a-lista-so-ao-abrir.spec.md

> Task 124/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-167 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/chat (plano).

## Objetivo

A lista de demandas do projeto é pedida quando o popover abre e reaproveitada enquanto o projeto do plano for o mesmo. Hoje cada clique, inclusive o que fecha, pede a lista inteira.

## Contexto

**A-167 · Baixa · "Ligar a uma demanda": a lista inteira de demandas do projeto é pedida a cada clique, inclusive no que fecha o popover**

`abrirDemandas()` faz `toggle` do popover e, sem guarda, `demandaService.listar({ projetoId, allRows: true })`: o clique que fecha também dispara a leitura. `abrirProjetos()`, logo acima, tem a guarda `if (this.projetos().length > 0) return`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/components/plano-cabecalho/plano-cabecalho.component.ts:112-114 — `this.popoverDemanda()?.toggle(evento)` seguido direto de `this.demandaService.listar({ projetoId, allRows: true })`
- frontend/src/app/modules/chat/components/plano-cabecalho/plano-cabecalho.component.ts:89-92 — `abrirProjetos` com `if (this.projetos().length > 0) return;` antes de `projetoService.listar({ allRows: true })`
- frontend/src/app/modules/chat/components/plano-cabecalho/plano-cabecalho.component.html:95 — `(click)="abrirDemandas($event)"` no chip da demanda

Como observar: Plano com projeto: clicar no chip "Ligar a uma demanda" para abrir e de novo para fechar: duas leituras da listagem de demandas com projetoId e allRows=true.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. A leitura no `onShow` do popover, com a mesma guarda que `abrirProjetos()` já tem; teste de componente.

## Critérios de Aceite

- Ao vivo: abrir e fechar o popover gera uma leitura.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

