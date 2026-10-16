# Task 112 — verificação

Data: 2026-10-16. Frontend apenas (cálculos do resumo no cliente).

**Análogo escolhido:** a listagem/detalhe anteriores de Projetos, a toolbar e o chip de status das Demandas (106) e o
formulário de demanda (109) para o padrão "Mais opções" recolhido.

## O que foi feito — Listagem

- **Status inline:** a tag do card virou `app-projeto-status-chip` (caret + popover com os 4 status); a troca é otimista
  (PUT `/projeto/:id`) com toast e rollback. A lixeira permanente saiu: o kebab ⋮ (hover/foco; sempre visível sem hover)
  abre Editar e Excluir (com "Desfazer" da 99).
- **Toolbar:** busca por nome/código (`/` foca; Esc limpa) e `p-selectbutton` Todos/Ativos/Pausados/Concluídos/Cancelados
  com contadores; busca e status vão para `?q=` e `?status=`. Busca e filtro são do cliente: a listagem carrega até 100
  projetos (limite do backend) e a paginação saiu.
- **Dialog criar/editar unificado** (`app-projeto-formulario-dialog`): `abrirEdicao()` (também usado pelo detalhe, que
  perdeu o seu dialog próprio); código desabilitado na edição com tooltip; cores em paleta de uma linha e "Outra cor…"
  recolhido (`app-seletor-cor [compacto]`); "Período (opcional)" recolhido na criação (aberto na edição com datas).
- **Estados vazios:** "Nenhum projeto ainda" com CTA (gestor) e "Nenhum projeto corresponde aos filtros" com Limpar;
  skeleton de cards já existia.

## O que foi feito — Detalhe

- Tag de status interativa no cabeçalho (gestor); datas com lápis ou "+ Definir datas", que abre o Editar já com o foco
  na data de início.
- **Faixa de resumo** calculada dos nós carregados: "N demandas", "Executado Xh de Yh" com barra (vermelha ao estourar)
  e atalhos Lista | Grafo | Planejamento que navegam para `/demanda?projetoId=&modo=`.
- **Toolbar da árvore** (a mesma das Demandas): busca (`/`), chips de status com contadores (1 clique oculta), tags e
  "Expandir tudo" (`E`). Os chips ficam na toolbar logo abaixo da faixa, não dentro dela.
- **Linhas:** T·C·D (técnica, cliente, documentação) coloridos quando preenchidos e clicáveis para abrir a descrição, numa
  coluna alinhada à direita; mini-barra de progresso e `+`/`⋮` no hover já vinham da 106.
- `utils/demanda-arvore.util.ts` passou a ser o único construtor da árvore (a página de Demandas e o detalhe do projeto
  tinham cópias).

## Verificação ao vivo (Chromium, API real; gestor; 6 projetos)

- Listagem: filtros `Todos 6 · Ativos 6 · Pausados 0…`; `/` + "106" deixa 1 card, URL `?q=106` e o recarregamento
  restaura a busca; "Ativos" → `?status=ATIVO`; "zzzz" → empty state com Limpar.
- Pausar um projeto: clique na tag + clique em "Pausado" = 1 `PUT` (2 cliques); contadores atualizam (`Pausados 1`).
- Kebab → Editar: título "Editar Projeto", código `P106` desabilitado com o tooltip, `PUT` ao salvar com Enter. Novo
  Projeto: 15 amostras em linha, sem hex nem período; "Outra cor…" abre o seletor completo; "Período" revela as datas.
- Excluir pelo kebab: 6 → 5 cards e toast "Desfazer"; desfazer volta a 6.
- Detalhe: status "Pausado → Ativo" (1 PUT); resumo "12 demandas · Executado 3h 55min de 60h · 7% · Lista Grafo
  Planejamento"; `E` expande (12 linhas); T·C·D da "Fase 1" `[T vazio, C e D preenchidos]` e todos os T·C·D no mesmo
  x (1714 px); "Definir datas" abre o dialog com foco na data de início e o período aberto; chip "Concluída" oculta
  1 demanda; busca "prompt" abre os ramos com o termo destacado; clicar no T abre "Descrição Técnica"; "Grafo" navega
  para `/demanda?modo=grafo&projetoId=8` com o grafo.
- 1920×1080, 1366×768 e 1080×1920 (listagem e detalhe): sem overflow horizontal. Capturas em
  `.artifacts/112-projetos-status-inline-busca/`.

## Achados da verificação (corrigidos)

- NG0950: o `app-demanda-arvore-painel` lia `raizes` (required) antes da primeira passada de binding quando a toolbar,
  declarada antes dele, perguntava `todosExpandidos()`: o input passou a ter valor padrão `[]`.
- Os T·C·D ficavam desalinhados (a posição dependia de tags e progresso): o chip de status ganhou coluna de largura
  mínima e os T·C·D vêm logo depois dele.

## Impacto em outros consumidores

- `app-demanda-arvore-item` (T·C·D e coluna do chip) também aparece na Lista de Demandas e na lista de sub-demandas do
  detalhe da demanda; `app-seletor-cor` ganhou `[compacto]` (padrão `false`; Tags não muda) — **a página de Tags não
  foi reaberta nesta task**.
- O dialog próprio de edição do detalhe do projeto foi removido (usa o formulário unificado).

## Limites / pendente

- Mais de 100 projetos: só os 100 primeiros aparecem (limite do backend); sem paginação no cliente.
- Contagem de uso/estatísticas fora do escopo (o backend não fornece).
- O "Nome é obrigatório" aparece assim que o campo perde o foco vazio (ex.: ao abrir "Outra cor…").
- Projeto sem datas para o desenvolvedor mostra a linha de metas vazia (sem o "+ Definir datas").
- Frontend sem testes automatizados (P-001).
