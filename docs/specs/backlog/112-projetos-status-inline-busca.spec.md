# 112 — Projetos: status inline no card, busca/filtros e resumo no detalhe

**Origem:** Revisão de UI/UX — prints `prints/19-projeto-listagem.png` e `prints/20-projeto-detalhe.png`, análises `projeto-listagem.md` e `projeto-detalhe.md`

**Depende de:** 97, 98, 99 (undo)

**Entrega:** listagem de Projetos com tag de status clicável no card (menu + PUT otimista), kebab ⋮ com Editar/Excluir, busca instantânea + filtro segmentado com contadores (persistidos na URL); detalhe do projeto com faixa de resumo (contadores por status clicáveis + progresso executado/estimado), indicadores T·C·D nas linhas da árvore e toggle Lista | Grafo | Planejamento.

> **Frontend apenas.** Resumo calculado client-side dos nós já carregados.

---

## Escopo — Listagem

1. Tag de status com caret no card → menu com os 4 status, PUT otimista + toast (a lixeira permanente sai; Excluir vai para o kebab, com undo via task 99).
2. Kebab ⋮ (hover/focus; sempre visível em touch): Editar (abre o dialog na listagem) e Excluir.
3. Toolbar: busca por nome/código (client-side, `/`) + `p-selectButton` Todos/Ativos/Pausados/Concluídos/Cancelados com contadores; estado em queryParams.
4. Dialog criar/editar: swatches de cor em linha + "Outra cor…" colapsado; grupo "Período (opcional)" colapsado na criação; código desabilitado na edição com tooltip (o `ProjetoAlterarDto` não aceita código).
5. Empty states acionáveis (primeiro projeto / limpar filtros); skeleton cards.

## Escopo — Detalhe

6. Cabeçalho: tag de status interativa (gestor); linha de metas com datas + lápis, ou "+ Definir datas" quando nulas (abre Editar focado nas datas).
7. Faixa de resumo: "N demandas" + chips por status (clicáveis = filtro da árvore) + "Executado Xh de Yh" com barra.
8. Toolbar da árvore: busca (`/`), "Expandir tudo" (`E`), toggle de visões navegando para `/demanda?projetoId=` com o modo escolhido.
9. Linhas da árvore: ícones **T·C·D** (`temDescricaoTecnica/Cliente/Documentacao` já vêm no DTO) coloridos quando preenchidos, clique abre o dialog da descrição; mini-barra de progresso; ações `+`/`⋮` no hover (padrão da task 106).

## Critérios de aceite

- Pausar um projeto: 2 cliques na listagem (antes ~6 com navegação).
- Abrir o grafo do projeto: 1 clique no detalhe.
- Auditar quais demandas têm documentação: 0 cliques (varredura visual dos T·C·D).

## NÃO implementar nesta task

- Contagem de uso/estatísticas que o backend não fornece.
