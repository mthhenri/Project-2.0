# Task 183 — Testes: relatório de execuções

> Task 13/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md). `relatorio.service` (333 linhas) não tem teste.

## Objetivo

Provar a montagem do relatório de execuções (períodos, filtros, permissão, formatos de download) e a revisão por IA, e a
tela do relatório.

## Entregáveis

### Backend

1. **`relatorio.service`** com dublês das services/repositories que consome (execução e projeto, sem repository
   próprio): cada `RelatorioPeriodoTipoEnum` gera o intervalo certo no fuso `APP_TIMEZONE`; desenvolvedor só vê as
   próprias execuções, gestor de todos; filtros por projeto/usuário; totais; cada `RelatorioFormatoEnum` gera o
   conteúdo e o tipo de arquivo esperados; revisão por IA no nível padrão, com falha de IA traduzida por
   `traduzirFalhaDeIa` em `BusinessException`.
2. **Controller:** permissão das rotas e cabeçalhos de download.
3. **IA:** `consultar-relatorio-de-execucoes` já tem 4 testes — só lacuna.

### Frontend

4. **Lógica:** `relatorio.util`, `relatorio.service`.
5. **Componente:** `relatorio-execucao-dialog` (escolha de período e formato, download, revisão por IA com a IA fora do ar).

## Critérios de Aceite

- Linha "Ver execuções de todos" de §14 provada também pelo relatório.
- `npm test` e builds verdes (o domínio não tem repository próprio; integração só se a service tiver SQL indireto relevante,
  justificado no fecho); divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Layout do arquivo gerado além do conteúdo e do tipo.

## Dependências

172, 173, 178. Fontes: `SYSTEM.SPEC.md` §12, §14.
