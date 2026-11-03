# 305-demanda-aba-conexoes-recorte-do-grafo.spec.md

> Task 2/2 da guarda-chuva [`demanda-atividades-e-conexoes.spec.md`](demanda-atividades-e-conexoes.spec.md). Referência da ideia:
> `demanda-atividades-e-conexoes/mockup.html` (o desenho do grafo lá **não** é a referência de aparência).

## Objetivo

A aba Conexões da demanda aberta (`demanda-conexao-lista`) mostra um **recorte do grafo**: a demanda e as que ela conecta, ligadas por linhas com
o texto do tipo da conexão ao longo de cada uma. O desenho é o **mesmo do grafo do projeto**, reaproveitando o `demanda-grafo`.

## Decisões

1. **Mesmo componente, mesma aparência.** O `demanda-grafo` ganha um modo de recorte; nós, cores por status, marca do status, cartão no hover,
   traço das conexões (tracejado) e tema vêm do que já existe. Nada de desenho paralelo.
2. **Recorte** = a demanda aberta (destacada) + as demandas ligadas a ela por `DemandaConexao`, e as arestas de conexão entre eles. **Todas**, sem
   paginação. Hierarquia (pai e filhas) fica de fora: aqui só se vê conexão.
3. **Texto ao longo de cada linha**, do que existe hoje: "depende de" (saída), "depende desta" (entrada) e "mútua" (bidirecional). **Sem tipo novo
   no banco.**
4. **Seta:** da demanda que depende (`demanda_origem_id`) para aquela de que se depende; a mútua tem seta nas duas pontas. O grafo do projeto hoje
   só põe seta na hierarquia: a seta e o texto nas conexões valem **só no modo recorte**, a não ser que o autor queira no grafo grande também.
5. **Aviso** quando uma demanda ligada está **cancelada** (linha laranja tracejada e faixa de aviso com os nomes), como no mockup.
6. **Interação:** clique no nó abre aquela demanda (`demandaAbrir`, como hoje); passar o mouse mostra o cartão do grafo; gestor, administrador e
   auxiliar (`podeEditarDemanda`) veem o × de remover no nó, com a confirmação que a lista já usa.
7. **Criar conexão** sai do formulário sempre aberto e vai para **"+ Conectar"**, que abre uma linha com busca da demanda de destino e a direção em
   três botões ("Esta depende dela", "Ela depende desta", "Mútua"), com uma frase de prévia. As regras (sem ciclo por CTE, sem repetida) seguem
   no backend, sem mudança.
8. **Lista abaixo do desenho** ("Ver as N conexões em lista", recolhida): mesma informação para teclado e leitor de tela.
9. **Vazio:** estado com a explicação e "+ Conectar". **Carregando e erro** com o padrão da demanda aberta.

## Fatos do código (2026-11-03)

- `demanda-grafo` recebe `DemandaGrafoDto` (`nos` e `arestas`; aresta com `origemId`, `destinoId`, `tipo` hierarquia|conexao, `bidirecional`),
  roda uma simulação d3 e hoje **sempre mostra o projeto todo** (sem foco). Tem zoom, legenda em popover e filtro por status.
- A Árvore já carrega `GET /demanda/grafo` do projeto; o recorte se monta **no front, desse mesmo dado**, sem endpoint novo (mesmo princípio da
  task 239). `DemandaConexaoResumoDto` não tem status nem horas, por isso o recorte sai do grafo, não da lista de conexões.
- A direção: `DemandaConexaoResumoDto.direcao` é `saida` quando a demanda é a origem, `entrada` quando é o destino.
- O destino de uma conexão é escolhido entre as demandas do **mesmo projeto**; o recorte não cruza projetos.

## Pontos em aberto

- **Layout do recorte:** a simulação por força basta para poucos nós? Padrão proposto: fixar a demanda no centro e deixar a simulação arrumar o
  resto, com altura da aba definida por CSS e zoom desligado (só enquadrar). Se ficar bagunçado, trocar por colunas fixas (depende de à esquerda,
  depende desta à direita, mútuas embaixo), sem perder a aparência dos nós.
- **Zoom e legenda no recorte:** padrão proposto é sem zoom e sem popover de legenda (a legenda de status cabe numa linha). Confirmar ao ver.
- **Rótulo do texto:** o texto na linha lê bem em linha quase horizontal e mal em linha inclinada; resolver no desenho (trecho horizontal junto ao
  nó, como no mockup) ou colocar o texto num fundo sobre a linha.

## Verificação

Testes: função pura que monta o recorte e a direção a partir do grafo (sem conexões, só entrada, só saída, mútua, cancelada, conexão com demanda
de outro projeto ignorada); teste de componente (estados, remover, abrir, "+ Conectar"). `lint:tudo`. Skill `verify` com o grafo **ao lado do grafo
do projeto**, comparando nós, cores e traço, nos cinco formatos e dois temas.
