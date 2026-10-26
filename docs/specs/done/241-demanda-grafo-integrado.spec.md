# 241-demanda-grafo-integrado.spec.md

> Task 4/4 da guarda-chuva `demanda-tela.spec.md` (reorganização da tela de demandas; origem `IDEAS.md` I-029). Fase 4: o grafo ganha os
> mesmos sinais da Árvore e do Controle de horas. Mexe pouco: o layout de hoje continua.

## Objetivo

Alinhar o grafo às outras duas visões: o nó mostra a marca do status, o cartão do mouse usa a barra do Controle de horas, clicar no nó abre
a demanda **na Árvore** e o grafo **começa focado na pasta escolhida**.

## Decisões da guarda-chuva (autor, 2026-10-25)

1. **Continua o grafo de hoje:** força, círculos, cores, linhas, zoom e legenda que filtra (mexer nisso está fora de escopo).
2. O **nó mostra a marca do status**: ponto no meio (planejada), ✓ (concluída), risco (cancelada); pendente fica vazio.
3. O **cartão do mouse usa a barra do Controle de horas** (task 240).
4. **Clicar no nó abre a demanda na Árvore.** Clicar numa **pasta** (nó de estrutura) **muda o foco** em vez de abrir.
5. O grafo **começa focado na pasta escolhida**: o resto apagado, com **botões para trocar o foco**.

## Decisões do agente (padrão proposto; o autor confirma ao abrir a task)

- **Foco** = a pasta escolhida (`?pasta=`, task 239), mais as demandas dentro dela (diretas e descendentes) e as conexões entre elas; o
  resto fica **apagado** (opacidade baixa, sem clique), não removido, para o contexto continuar visível. O foco é a pasta da página, a mesma
  das outras visões: trocar o foco no grafo troca a pasta na Árvore e no Controle de horas, e vice-versa.
- **Botões para trocar o foco:** "Projeto inteiro" (sem foco), "Pasta acima" (pai do foco) e as sub-pastas do foco como botões na barra de
  controles do grafo. Os rótulos e a posição ficam com a task (padrão: ao lado dos controles de zoom).
- "Sem pasta" (task 239) também é um foco possível.
- A **busca e os filtros** da toolbar seguem valendo no grafo como hoje (`grafoExibido`).

## Fatos do código (2026-10-25)

- `demanda-grafo.component.ts` (284 linhas, d3) recebe `grafo: DemandaGrafoDto`, `statusVisiveis`; emite `demandaSelecionada` (que a página liga a
  `painel.abrirDetalhe`, abrindo o diálogo) e `statusAlternado`. Borda e preenchimento do nó vêm de `COR_NO_BORDA` e `corPreenchimentoNo`.
- O cartão do mouse (`demanda-grafo.component.html`) tem nome, status, uma barra limitada a 100% (`percentual`), tags; a barra e o texto são
  próprios do grafo.
- `DemandaGrafoNoDto` já traz status, horas, minutos, tags, `isEstrutural` e `demandaPaiId`; o foco (descendentes da pasta) sai desses dados,
  sem endpoint novo.

## Entregáveis

1. **Marca do status no nó:** desenho da marca (a mesma do componente de status da 238) dentro do círculo, em SVG do d3, legível no zoom
   mínimo e no máximo e nos temas claro e escuro. A legenda ganha a bolinha nova (238) no lugar da cor.
2. **Cartão do mouse:** troca a barra própria pelo `app-demanda-barra-horas` (task 240) e a bolinha de status; sem alterar posição nem tags.
3. **Clique no nó:** emite a demanda para a página, que muda para a Árvore com a pasta da demanda e a demanda aberta (task 239); clique em
   nó de estrutura troca o foco. Remove o encaminhamento provisório que a 239 deixou (`painel.abrirDetalhe`).
4. **Foco na pasta:** o grafo abre focado na pasta escolhida; nós e arestas fora dela apagados; botões de troca de foco; trocar o foco
   atualiza `?pasta=` na URL. Sem pasta escolhida, projeto inteiro.
5. **Estados:** grafo vazio, foco numa pasta sem filhos, busca que não acha nada dentro do foco (mensagem de "nada neste foco" com atalho
   para "Projeto inteiro").

## Critérios de Aceite

- Testes: regra pura do foco (conjunto de nós e arestas dentro da pasta, "Sem pasta", pasta sem filhos, projeto inteiro) em `*.test.ts`;
  teste do componente do grafo (spec já existe, `demanda-grafo.component.spec.ts`) cobrindo o clique no nó e na pasta, os botões de foco e
  o cartão com a barra nova. `npm run test --workspace=frontend` e `npm run build --workspace=frontend` passam; falha preexistente à parte.
- Verificação ao vivo (skill `verify`) em 1920×1080, 1366×768 e 1080×1920, barra lateral aberta e fechada, temas claro e escuro, com
  projeto grande (muitos nós) para checar o peso e a legibilidade da marca; conferir o clique no nó até a Árvore e o foco trocando nas três
  visões.
- Análogo aprovado: o grafo de hoje (`demanda-grafo`) e a Árvore da task 239. Comparar com o grafo antes: layout, cores e zoom inalterados.

## Fora de Escopo

- Mexer no layout de força, no zoom, na legenda (além da bolinha) ou em cores de aresta; arrastar demanda entre pastas.
- Mudar permissão, status ou hierarquia; criar endpoint.
- A Árvore (239) e o Controle de horas (240) além do que o grafo consome.

## Dependências

- Task 238 em `done/` (marca e bolinha do status).
- Task 239 em `done/` (pasta escolhida na URL e demanda aberta na Árvore).
- Task 240 em `done/` (`app-demanda-barra-horas`).

## Riscos e Mitigação

- **Desempenho do d3** com marca em todo nó e apagado em muitos nós: medir com um projeto grande e, se pesar, desenhar a marca só acima de um
  zoom mínimo.
- **Foco e filtro juntos:** definir a ordem (foco recorta primeiro, filtro depois) e testá-la.

## Pontos em aberto (o autor decide ao abrir a task)

1. Posição e rótulo dos botões de foco.
2. Foco recorta os nós por descendência da pasta (proposto) ou só pelos filhos diretos.
