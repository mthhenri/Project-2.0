# Verificação — task 262

## Implementação e impacto

O frontend relista atividades após mudar status, abre a Árvore em Projeto inteiro, filtra demandas planejadas e pendentes no Controle de horas mantendo os ancestrais, iguala o aviso do planejamento, e usa marcas coloridas no menu de Minhas demandas. O pad apresenta Pessoal, Em andamento, Pendências, Lembretes e Feito, com ícones no menu; bloqueia origem e destino até a resposta ou recarga de conflito terminar. As seções mantêm os nomes existentes no sistema.

Impacto: `npm run impacto` identificou os três locais que exibem `PadPainelComponent` (drawer, chat e Documentações) e os quatro consumidores do serviço (esses três e o painel). A ordenação nova é local ao frontend; o enum e a ordem compartilhada permanecem intactos. `anotacoes.util` também serve ao resumo de propostas e à seção; apenas uma constante foi acrescentada, sem alterar os símbolos anteriores.

## Verificações

- Build do frontend aprovado; avisos de orçamento de bundle/SCSS e dependência CommonJS.
- Suíte do frontend: rodada anterior 185 arquivos e 2.289 testes aprovados; após o ajuste de proteção na recarga, 184 arquivos e 2.288 testes passaram, com timeout de 5 s no teste de desenho do grafo. O arquivo isolado passou 12/12. O teste focado do pad passou 30/30 após a alteração; o de atividades passou 48/48; árvore, controle de horas e Minhas demandas passaram 59/59.
- Aplicação já em execução, sessão do gestor: Árvore iniciou em Projeto inteiro; o filtro retirou a demanda concluída; Controle de horas e pad foram inspecionados em 1920×1080, 1366×768 e 1080×1920. O aviso do planejamento foi observado nos três tamanhos. Análogos: Controle de horas anterior e chat de perguntas. A leitura dos rótulos do pad confirmou a ordem.
- `npm run repo:verificar` e `git diff --check` aprovados. Não há lint no projeto (P-001).

## Verificações complementares e limites

Em 2026-10-30 foram simuladas respostas lentas, vazias e falhas HTTP num intermediário local ligado à aplicação real, sem mudar dados. Em Atividades, a lista mostrou esqueleto durante o carregamento; a falha exibiu aviso temporário seguido da mensagem de lista vazia. Na Árvore, foram observados esqueleto, projeto sem demandas e falha; a falha também pode terminar com mensagem de projeto vazio. Esses comportamentos anteriores foram registrados separadamente em P-058. No pad, o carregamento exibiu esqueleto e a falha avisou que não era possível carregar as anotações. No Controle de horas, a lista apareceu atenuada enquanto os dados de planejamento carregavam; foram observados a falha de planejamento, o projeto sem demandas e o filtro Apenas abertas removendo a demanda concluída. O aviso de planejamento, os tamanhos de tela, a movimentação do pad e a troca de status estão registrados abaixo e na seção anterior.

As verificações de falha usaram simulação de HTTP, não uma interrupção real do servidor. A aplicação existente foi usada sem iniciar outra API; os testes automatizados e o build do frontend passaram na task 265 (2.292 testes, build e 38 testes de check-in). A ausência de lint continua em P-001.

Em 2026-10-29, com o desenvolvedor de teste, a tentativa de abrir o menu do pad sobre uma seleção por teclado não mostrou o menu, e não comprovou o movimento. O texto temporário foi apagado e o pad reaberto vazio. Ao abrir a sessão, o chat gerou automaticamente uma saudação da IA na conversa de teste.

Em nova verificação de 2026-10-29, o menu de seleção do pad exibiu os ícones de Pessoal, Pendências, Lembretes e Feito; uma seleção foi movida de Em andamento para Pessoal, com aviso de sucesso. O texto temporário foi removido e as duas seções estavam vazias após recarga. Em Atividades, a atividade de teste passou de Planejada a Pendente e voltou a Planejada; a linha refletiu as duas alterações sem recarga manual. Ao interromper somente a API de teste e recarregar a listagem, ela apresentou o estado vazio; esse cenário foi reproduzido e registrado como P-058.

Em 2026-10-29, a Árvore foi observada nos três viewports com Projeto inteiro selecionado. Na listagem de Atividades, a atividade de teste foi alterada de Planejada para Desenvolvida e saiu automaticamente do filtro padrão; foi então localizada pelo filtro e restaurada para Planejada.
