# 289-alca-de-largura-na-demanda-ao-lado.spec.md

> Task solta, pedido do autor logo depois da 288 (2026-10-31): ajustar a largura da lista e da demanda na tela dividida de Atividades, como já se faz no drawer do pad (task 256) e no divisor de Documentações (task 259).

## Objetivo

Na tela de Atividades com a demanda ao lado (288), o autor arrasta a borda entre a lista e a demanda para dar mais espaço a uma ou a outra, e a medida fica guardada.

## Entregáveis

1. Componente compartilhado `app-alca-divisao` (`shared/components/alca-divisao`): uma alça `role="separator"` entre duas colunas lado a lado. Arrastar com o ponteiro ajusta a largura da primeira coluna; as setas ← → ajustam em passos de 16 px; o duplo clique volta ao padrão (496 px). Mostra a linha na cor do tema ao passar o ponteiro, arrastar ou focar, e um tooltip. A largura fica no `localStorage` sob a chave recebida, só ao soltar ou ao usar teclado.
2. A alça escreve `--largura-primeira` na área que a contém (e `--transicao-primeira: none` enquanto arrasta); quem hospeda lê a propriedade na primeira coluna. A lógica pura de limites fica em `alca-divisao.util.ts` (mínimo da primeira coluna, mínimo da segunda de 24rem, vão de 16 px).
3. `atividade-listagem.page`: a alça entra entre a lista e a demanda enquanto a demanda está aberta, com a chave `atividade.divisao.<id do usuário>` e mínimo de 440 px para a lista. A lista encolhida passa a rolar na horizontal se ficar menor que a tabela; a demanda tem largura mínima de 24rem; sem espaço, a lista encolhe sozinha.
4. A largura preferida não se perde com a janela estreita: só o mínimo limita o que foi guardado; o máximo da janela vale ao arrastar e ao usar o teclado.

## Critérios de Aceite

- Testes de lógica (limites, ponteiro, área sem medida) e de componente (padrão, guardada, setas, duplo clique, arrastar sem transição e guardando só ao soltar, ponteiro sem pressionar); a página mostra a alça só com a demanda aberta. Build e `repo:verificar` ok.
- Ao vivo: arrastar a alça muda a largura da lista e da demanda, a medida fica guardada e o duplo clique volta aos 496 px.

## Fora de Escopo

- Trocar o divisor de Documentações ou o drawer do pad por este componente (cada um tem a sua medida: percentual, px à direita).
- Largura da demanda guardada em porcentagem, ou o mesmo ajuste em outras telas.
- Alça por toque (a tela não é verificada em dispositivo móvel).

## Dependências

- 288 (a tela dividida de Atividades). Análogos: `usuario-anotacoes-dialog` (task 256) e o divisor de `documentacao.page` (task 259).
