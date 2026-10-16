# Task 106 — verificação

Data: 2026-10-16. Frontend apenas (nenhum backend/shared alterado).

**Análogo escolhido:** a tela de Planejamento da própria página de Demandas (chip de status + popover, barra de
progresso, mesmos tokens `--app-*`) e a barra de triagem do Ponto (task 101) para a toolbar.

## O que foi feito

- **Toolbar** (`app-demanda-toolbar`): busca client-side sem acento/maiúscula (o termo é destacado com `<mark>` e os
  ramos com resultado abrem sozinhos), chips-contador por status (toggle), multiselect de tags do projeto,
  "Limpar" e "Expandir/Recolher tudo" (só na Lista). Os mesmos critérios valem para a Lista e para o Grafo.
- **Linha da árvore**: o clique na linha abre o Detalhe; o chevron (alvo de 32 px) é o único gatilho de expansão;
  chip de status clicável com popover de troca rápida (gestor; novo `app-demanda-status-chip`, otimista com
  rollback, sem recarregar nem colapsar a árvore); `+` (Nova sub-demanda, estruturais/gestor) e `⋮` (mesmo menu
  do botão direito) aparecem no hover/foco; mini-barra `exec/estimado` (vermelha ao estourar) e `●` do executor
  ativo quando o planejamento já foi carregado.
- **Contexto**: último projeto e modo em `localStorage`, `?modo=` e `?projetoId=` na URL (URL > lembrado > padrão),
  auto-seleção com projeto único, modos em `p-selectbutton`, botão "Abrir projeto" com `pi-external-link`.
- **Empty states**: sem projeto (com botão que abre o seletor), projeto sem demandas (CTA Nova Demanda p/ gestor) e
  busca sem resultado (Limpar filtros).
- **Atalhos**: `/` busca, `C` nova demanda (gestor), ↑/↓ levam o foco à árvore, ↑↓→← navegam, Enter abre o detalhe.
  Ficam quietos com campo em foco ou dialog/overlay aberto (`core/utils/atalhos.ts`).
- Helper puro `utils/demanda-filtro.util.ts` (filtro, árvore recortada, contadores, destaque).

## Desvios da spec (decisões a confirmar)

- **`N` → `C`.** A spec pede `N` para "nova demanda", mas o `N` global (task 96, topbar) já abre as Anotações; as
  duas ações disparariam juntas. Mantive o `N` global e usei `C` ("criar") na página; o tooltip do botão mostra
  "(C)". Trocar é um `if` em `demanda-projeto.page.ts` (`aoTeclar`).
- **Grafo:** o `@Input filtroStatus` do componente não foi usado; a página entrega ao grafo só os nós que atendem
  ao filtro (status + tags + busca, com 200 ms de atraso porque o layout refaz a cada mudança). Sem ancestrais no
  grafo. O componente do grafo ficou intacto (é a task 107).
- **Executor `●`** só aparece depois que o modo Planejamento foi aberto (os dados vêm do planejamento).

## Verificação ao vivo (Chromium, API real e Postgres; projeto com 3 níveis, tags e 4 status)

- Sem projeto: vazio com "Escolher projeto" (abre o `p-select`); escolher → URL `?modo=lista&projetoId=8`.
- Chips: `Pendente 4 · Planejada 3 · Concluída 1 · Cancelada 1`. `/` foca a busca; "prompt" → "Módulo Integração ›
  Fase 1 › Ajuste de prompt" sem nenhuma expansão manual, termo destacado. "zzz" → "Nenhuma demanda corresponde aos
  filtros" + Limpar. Chip "Pendente" e tag "Backend" filtram como esperado (ancestrais preservados).
- Chevron não abre o detalhe; clicar no nome abre. No hover, `+`/`⋮` ficam visíveis; `⋮` e o botão direito abrem o
  mesmo menu; `+` abre "Nova Demanda" com o pai preenchido.
- Trocar status: 2 cliques ("Integrador de respostas" → Planejada) e a árvore manteve 9 linhas.
- Teclado: ↓ foca a árvore, ↓↓ move, ← sobe ao pai, Enter abre o detalhe, `C` abre Nova Demanda. Expandir/Recolher
  tudo: 9 ↔ 3 linhas.
- Grafo + chip "Concluída": 1 nó. Recarregar e abrir `/demanda` sem query voltam ao projeto e ao modo (grafo).
- Desenvolvedor (projeto único): auto-seleciona o projeto; só os modos Lista e Grafo; sem Nova Demanda, sem chip
  editável, `C` não faz nada.
- Execução ativa do gestor em "Gráfico de horas": `●` na linha após abrir o Planejamento.
- Viewports (o projeto não verifica mobile): 1920×1080, 1366×768 (notebook) e 1080×1920 (desktop vertical) sem
  overflow horizontal, lista e grafo conferidos nos três. Também houve uma passada a 360 px antes de o autor
  dispensar o mobile; os ajustes de quebra que saíram dela ficaram (inofensivos). Capturas em
  `.artifacts/106-demandas-toolbar-arvore/`.

## Achados da verificação (corrigidos)

- O `N` entrava em conflito com o atalho global das Anotações (ver desvio acima).
- O destaque da busca partia a palavra ("Integra ção") por espaço do template; corrigido sem espaços entre os trechos.
- A 360 px o nome da demanda sumia atrás dos badges e o `p-selectbutton` vazava; corrigido com quebra.
- O chip de status "pulava" de coluna entre linhas com e sem `+`; o espaço das ações agora é reservado.

## Impacto em outros consumidores (`npm run impacto`)

`app-demanda-arvore-painel` também é usado no Detalhe do Projeto (ganhou o handler `statusAlterado`; verificado só
por build) e `app-demanda-arvore-item` na lista de sub-demandas do dialog de detalhe: lá o clique na linha passa a
navegar para a sub-demanda (antes expandia, e o chevron já não expandia nada porque `expandidos` não é ligado) e o
chip fica sem edição. **Não verificado ao vivo.**

## Limites / pendente

- Detalhe do Projeto e lista de sub-demandas do dialog: só build, sem navegação real.
- Dispositivo com toque (sem hover) e leitores de tela: não testados; o `@media (hover: none)` mostra as ações sempre.
- O Planejamento continua com seu próprio popover de status (mesmo desenho do novo chip; não foi refatorado).
- Frontend sem testes automatizados (P-001); o helper de filtro foi conferido só com um script `tsx` descartável.
