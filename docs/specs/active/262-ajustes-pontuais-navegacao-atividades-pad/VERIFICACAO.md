# Verificação parcial — task 262

## Implementação e impacto

O frontend relista atividades após mudar status, abre a Árvore em Projeto inteiro, filtra demandas planejadas e pendentes no Controle de horas mantendo os ancestrais, iguala o aviso do planejamento, e usa marcas coloridas no menu de Minhas demandas. O pad apresenta Pessoal, Em andamento, Pendências, Lembretes e Feito, com ícones no menu; bloqueia origem e destino até a resposta ou recarga de conflito terminar. As seções mantêm os nomes existentes no sistema.

Impacto: `npm run impacto` identificou os três locais que exibem `PadPainelComponent` (drawer, chat e Documentações) e os quatro consumidores do serviço (esses três e o painel). A ordenação nova é local ao frontend; o enum e a ordem compartilhada permanecem intactos. `anotacoes.util` também serve ao resumo de propostas e à seção; apenas uma constante foi acrescentada, sem alterar os símbolos anteriores.

## Verificações

- Build do frontend aprovado; avisos de orçamento de bundle/SCSS e dependência CommonJS.
- Suíte do frontend: rodada anterior 185 arquivos e 2.289 testes aprovados; após o ajuste de proteção na recarga, 184 arquivos e 2.288 testes passaram, com timeout de 5 s no teste de desenho do grafo. O arquivo isolado passou 12/12. O teste focado do pad passou 30/30 após a alteração; o de atividades passou 48/48; árvore, controle de horas e Minhas demandas passaram 59/59.
- Aplicação já em execução, sessão do gestor: Árvore iniciou em Projeto inteiro; o filtro retirou a demanda concluída; Controle de horas e pad foram inspecionados em 1920×1080, 1366×768 e 1080×1920. O aviso do planejamento foi observado nos três tamanhos. Análogos: Controle de horas anterior e chat de perguntas. A leitura dos rótulos do pad confirmou a ordem.
- `npm run repo:verificar` e `git diff --check` aprovados. Não há lint no projeto (P-001).

## Pendências para fecho

A inspeção visual ainda não percorreu os estados vazio, carregando e erro de cada tela alterada, nem o menu de Minhas demandas com itens reais (a sessão de gestor estava vazia), nem comprovou a movimentação e o menu do pad ao vivo. Também faltou verificar ao vivo a troca de status da atividade e a Árvore nos três tamanhos. Por isso a task continua em `active/` e os problemas de origem não foram removidos. Nenhuma captura bruta é necessária para entender este relato.
