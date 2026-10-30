# 267 — Ações acessíveis na tabela de Atividades

> Correção do P-026.

## Objetivo

Manter as ações das atividades acessíveis quando a tabela excede a largura disponível.

## Entregáveis

1. Manter a rolagem horizontal dentro da tabela e a coluna de ações visível à direita.
2. Preservar interações e aparência dos estados e perfis existentes.

## Critérios de Aceite

- Verificação real em 1920×1080, 1366×768 e 1080×1920, com barra lateral expandida e recolhida, inclusive ações e rolagem; usar a tela de Execuções como análogo de tabela existente.
- Testes e build do frontend e `npm run repo:verificar`.

## Fora de Escopo

Redesenhar a tela ou outras tabelas.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md` e P-026.
