# Task 107 — verificação

Data: 2026-10-16. Frontend apenas.

**Análogo escolhido:** a Lista da própria página (toolbar e chips da task 106) para controles e cartões, e o
popover de status do Planejamento para a legenda.

## O que foi feito

- **Tema:** canvas, grade, arestas, setas, rótulos e nós em tokens (`--app-surface-*`, `--p-primary-500`); a cor
  de cada status virou token (`--p-cyan-500`, `--p-green-500`, `--p-red-400`, `--app-surface-500`) e o
  preenchimento do nó é essa cor diluída sobre `--app-surface-0` (`corPreenchimentoNo`). Fim de `#0d1117`,
  `#b0bec5`, `#4a9eff`, `#6e7681` no grafo e na página.
- **Hover-card** no lugar do `<title>` nativo: nome completo, chip de status, `exec/estimado (Z%)` com barra e tags;
  vira para o outro lado perto das bordas e some ao sair do nó, ao arrastar o fundo ou ao dar zoom. O clique
  abre o detalhe (mantido).
- **Painel lateral de 240 px removido** (+240 px de canvas): a legenda é um popover no botão ⓘ flutuante, com os
  quatro status clicáveis (ligam/desligam o filtro), "Nós" e "Arestas"; zoom `+`, `−` e `⌂` no canto.
- **Filtros** da toolbar/legenda valem para os nós (a página entrega o grafo já filtrado; arestas órfãs somem
  porque o componente só liga nós presentes).

## Decisão que muda a 106

O critério "esconder Concluídas em 1 clique (chip ou legenda)" não fecha com o chip da 106, que *selecionava* o
status a exibir (esconder uma exigia 3 cliques). Os chips passaram a ser **liga/desliga de visibilidade**: todos
ligados por padrão, 1 clique esconde, o desligado fica esmaecido e riscado; legenda e chips usam a mesma função
(`alternarStatusVisivel`) e ficam sincronizados. Não deixa esconder o último status. Para ver só um status são
3 cliques (ou esconder os outros).

## Verificação ao vivo (Chromium, API real; tema claro e escuro)

- Grafo com 9 nós, sem `.demanda-projeto__painel`, canvas 1872 px de largura a 1920; nenhum `<title>` nativo.
- Hover em "Integrador de respostas": cartão "Planejada · 0h 0min/8h (0%) · Backend API"; some ao tirar o mouse.
- Legenda: "Concluída" com 1 clique → 8 nós e chips ligados `Pendente · Planejada · Cancelada`; chip "Concluída" →
  volta a 9; chip "Cancelada" → 8 e a legenda marca "Cancelada" como oculta (sincronia nos dois sentidos).
- Zoom `+` → `scale(1.4)`; `⌂` → `translate(0,0) scale(1)`. Busca "prompt" → 1 nó. Clique no nó abre o detalhe.
- Tema escuro (`app-escuro`): fundo, grade, rótulos, nós, setas e cartão legíveis. Capturas em
  `.artifacts/107-demandas-grafo-tema-filtros/`.
- Viewports 1920×1080, 1366×768 e 1080×1920: sem overflow horizontal, cartão e controles visíveis.

## Limites / pendente

- O componente do grafo agora é `display: block` com altura real; o layout de forças (fora do escopo) continua o
  mesmo e, em canvas baixo como o do notebook (536 px), parte dos nós fica fora da tela — use zoom/`⌂`/arrastar.
- Arrastar o nó e rolar com o cartão aberto: só verificado por leitura (o cartão some no zoom).
- Teclado/leitor de tela no grafo (SVG) não foi tratado nem testado.
- Frontend sem testes automatizados (P-001).
