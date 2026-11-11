# 324-textos-de-demanda-em-markdown.spec.md

> Task solta. Origem: `PROBLEMS.md` P-078 (relato do autor, 2026-11-11).

## Objetivo

Todo lugar que exibe descrição técnica, descrição do cliente ou documentação de uma demanda mostra o Markdown formatado.

## Entregáveis

1. Mapa de todos os lugares que exibem esses três textos (telas, painéis, popovers, tooltips, cartões do chat, relatório, impressão) e de como cada um renderiza hoje; reproduz o defeito relatado (Atividades) e registra a causa.
2. Cada exibição de texto rico passa por `app-markdown-visualizador` (`docs/CONVENTIONS.md`); sem `innerHTML` nem interpolação de texto bruto.
3. Teste de componente por lugar corrigido.

## Critérios de Aceite

- Ao vivo, em `1920×1080` e `1366×768`, temas claro e escuro: demanda com título, lista, negrito e bloco de código mostrada em cada lugar mapeado, formatada.
- O que ficar fora do visualizador por decisão (por exemplo, tooltip de uma linha) é listado e justificado no fecho.

## Fora de Escopo

Editor de Markdown; mudar o texto armazenado.

## Dependências

Nenhuma.
