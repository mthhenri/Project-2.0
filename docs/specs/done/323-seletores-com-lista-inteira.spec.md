# 323-seletores-com-lista-inteira.spec.md

> Task solta. Origem: `PROBLEMS.md` P-083 (DOSSIE R-05). Decisão do autor (2026-11-11): padronizar em `allRows`.

## Objetivo

Todo seletor que precisa da lista inteira a pede inteira, sem teto de 100/200 que esconda itens em silêncio.

## Entregáveis

1. Inventário (no relatório) de cada chamada com `itensPorPagina=100|200` usada como lista de seleção: usuários (Ponto, Atividades, Demandas), projetos, demandas por projeto, atividades por demanda, execuções por atividade.
2. Cada uma passa a `allRows=true` onde a tela precisa da lista inteira; a rota já aceita o parâmetro (usada por Execuções). Onde a rota não aceitar, o item é listado no relatório e levado ao autor, sem contrato novo.
3. Teste que reproduz o dossiê: 108 usuários ativos, o seletor do Ponto mostra os 108.

## Critérios de Aceite

- Ao vivo com 108 usuários: o último usuário em ordem alfabética aparece no seletor do Ponto.
- Testes e lint do frontend (e do backend, se `allRows` precisar de ajuste) sem erro novo.

## Fora de Escopo

Endpoint de opções enxuto; paginação de tabelas; reduzir o peso de 16 KB.

## Dependências

Nenhuma.

## Fecho

Concluída em 2026-11-11. Seletores de atividade, demanda, projeto e usuário passaram a `allRows: true` (com repasse nos services do frontend de demanda, atividade e execução); `listarExecucoesPorAtividade` (histórico, não seletor) ficou como estava. Ao vivo: o seletor do Ponto traz os 108 usuários numa chamada. Relatório: [`verificacao-320-325.md`](../backlog/auditoria-requisicoes-telas/verificacao-320-325.md). Gates: frontend 2700 testes, backend 1733, shared 342, integração 425, `npm run lint:tudo` sem erro.
