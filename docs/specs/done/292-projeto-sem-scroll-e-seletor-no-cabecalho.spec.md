# 292-projeto-sem-scroll-e-seletor-no-cabecalho.spec.md

> Task solta, pedido do autor com uma captura do detalhe do projeto (2026-10-31): a janela rolava um pouco para baixo, e o seletor Demandas / Volume ficaria melhor no cabeçalho.

## Objetivo

O detalhe do projeto cabe na janela sem rolar a página, e o seletor Demandas / Volume sai do corpo e vai para o cabeçalho, abaixo dos botões.

## Entregáveis

1. **Seletor no cabeçalho.** `p-selectbutton` "Demandas | Volume" (só gestor) na coluna da direita do cartão do cabeçalho, **abaixo** de "Nova Demanda", "Relatório" e "Configurar volume". Sai a linha própria que ele ocupava entre o cabeçalho e o corpo.
2. **Sem rolagem da página.** A página ocupa a altura da área de conteúdo (`:host` e `.projeto-detalhe` com `height: 100%`, em coluna): o cabeçalho e a barra de busca têm a altura que têm, e o corpo das demandas (`projeto-detalhe__demandas`) e a Árvore ficam com o que sobra (`flex: 1`, mínimo de 20rem), rolando por dentro. Antes a Árvore tinha altura `clamp(30rem, 100dvh - 22rem, 60rem)`, que não considerava o cabeçalho real. As demandas escondidas (visão Volume) saem do fluxo com `display: none` (classe `--oculto`), sem desmontar.

## Critérios de Aceite

- Testes de componente ajustados (seletor dentro de `.projeto-detalhe__cabecalho-acoes`; demandas escondidas pela classe `--oculto`). Build e `repo:verificar` ok.
- Ao vivo: sem rolagem da área de conteúdo em 1913×917 (a janela do autor), 1920×1080 e 1366×768; o seletor abaixo dos botões.

## Fora de Escopo

- A altura da Árvore na tela de Demandas e das outras telas; a visão Volume (que rola se o gráfico for maior que a janela); janelas menores que 1366×768 (a Árvore tem 20rem de mínimo e a página rola de novo abaixo disso).

## Dependências

- 290 e 291.
