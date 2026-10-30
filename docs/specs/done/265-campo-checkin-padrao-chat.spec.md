# 265 — Campo de mensagem do check-in no padrão do chat

> Origem: pedido do autor de 2026-10-29; parte da barra de mensagem de P-040.

## Objetivo

Usar no check-in o mesmo campo formatado e apresentação do chat com IA.

## Entregáveis

1. Reaproveitar o editor de mensagem do chat, com formatação, aparência e envio pelo teclado equivalentes, inclusive limite de 4.000 caracteres e restauração em caso de falha.
2. Apresentar a mensagem enviada formatada e preservar os estados e regras existentes do check-in.

## Critérios de Aceite

Testes de componente e build do frontend; comparar ao chat em 1920×1080, 1366×768 e 1080×1920, inclusive estados aplicáveis; revisão de impacto e diff; `npm run repo:verificar`.

## Fora de Escopo

Os demais pontos de P-040, P-035, mudanças no editor compartilhado e regras de check-in.

## Dependências

SYSTEM.SPEC.md, CONVENTIONS.md e componentes existentes de chat e check-in.
