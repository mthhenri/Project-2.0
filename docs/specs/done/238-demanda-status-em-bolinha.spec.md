# 238-demanda-status-em-bolinha.spec.md

> Task 1/4 da guarda-chuva `demanda-tela.spec.md` (reorganização da tela de demandas; origem `IDEAS.md` I-029). Fase 1: o status vira uma
> bolinha única e as três descrições ganham ícones novos, ainda na tela atual. Pequena e independente das demais.

## Objetivo

Trocar o status em texto (`p-tag` do `demanda-status-chip`) por um **componente de status em bolinha**, usado em todas as telas de demanda,
e trocar os ícones das descrições técnica e documentação, mantendo as cores e o brilho de hoje. A cor da **planejada** passa a ser uma só.

## Decisões da guarda-chuva (autor, 2026-10-25)

- Status em bolinha, o mesmo círculo visto de jeitos diferentes: **pendente** vazio; **planejada** com **um ponto no meio** ("está no jogo,
  pode ser executada", não "agendada"); **concluída** cheia com ✓; **cancelada** com um risco. O nome do status vai no tooltip (`pTooltip`).
- Ícones das descrições: **técnica** terminal, **cliente** pessoa (o de hoje, `pi-user`), **documentação** folha com texto. Cores e brilho de
  hoje: `--app-icone-tecnica`, `--app-icone-cliente`, `--app-icone-doc` (brilho quando preenchida, cinza apagado quando vazia).
- **Uma cor só para a planejada em todas as telas**, numa constante única lida pela Árvore, pelo Controle de horas, pelo grafo e pelos filtros.

## Entregáveis

1. **Componente de status** (`app-demanda-status`, em `frontend/src/app/modules/demanda/components/`; substitui o `demanda-status-chip`):
   entrada `status`, `tamanho` opcional, tooltip com o nome. Os quatro desenhos acima, em CSS/SVG, sem biblioteca nova, legíveis nos temas
   claro e escuro. A marca de cada status (ponto, ✓, risco) é a mesma que o grafo vai usar na task 241, então fica reutilizável.
2. **Modo editável** (hoje `editavel` do chip, só gestor): a bolinha abre o mesmo popover de troca rápida (Pendente, Planejada, Concluída,
   Cancelada, cada uma com a bolinha e o nome) e emite o status escolhido; a persistência segue de quem hospeda (otimista, com rollback).
3. **Rótulos e cores de status numa fonte só.** Hoje `ROTULO` e `SEVERIDADE` estão no chip, o mapa de rótulos se repete em
   `demanda-planejamento-painel.component.ts` (`severidadeStatus`, `rotuloStatus`, `statusOpcoes`) e as cores vivem em
   `constants/demanda-cores.constants.ts` (`COR_NO_BORDA`, `corPreenchimentoNo`). O rótulo e a cor de cada status ficam em
   `demanda-cores.constants.ts` (ou arquivo vizinho de constantes) e quem usava as cópias passa a ler daí.
4. **Cor da planejada (decisão visual da task).** Hoje há duas: ciano (`--p-cyan-500`) em `COR_NO_BORDA` (borda do nó do grafo, chips da
   toolbar, legenda) e `info` do `p-tag` no chip (Árvore, detalhe, cartão do grafo, Planejamento). A task põe as duas opções lado a lado na
   tela real (claro e escuro), **escolhe a mais bonita** e a aplica em `COR_NO_BORDA`, que passa a ser a única fonte; o registro da escolha
   (qual e por quê) vai no fecho. **Padrão proposto: o autor confirma ao abrir a task.**
5. **Aplicar na tela atual**, trocando o chip de texto pela bolinha: `demanda-arvore-item` (coluna de status), `demanda-detalhe-dialog`
   (cabeçalho), `demanda-grafo` (cartão do mouse e legenda), `demanda-planejamento-painel` (coluna de status e o seletor rápido) e
   `demanda-toolbar` (chips de filtro por status, que hoje usam `COR_NO_BORDA`). Os chips da toolbar e a legenda do grafo mostram a bolinha
   nova no lugar do ponto de cor.
6. **Ícones das descrições:** terminal para a técnica e folha com texto para a documentação, no `demanda-arvore-item` (`descricoes`),
   no `demanda-detalhe-dialog` (`descricoes`), no menu de contexto (`utils/demanda-context-menu.factory.ts`) e no
   `atividade-documentos-indicador` (módulo `atividade`). O PrimeIcons não tem terminal nem folha com texto: o ícone vem de SVG próprio
   (ou fonte de ícones já usada no projeto), num componente/diretiva de ícone de descrição que recebe o tipo (`tecnica`, `cliente`, `doc`)
   e o estado (preenchida ou vazia). **Ponto em aberto:** o desenho exato dos ícones fica nos conjuntos sugeridos no canvas
   (`demanda-tela/referencias.md`); o autor escolhe o conjunto ao abrir a task.
7. **Remover o que ficou sem uso:** `demanda-status-chip` (componente, html, scss e spec), as cópias de rótulo e severidade, e os estilos
   `p-tag` de status dessas telas.

## Gerenciamento de impacto (obrigatório)

Rodar `npm run impacto -- <arquivo>` e avaliar cada consumidor **antes** de editar, para `demanda-status-chip.component.ts`,
`demanda-cores.constants.ts` e os ícones das descrições. Pelo levantamento de 2026-10-25:

- `demanda-status-chip`: `demanda-arvore-item`, `demanda-detalhe-dialog`, `demanda-grafo` (todos dentro de `modules/demanda`), mais os
  specs `demanda-componentes-pequenos.spec.ts` e `demanda-arvore-e-planejamento.spec.ts`.
- `COR_NO_BORDA` e `corPreenchimentoNo`: `demanda-grafo` (borda e preenchimento do nó, legenda) e `demanda-toolbar` (chips).
- `--app-icone-*` e os ícones de descrição **fora da tela de demandas:** `atividade-documentos-indicador` (módulo `atividade`, usado nas
  telas de atividade) e `demanda-context-menu.factory.ts` (menu de contexto da Árvore e do Planejamento). Mudar o ícone muda também lá, e
  isso é o que se quer (um ícone por descrição em todo o sistema); o fecho lista cada tela de atividade que mostra o indicador e a
  confere. Qualquer mudança além do pedido vai ao autor antes de aplicar.

## Critérios de Aceite

- Testes: componente de status (os quatro desenhos, tooltip com o nome, popover só quando editável, emite o status escolhido) e da
  constante única (a cor da planejada é a mesma em todos os leitores). Ajustar os specs existentes que citam o chip. `npm run test --workspace=frontend`
  e `npm run build --workspace=frontend` passam; relatar à parte qualquer falha preexistente.
- Busca por `demanda-status-chip`, `severidadeStatus`, `rotuloStatus` e `pi-code`/`pi-book` nas descrições não acha mais nada no código.
- Verificação ao vivo (skill `verify`) em 1920×1080, 1366×768 e 1080×1920, temas claro e escuro, com um projeto que tenha as quatro
  situações de status e descrições preenchidas e vazias: Lista, detalhe, grafo (cartão e legenda), Planejamento, toolbar, menu de contexto
  e a tela de atividades com o indicador. O gestor troca o status pela bolinha (popover); o desenvolvedor vê a bolinha sem editar.
- Análogo aprovado: a tela atual de demandas (`modules/demanda/pages/demanda-projeto`); a comparação antes e depois cobre densidade da linha
  da Árvore, alinhamento da coluna de status e brilho dos ícones.

## Fora de Escopo

- Mudar a estrutura da Árvore, o grafo, o Planejamento ou o detalhe (tasks 239 a 241); a marca do status **dentro do nó** do grafo é da 241.
- Mudar regra de status, de permissão ou de quem altera o status; o nome do status e seus valores de enum.
- Renomear "Planejamento" para "Controle de horas" (task 240) ou "Lista" para "Árvore" (task 239).

## Dependências

Nenhuma. É a primeira da guarda-chuva e as tasks 239, 240 e 241 dependem dela.
