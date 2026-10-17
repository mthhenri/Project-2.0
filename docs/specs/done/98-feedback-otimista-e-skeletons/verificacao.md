# Task 98 — verificação

Data: 2026-10-16. Frontend apenas.

## O que foi feito

- **Componentes compartilhados**: `app-skeleton-lista` (variantes `tabela`, `cartoes`, `linhas`; `role="status"`),
  `app-barra-recarga` (barra fina indeterminada) e as classes globais `.conteudo-recarregando` (opacidade 0,55 e sem
  cliques) e `.lista-recarga` (`position: relative`) em `styles.scss`.
- **Overlay global**: o `loadingInterceptor` ganhou `SEM_OVERLAY_GLOBAL` / `comFeedbackProprio()`. As leituras de
  tela que têm feedback próprio não acionam mais o scrim global: `listar` de atividade, projeto, usuário, tag,
  calendário e execução; `consultarMensal`/`consultarTodos`/`consultarDiario` do ponto; `recuperarGrafo`.
  Escrita e as demais leituras continuam com o overlay.
- **Primeira carga = esqueleto; recarga = conteúdo anterior esmaecido + barra**: Atividades, Usuários, Execuções
  (tabelas), Tags e Projetos (cartões), Calendário (tabela do mês), Ponto (cartões + linhas), Demandas (lista) e
  detalhe do projeto (linhas). O `p-table [loading]` das três tabelas lazy saiu.
- **Atividades**: troca de status é otimista (a `p-tag` muda na hora; erro reverte); excluir remove a linha na hora
  (erro devolve linha e total); `dataKey` + `rowTrackBy` por id mantêm o DOM das linhas. Criar, iniciar/encerrar e
  registrar execução **continuam refazendo a listagem** (o DTO retornado não traz projeto, demanda, tags nem tempo
  acumulado), mas agora como recarga silenciosa: conteúdo esmaecido e barra, sem spinner de página.
- **Demandas**: status trocado no Planejamento é otimista com rollback e atualiza grafo e planejamento sem consulta
  (Concluída sai do planejamento); salvar tags atualiza o nó sem recarregar o grafo (lista de demandas e detalhe
  do projeto); a **expansão da árvore** passou para um signal de IDs no painel (`expandidos`), sobrevivendo a
  qualquer recarga. Criação/edição/exclusão seguem recarregando o grafo (silenciosamente).
- **Projetos**: editar aplica o `ProjetoAlteradoDto` retornado, sem GET; excluir remove o card na hora (erro devolve).
- **Tags**: criar/editar/excluir atualizam a lista com o DTO retornado (ordem por nome preservada), sem refetch.
- **Ponto**: esqueleto na primeira carga de cada modo; troca de mês/usuário, `visibilitychange` e salvar
  justificativa mantêm o conteúdo esmaecido até a resposta.

## Verificado ao vivo (Chromium, API + Postgres reais)

- Tags com resposta atrasada: esqueleto visível, overlay global ausente; criar tag emite só `POST /tag`.
- Atividades: com o PUT atrasado 1,2 s, a tag da linha mudou em ≤150 ms, a linha manteve o mesmo elemento DOM e só
  houve `PUT /atividade/1`; com o PUT respondendo 500, a tag foi otimista (Pendente) e voltou ao status anterior.
- Demandas: expandir pai, salvar tags da filha → somente `PUT /demanda/5/tag`; filha continuou visível e mostrou a tag.
- Ponto: esqueleto na primeira carga; ao trocar o mês o conteúdo anterior (31 dias) ficou esmaecido com a barra e
  sem esqueleto nem overlay; `visibilitychange` manteve os dias; ao responder, a classe de esmaecimento saiu.
- Projeto: editar → só `PUT /projeto/3` e cabeçalho já com o novo nome; excluir com DELETE falhando → card some
  em 200 ms e volta após o 500.
- Esqueletos (resposta atrasada) em Usuários, Calendário, Execuções e Projetos, sem overlay global.
Evidências em `.artifacts/98-feedback-otimista-e-skeletons/` (não versionadas).

## Limites / pendente

- Não percorrido ao vivo: troca de status no painel Planejamento (rollback incluído) e a árvore do detalhe do
  projeto após salvar tags — cobertas pelo mesmo código e build; o Planejamento só lista demandas não concluídas.
- Criar/registrar/iniciar/encerrar execução na listagem de Atividades refazem a listagem (recarga silenciosa),
  não atualizam localmente: o DTO retornado não basta para montar a linha.
- Skeleton do Ponto no modo "todos" tem 6 cartões genéricos; não replica a altura exata do cartão real.
- Execuções e Calendário: criar/alterar/excluir seguem por refetch silencioso, não por DTO local.
- Viewport 360×800 não reinspecionado nesta task (o esqueleto usa grade `auto-fill` e largura 100%).
- Frontend sem testes automatizados (P-001); topbar a 360 px é anterior (P-002).
- Build do frontend passa (avisos de budget pré-existentes).
