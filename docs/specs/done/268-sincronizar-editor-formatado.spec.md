# 268 — Sincronizar editor formatado imediatamente

> Correção do P-033 no `app-markdown-editor` e seus consumidores.

## Objetivo

Garantir que o formulário receba o texto formatado antes de uma confirmação imediata.

## Entregáveis

1. Sincronizar alterações reais do documento sem esperar o debounce, preservando o texto original quando não houve alteração.
2. Cobrir digitação e confirmação imediata e os comportamentos de escrita externa, alternância de modo e formatação.
3. Mapear e verificar os consumidores do editor compartilhado.

## Critérios de Aceite

- Teste de componente reproduz o defeito antes da correção e passa depois; testes e build do frontend passam.
- Verificação na aplicação real, inclusive confirmação imediata e consumidores afetados, com tamanhos 1920×1080, 1366×768 e 1080×1920; o editor existente é o análogo visual.
- `npm run repo:verificar` passa.

## Fora de Escopo

Alterar o subconjunto Markdown ou redesenhar o editor.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md` e P-033.
