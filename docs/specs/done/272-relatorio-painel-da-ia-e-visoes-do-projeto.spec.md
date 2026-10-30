# 272-relatorio-painel-da-ia-e-visoes-do-projeto.spec.md

> Origem: o POC de 2026-10-30 (https://claude.ai/artifact/3fC3CgSSbGJAsxCGHLcbr9) e a aprovação do autor ("pode mandar ver") da configuração escolhida nele. Substitui o que a 271 deixou como sugestão.

## Objetivo

Aplicar no sistema o que o autor aprovou no POC: a revisão por IA do relatório vira um painel ao lado da tabela, com largura ajustável e recolhível; Grafo e Controle de horas viram ícones na barra de busca do projeto; e a edição no lugar passa a mostrar um lápis ao passar o mouse.

## Entregáveis

1. **Relatório:** com a revisão pedida, a tabela fica à esquerda e a revisão num painel à direita, separados por um divisor arrastável (como o da tela de Documentações: ponteiro, setas, duplo clique restaura; a largura é guardada neste navegador). Uma seta recolhe o painel numa barra fina com uma caixinha por ponto, com o ícone da IA na cor da prioridade (ALTA vermelho, MÉDIA laranja, BAIXA cinza) e o nome do ponto no tooltip; clicar numa caixinha reabre o painel. Abaixo de 900px o painel fica abaixo da tabela.
2. **Projeto:** os botões Grafo e Controle de horas (este só para gestor) saem do cabeçalho e viram ícones, com tooltip, no fim da barra de busca de demandas (`DemandaToolbarComponent` ganha um espaço projetado `slotVisoes`).
3. **Lápis:** `ProjetoCampoEditavelComponent` mostra um lápis ao lado do campo ao passar o mouse ou focar (clicar nele abre a edição, como "Editar" do botão direito), e os horários editáveis de Execuções mostram o lápis ao passar o mouse.
4. O **Controle de horas já traz o executado × estimado** (Estimado, Executado e Estouro no resumo do topo); nada muda ali.

## Critérios de Aceite

- Testes: painel recolhido com uma caixinha por achado, cor e tooltip por severidade, reabertura; divisor por teclado e restauração; ícones de visão na barra do projeto (Controle de horas só para gestor); lápis do campo editável abrindo a edição. Suíte e build verdes.
- Verificado ao vivo em 1920×1080, 1366×768 e 1080×1920.

## Fora de Escopo

- Ligar o achado da IA a uma linha da tabela (o achado traz só uma referência em texto, sem id de execução).
- O lápis no toque (sem hover) e novas edições no lugar.

## Dependências

Tasks 269 (relatório como tela), 270 (prompt da revisão), 271 (edição no lugar) e 259 (divisor da tela de Documentações).
