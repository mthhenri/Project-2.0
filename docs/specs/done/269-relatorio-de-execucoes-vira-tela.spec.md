# 269-relatorio-de-execucoes-vira-tela.spec.md

> Origem: `IDEAS.md` I-039 (pedido do autor em 2026-10-29; "bora fazer" em 2026-10-30), parte da redução de dialogs da I-038.

## Objetivo

O relatório de execuções deixa de ser um dialog sobreposto e vira uma tela própria, com a mesma função: escolher projeto e período, ver o resumo e a tabela, revisar com IA e baixar o CSV.

## Entregáveis

1. Página `RelatorioExecucaoPage` (`modules/relatorio/pages/relatorio-execucao/`) no lugar do `RelatorioExecucaoDialogComponent`: mesmos filtros, preview, revisão por IA e CSV; ações no cabeçalho da página, botão de voltar.
2. Duas rotas para a mesma página, ambas só de gestor (`gestorGuard`): `/projeto/:id/relatorio` (projeto fixo, vindo do detalhe do projeto) e `/relatorio` (projeto escolhido na tela, vindo de Execuções).
3. O botão "Relatório" do detalhe do projeto e o de Execuções navegam para a tela; o dialog e o `<app-relatorio-execucao-dialog>` das duas páginas saem.
4. O botão de voltar leva ao projeto (rota do projeto) ou a Execuções (rota `/relatorio`).

## Critérios de Aceite

- Mesmo comportamento do dialog (abre carregado em "Este mês", projeto lembrado só fora do projeto fixo, CSV e IA só com o que está na tela); testes de componente migrados e verdes.
- Verificado ao vivo em 1920×1080, 1366×768 e 1080×1920 (vazio, carregando, cheio, erro, com revisão por IA).

## Fora de Escopo

- Novos filtros, novos formatos de exportação, mudança no backend ou no `RelatorioService`.
- Os demais dialogs do sistema (I-038).

## Dependências

Tasks 110 e 111 (relatório e revisão por IA); `IDEAS.md` I-038.
