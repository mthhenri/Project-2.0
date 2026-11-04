# demanda-atividades-e-conexoes.spec.md

> Guarda-chuva (origem: conversa com o autor em 2026-11-03, a partir das abas Atividades e Conexões da demanda aberta na Árvore, task 239). Redesenho
> visual das duas abas, mais dinâmico. Tasks: [304](304-demanda-aba-atividades-consumo.spec.md) e [305](305-demanda-aba-conexoes-recorte-do-grafo.spec.md).

## Objetivo

As abas **Atividades** e **Conexões** da terceira coluna da Árvore são hoje listas de texto. Passam a mostrar a informação de forma visual:
Atividades com o consumo de horas de cada uma e o que está em execução agora; Conexões como um **recorte do grafo** da demanda, com o tipo da
conexão escrito ao longo de cada linha.

## Decisões do autor (2026-11-03)

1. **Atividades:** cartões mais ricos. Atividade **não tem horas esperadas**; a barra de cada uma só faz sentido como a **fatia que ela consumiu
   das horas da demanda**.
2. **Conexões:** recorte do grafo com as linhas ligando as demandas e, **paralelo à linha, o texto do tipo da conexão**. O tipo é o que existe hoje
   (só a direção: depende de, depende desta, mútua); **não há tipo novo no banco**.
3. **Sem paginação do grafo:** nada de "+N mais". Mostra todas as conexões; a lista abaixo do desenho segue como alternativa de leitura.
4. **O grafo das conexões é visualmente igual ao grafo do projeto** (mesmos nós, cores, marca de status, cartão no hover, linhas), não uma imitação.
5. O sentido da seta segue o modelo do banco: a linha sai de quem **depende** (`demanda_origem_id`) e aponta para de quem se depende
   (`demanda_destino_id`).

## Referência visual

`demanda-atividades-e-conexoes/mockup.html` (mockup navegável, com tema claro e escuro). **Vale para o layout das Atividades e para a ideia das
Conexões**; o grafo do mockup é desenhado à mão e **não** é a referência de aparência: a das conexões é o `demanda-grafo` real. O "+N mais" do
mockup está descartado (decisão 3).

## Análogo aprovado (regra de UI do `CLAUDE.md`)

A própria demanda aberta da Árvore (task 239) e o `demanda-grafo` (tasks 107 e 241). Verificação ao vivo nos cinco formatos de desktop, temas
claro e escuro, estados vazio, carregando, cheio e erro, em cada task.
