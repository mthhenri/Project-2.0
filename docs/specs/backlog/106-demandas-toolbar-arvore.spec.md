# 106 — Demandas: busca/filtros, ações visíveis na árvore e contexto lembrado

**Origem:** Revisão de UI/UX — print `prints/10-demanda-lista.png`, análise `analise-detalhada/demanda-pagina.md`

**Depende de:** 97, 98 (expansão preservada / otimista)

**Entrega:** tela de Demandas com toolbar de busca instantânea + chips de status com contadores + filtro de tags (valendo para Lista **e** Grafo — o `@Input filtroStatus` do grafo já existe e nunca ganhou UI), árvore com clique abrindo o detalhe e ações visíveis no hover, projeto/modo lembrados, e chip de status com popover em todas as linhas.

> **Frontend apenas.**

---

## Escopo

1. **Toolbar**: busca client-side (auto-expande ramos com match e destaca o termo; `/` foca), chips-contador por status (toggle), multiselect de tags, "Expandir tudo/Recolher tudo" (modo Lista).
2. **Linha da árvore**: clique no nome/linha abre o **Detalhe** (consistente com o grafo); chevron é o único alvo de expansão (hitbox 32px); hover revela chip de status clicável (popover de troca rápida — o mesmo do Planejamento), `+` (Nova sub-demanda, estruturais/gestor) e `⋮` (Visualizar, Editar*, Tags*, Membros*, Descrições, Excluir*); botão-direito mantém o mesmo menu como atalho. Mini-barra de progresso `12h/16h` (dados do nó) + `●` executor ativo quando os dados do planejamento estiverem carregados (gestor).
3. **Contexto**: último projeto usado em localStorage + auto-seleção com projeto único; modo de visualização em `?modo=`; modos como `p-selectbutton` de alto contraste; botão "abrir projeto" com ícone `pi-external-link` (desfaz a ambiguidade de "voltar").
4. **Empty states**: sem projeto selecionado (mensagem própria + abrir o dropdown — nunca "Nenhuma demanda encontrada"); projeto sem demandas (CTA Nova Demanda p/ gestor); busca sem resultado (Limpar filtros).
5. Atalhos: `N` nova demanda (gestor), `/` busca, ↑↓→← navegam a árvore, Enter abre o detalhe.

## Critérios de aceite

- Localizar demanda em árvore de 3 níveis: digitar na busca (0 expansões manuais).
- Trocar status na Lista: 2 cliques, sem colapsar a árvore.
- Reabrir /demanda cai no último projeto e modo usados.

## NÃO implementar nesta task

- Grafo (107) e dialogs (108/109).
