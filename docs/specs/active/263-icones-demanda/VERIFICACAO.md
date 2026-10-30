# Verificação parcial — task 263

## Implementação e impacto

O menu de Minhas demandas usa `DemandaStatusMarcaComponent` para cada status, sem alterar o componente compartilhado. A busca de impacto identificou os demais consumidores na Árvore, no grafo, na toolbar, no chat e em Documentações: não mudaram por esse reaproveitamento. O menu usa classe própria, localizada pelo impacto apenas no template e no estilo global; o estilo global é necessário porque o PrimeNG anexa o menu ao `body`. Em cliques na metade inferior da janela, o submenu abre para cima; `!important` é localizado e necessário para substituir o `top` inline do PrimeNG.

As abas da demanda no chat, do plano e da tela de Documentações e os indicadores no seletor de Documentações usam os mesmos desenhos de técnica, cliente e documentação da Árvore. O cadeado continua presente para o desenvolvedor. Alinhamento dos ícones foi ajustado nos botões de descrição da Árvore, na demanda aberta e no chat, sem alterar os desenhos globais. O símbolo de navegação para Documentações representa a tela, não o campo da demanda, e permanece.

## Verificações

- O menu com uma demanda real exibiu as quatro marcas e cores no navegador; o status atual estava desabilitado. A inspeção mostrou o submenu fora da janela quando aberto perto do rodapé; após o ajuste, as quatro opções ficaram visíveis. O teste de componente cobre o menu, os quatro status e a escolha da direção.
- A demanda no chat, a Árvore e a tela de Documentações foram inspecionadas em 1920×1080, 1366×768 e 1080×1920; a Árvore foi o análogo dos ícones. A sessão disponível era de gestor e não foram alterados dados de demandas.
- Testes focados: menu 14/14; chat, Documentações, seletor, plano e teste do popup de chat anteriormente temporizado passaram 80/80. A suíte completa após o ajuste passou 2.290/2.290. O build passou, com os avisos de orçamento e CommonJS já registrados no projeto.

## Limites para fecho

Em 2026-10-29 o menu foi inspecionado também nos três viewports e o desenvolvedor de teste viu a aba Cliente com ícone, cadeado e aviso de leitura. Permanecem pendentes os estados carregando e erro nas telas alteradas e a conferência visual dos demais consumidores no perfil desenvolvedor. Na tela de Documentações, também foram observados os três ícones e o cadeado do perfil desenvolvedor, com uma demanda real; o estado inicial sem demanda selecionada foi inspecionado. A task permanece em `active/` e P-042 permanece aberto até esses gates. Os testes do frontend cobrem a presença do cadeado, sem substituir a verificação visual. O projeto não tem lint (P-001).
