# 240-demanda-controle-de-horas.spec.md

> Task 3/4 da guarda-chuva `demanda-tela.spec.md` (reorganização da tela de demandas; origem `IDEAS.md` I-029). Fase 3: a aba Planejamento
> vira **Controle de horas**, em árvore, com a barra nova, quem executa agora e cartões de demandas sem estimativa e paradas.

## Objetivo

Transformar a tabela plana de Planejamento numa visão **em árvore** das horas do projeto: total por pasta, barra que passa dos 100%, quem
está executando agora e dois cartões que apontam o que precisa de atenção (sem estimativa e paradas). Só gestor e administrador.

## Decisões da guarda-chuva (autor, 2026-10-25)

1. **Renomear** para "Controle de horas" (o nome "planejamento" fica para o modo do chat, `chat-planejamento.spec.md`).
2. **Em árvore**, como a Árvore: pastas e sub-pastas (abrem e fecham) com o **total delas**, e as demandas dentro, com o status em bolinha (238).
3. **Barra:** vai até **150%** do estimado, com um **risco nos 100%**, e mantém a cor de hoje (azul até 75%, depois amarelo, laranja e
   vermelho; acima de 100%, vermelho escuro). Ao lado, **quanto passou** ("+3h (150%)") ou **quanto resta**.
4. **Executando agora:** na **cor do tema**, com bolinha, nome e há quanto tempo. No **resumo do topo** (estimado, executado, estouro,
   executando agora), quem executa aparece **só como bolinhas sobrepostas**, com o nome no tooltip (`pTooltip`) e "+N" para o excedente.
5. **Cartões embaixo da árvore:** demandas **sem estimativa** (com campo para estimar ali) e demandas **paradas**.
6. Clicar numa demanda **abre ela na Árvore, com a pasta dela escolhida** (task 239).

## Decisões do agente (padrão proposto; o autor confirma ao abrir a task)

- `?modo=planejamento` e o último modo guardado como `planejamento` **continuam aceitos** e abrem o Controle de horas (links antigos não
  quebram). O novo valor de `ModoVisualizacao` é `controle-de-horas` (ou equivalente em português, a decidir na task); o rótulo do seletor
  é "Controle de horas". O ícone do seletor (`pi-chart-bar`) pode ficar.
- **Paradas:** demanda com estimativa, não concluída nem cancelada, **sem execução há mais de 7 dias** (ou sem nenhuma, criada há mais de 7).
  O prazo de **7 dias** é uma constante no `shared`.
- **Estimar pelo cartão** usa a alteração de demanda de hoje (`PUT /demanda/:id`, `DemandaAlterarDto.horasEstimadas`); só gestor e
  administrador alteram horas, e a tela já é só deles.
- **Quem vê:** `GET /demanda/planejamento` segue `@GestorOnly` (`temPermissaoDeGestor`: gestor e administrador); nada muda na regra.

## Fatos do código (2026-10-25)

- `demanda-planejamento-painel` (219 linhas) recebe `DemandaPlanejamentoDto[]` e mostra uma `p-table` plana: caminho, status (chip com
  popover), estimado × executado, barra limitada a 100% e coloração por faixas (`corParaPercentual` com âncoras RGB), estouro, executores
  ativos e menu de contexto. A página carrega via `GET /demanda/planejamento?projetoId=` (só no modo planejamento e só gestor).
- `DemandaPlanejamentoDto` (`shared/src/dtos/demanda`) traz `demandaId`, `caminho` (texto "Pai › Filho"), `isEstrutural`, `status`,
  `horasEstimadas`, `minutosExecutados` (só atividades diretas, **sem rollup dos filhos**), `temDescricao*` e `executoresAtivos`
  (`ExecutorAtivoDto`: só `usuarioId` e `nomeCompleto`).
- `DemandaRepository.listarPlanejamento` lista só `PENDENTE` e `PLANEJADA` e ordena por caminho. Não há `demandaPaiId`, nem início da execução
  em andamento, nem data da última execução, nem data de criação no DTO.
- A página usa o planejamento também para `executoresPorDemanda` (bolinha de quem executa na Lista, só gestor).

## Dados novos no backend e no `shared`

1. **Hierarquia:** `DemandaPlanejamentoDto` ganha `demandaPaiId` (null na raiz), para montar a árvore sem inferir pelo texto de `caminho`
   (pode haver nomes iguais). O `caminho` continua (busca e tooltips).
2. **Última execução:** `ultimaExecucaoData` (último `fim_data`, ou `inicio_data` se aberta, das execuções das atividades **diretas** da
   demanda; null se nunca executou) e `criadaData` (para "sem nenhuma, criada há mais de 7"). Nomes em português; `_data` por serem datas
   de negócio e `_date` só para as genéricas do `BaseEntity` (`created_date`): conferir a convenção ao nomear.
3. **Quando começou a execução:** `ExecutorAtivoDto` ganha `inicioData` (início da execução aberta), para o "há quanto tempo".
   Mudar esse DTO afeta quem mais o usa: aplicar `npm run impacto` em `ExecutorAtivoDto` antes.
4. **Prazo:** constante `PRAZO_DEMANDA_PARADA_DIAS = 7` e a regra pura `demandaEstaParada(...)` no `shared` (`shared/src/utils`), com teste.
   Quem decide "parada" é o `shared`; o front chama a regra, o backend só entrega as datas (a guarda-chuva diz que o dado "sai do backend").
5. **Teste de integração** do `listarPlanejamento` (já existe em `demanda.repository.integracao.test.ts`) estendido para os campos novos:
   `npm run test:integracao` (banco no ar). Sem migration: tudo sai de colunas existentes.
6. **Concluídas e canceladas:** o endpoint de hoje as exclui. Ver ponto em aberto 1.
7. **Alternativa a avaliar no início da task:** `DemandaGrafoNoDto` (`GET /demanda/grafo`, já carregado pela página) já traz `demandaPaiId`,
   `status` de todas as demandas, `horasEstimadas` e `minutosExecutados`. A árvore e os totais podem sair dele, e o endpoint de planejamento
   ficar só com o que o grafo não tem (executores, última execução, criação). Se for assim, o item 1 acima (`demandaPaiId` no
   planejamento) é dispensado. Padrão proposto: usar o grafo para a hierarquia e os totais.

## Entregáveis

1. **Renomeação** em tela, rótulo, URL aceita e componente: `demanda-planejamento-painel` passa a `demanda-controle-horas-painel` (ou nome
   equivalente); `?modo=planejamento` aceito; mensagens ("Não foi possível carregar o planejamento") e a tela de vazio no novo nome.
2. **Árvore de horas:** pastas e sub-pastas que abrem e fecham, cada uma com o **total** (estimado, executado, percentual e barra) somando
   as demandas dentro, e as demandas com status em bolinha (238). O total da pasta é calculado no front a partir das linhas (o DTO traz só
   horas diretas); a regra de soma (a pasta também tem horas próprias?) é regra pura com teste.
3. **Barra de horas** (componente próprio, `app-demanda-barra-horas`, reutilizado pelo grafo na 241): até 150%, risco nos 100%, as cores
   de hoje (azul até 75%, interpolando amarelo, laranja e vermelho até 100%; acima de 100%, vermelho escuro, saturando em 150%) e o texto
   ao lado "+3h (150%)" ou "faltam 2h". A função de cor (hoje `corParaPercentual`, privada do painel) vira regra pura testada.
4. **Executando agora:** na linha, bolinha na cor do tema com nome e "há quanto tempo" (do `inicioData`). No resumo do topo (estimado,
   executado, estouro, executando agora), os executores como bolinhas sobrepostas com o nome no tooltip e "+N" para o excedente.
5. **Cartão "Sem estimativa":** demandas não concluídas com `horasEstimadas = 0`, cada uma com o campo para estimar ali; ao salvar, grava
   pela alteração de demanda, a demanda sai do cartão e entra na árvore com a barra, sem recarregar a tela toda.
6. **Cartão "Paradas":** demandas pela regra `demandaEstaParada`, com o tempo desde a última execução (ou "nunca executada") e o clique
   levando à demanda na Árvore.
7. **Clique numa demanda** abre a Árvore com a pasta dela escolhida (`?pasta=`) e a demanda aberta (task 239). O menu de contexto
   (botão direito) é mantido nas linhas; "Ver" passa a abrir na Árvore.
8. **Troca de status** pela bolinha (gestor), otimista com rollback, como o Planejamento de hoje (`aoStatusAlterado` na página).
9. **Mesma pasta nas três visões:** o Controle de horas mostra o projeto inteiro, mas realça e rola até a pasta escolhida (`?pasta=`).
   Ver ponto em aberto 2.

## Critérios de Aceite

- Testes: regra pura de cor da barra (faixas e cortes 75, 85, 95, 100, 150), de soma da pasta e `demandaEstaParada` (7 dias exatos, sem
  execução, criada há mais de 7, concluída e cancelada fora) no `shared` ou no front conforme a regra; teste do repository (integração)
  com os campos novos; teste de service (a rota continua só do gestor, `demanda.controller.test.ts` já protege isso); testes de componente
  do painel (árvore abre e fecha, totais, cartões, estimar no cartão, clique abre a Árvore) e da página (`?modo=planejamento` abre o
  Controle de horas; desenvolvedor não vê o modo). `npm test`, `npm run test:integracao`, `npm run test --workspace=frontend` e os builds
  de `backend` e `frontend` passam; falha preexistente relatada à parte.
- Verificação ao vivo (skill `verify`) como gestor e como administrador, e como desenvolvedor para confirmar que o modo não aparece, em
  1920×1080, 1366×768 e 1080×1920, barra lateral aberta e fechada, temas claro e escuro, com projeto que tenha: sem estimativa, parada,
  estouro acima de 100% e acima de 150%, execução em andamento de mais de um usuário, e o projeto vazio e carregando.
- Análogo aprovado: a tela atual de Planejamento (`demanda-planejamento-painel`) para densidade e a Árvore da task 239 para a hierarquia.

## Fora de Escopo

- Mudar a regra de permissão do endpoint, de status ou de horas estimadas; o modo planejamento do chat (`chat-planejamento.spec.md`).
- Mexer na Árvore (239) e no grafo (241), exceto o clique que abre a Árvore.
- Relatórios, exportação e gráficos de volume do projeto (task 197 e 199 já existem em outra tela).

## Dependências

- Task 238 em `done/` (bolinha de status).
- Task 239 em `done/` (pasta na URL e demanda aberta, para o clique).
- `docs/SYSTEM.SPEC.md` §14 (demanda, execução) e `docs/SCHEMA.md` (colunas de `execucao` e `atividade`).

## Riscos e Mitigação

- **Rollup:** `minutosExecutados` não soma os filhos; somar no front exige as linhas de todos os descendentes, inclusive os fora do
  filtro do endpoint (concluídas). Mitigação: decidir o ponto em aberto 1 antes de implementar o total.
- **Execução aberta:** `COALESCE(fim_data, NOW())` é o padrão correto da duração (`execucao` é `timestamptz`); o `inicioData` do executor
  usa a mesma coluna sem converter.

## Pontos em aberto (o autor decide ao abrir a task)

1. **Concluídas na árvore:** o endpoint de hoje lista só `PENDENTE` e `PLANEJADA`. A guarda-chuva pede status em bolinha em toda a árvore
   (inclui a concluída com ✓) e total por pasta. Incluir concluídas muda o endpoint e o total. Padrão proposto: o endpoint passa a trazer
   também as `CONCLUIDA` (as horas já gastas contam no total da pasta), nunca as `CANCELADA`; as paradas e o cartão sem estimativa só olham
   as não concluídas.
2. **Escopo da pasta no Controle de horas:** projeto inteiro com a pasta escolhida realçada (proposto), ou só a pasta escolhida?
3. **Valor de `ModoVisualizacao`** e nome do componente novo.
4. **O total da pasta inclui as horas próprias da estrutural?** Hoje estruturais têm "horas máximas" e atividades próprias.
