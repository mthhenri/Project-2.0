# 325-demanda-detalhe-agregado-e-catalogos.spec.md

> Task solta. Origem: `PROBLEMS.md` P-080 (DOSSIE R-02, R-08, R-11, R-12). Decisão do autor (2026-11-11): endpoint de detalhe agregado mais catálogos em memória.

## Objetivo

Abrir `/demanda` e selecionar uma demanda faz poucas requisições, sem refazer o que a tela já tem.

## Entregáveis

1. **Contrato (a confirmar com o autor antes de codar):** `GET /demanda/:id/detalhe` devolve `DemandaDetalheDto` com a demanda, ancestrais, tags, membros e conexões, respeitando a visibilidade atual de cada rota; DTO em `shared/dtos/demanda`, nome pela skill `project20-dto-conventions`; service orquestra, repository só SQL. Arvore, plano e atividades ficam fora do agregado (a decidir no desenho).
2. Frontend: a seleção usa o detalhe agregado; `/tag` e a lista de usuários ficam em memória enquanto a tela está aberta e não são pedidos de novo ao voltar à Árvore, trocar de projeto ou abrir a edição.
3. P-084 (excluir demanda pede a excluída) fica fora desta spec.
4. Testes: backend (service e integração do repository), frontend (reaproveitamento).

## Critérios de Aceite

- Abrir `/demanda` e clicar numa demanda: contagem de requisições medida ao vivo antes e depois, registrada no relatório (meta: abrir < 13, selecionar < 8).
- Permissão preservada: desenvolvedor fora da demanda recebe 403/404; relatório da varredura de leitura do dossiê repetida para a rota nova.
- `npm run test:integracao`, testes, build e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

P-084, P-085, outras telas, mudança de tabela ou migration.

## Dependências

Aprovação do autor do DTO. Skill `gerenciamento-de-impacto` sobre `DemandaService` e DTOs de demanda.
