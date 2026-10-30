# 263 — Ícones de status e descrições de demanda

> Origem: P-042 e pedido do autor de 2026-10-29; complemento da task 262.

## Objetivo

Exibir os desenhos de status das demandas no menu do chat e padronizar os ícones das descrições e da documentação entre as telas que as apresentam.

## Entregáveis

1. Menu de Minhas demandas mostra a marca real e a cor de cada status, mantendo interação e acessibilidade, inclusive perto da borda inferior da tela.
2. Abas e indicadores de Técnica, Cliente e Documentação nas telas de Demandas, Documentações e chat (incluindo plano) usam os três ícones existentes da demanda, alinhados; sinalização de acesso restrito continua visível.

## Critérios de Aceite

Testes de componente pertinentes, suíte e build do frontend, revisão do diff, `npm run repo:verificar` e verificação da aplicação real nos três viewports obrigatórios com relatório das evidências e limites.

## Fora de Escopo

Mudanças nas regras de acesso, na aparência geral dos ícones compartilhados ou em outros conceitos que usem os mesmos glifos.

## Dependências

SYSTEM.SPEC.md, CONVENTIONS.md, P-042 e componentes existentes de status e de descrição.
