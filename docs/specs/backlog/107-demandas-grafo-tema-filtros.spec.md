# 107 — Demandas grafo: tokens de tema, hover-card e legenda-filtro

**Origem:** Revisão de UI/UX — print `prints/11-demanda-grafo.png`, análise `analise-detalhada/demanda-pagina.md`

**Depende de:** 106 (toolbar de filtros)

**Entrega:** grafo integrado ao tema (fim das cores dark hardcoded `#0d1117`/`#b0bec5`/`#4a9eff` → tokens `--app-surface-*`/`--p-primary-*`), com hover-card estilizado no lugar do tooltip nativo, legenda como popover cujos itens de status **filtram** o grafo, e filtros da toolbar aplicados aos nós.

> **Frontend apenas.**

---

## Escopo

1. Tokens de tema no canvas, nós, arestas e rótulos (claro/escuro).
2. Hover no nó → card flutuante: nome completo, chip de status, `Xh/Yh (Z%)` com barra, tags; clique abre o detalhe (mantido).
3. Painel lateral fixo de 240px removido; legenda vira popover no botão `ⓘ` flutuante — cada status da legenda é clicável (liga/desliga o filtro; sincronizado com os chips da toolbar). Zoom `+/−/⌂` no canto.
4. Filtros de status/tags/busca da toolbar escondem nós fora do filtro (e arestas órfãs).

## Critérios de aceite

- Grafo legível no tema claro e escuro; +240px de canvas útil.
- Esconder "Concluídas": 1 clique (chip ou legenda).

## NÃO implementar nesta task

- Reposicionamento/força do layout do grafo; edição inline no nó.
