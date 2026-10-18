# Task 153 — Chat do gestor: ferramentas de leitura de projetos, demandas e equipe

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 9. Fluxo do gestor, itens "Equipe pelo chat" e contexto do projeto.

## Objetivo

Dar ao gestor as ferramentas de **leitura** para a IA responder "o que a equipe fez hoje?", "quem está parado na demanda X?" e conhecer projetos, demandas e o grafo.

## Entregáveis

1. Ferramentas `LEITURA` com permissão `GESTOR`: `listar_projetos`, `consultar_demanda` (descrições, atividades e tags), `consultar_grafo_do_projeto` (demandas e conexões, resumido), `listar_execucoes_da_equipe_no_dia` e `listar_atividades_paradas` (por demanda ou pessoa), sempre pelas mesmas services e filtros de acesso de hoje (gestor com acesso total por tipo, não por `demanda_usuario`).
2. Limite e resumo do que cada ferramenta devolve; desenvolvedor nunca enxerga estas ferramentas (o registro as filtra pelo tipo).
3. Atualização do prompt `CONVERSA` com as ferramentas e com a regra de privacidade (a IA só descreve a equipe para quem é gestor).
4. Testes: filtro por permissão, limite e dono dos dados.

## Critérios de Aceite

- Na aplicação real, um gestor pergunta "o que a equipe fez hoje?" e recebe as execuções do dia por pessoa; um desenvolvedor perguntando o mesmo não tem as ferramentas e a IA diz que não pode.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Qualquer escrita (154 a 156) e relatórios novos.

## Dependências

`137`, `138`/`139` e `144` (padrão das ferramentas).
