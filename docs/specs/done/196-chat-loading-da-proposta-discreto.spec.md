# Task 196 — Loading das propostas mais discreto

> Origem: ideia I-012 (anotações do autor, 2026-10-19).

## Objetivo

O estado de carregamento do cartão de proposta deixa de chamar atenção: sem o bloco cinza alto e sem spinners nos botões.

## Entregáveis

1. `proposta-cartao.component.html`: o `p-skeleton` de 5rem dá lugar a uma linha curta e opaca ("Carregando proposta…", fonte pequena, cor mutada,
   altura de uma linha), sem animação forte.
2. Os `[loading]` dos botões Confirmar e Desfazer saem: durante a operação os botões ficam apenas desativados e o cartão fica levemente esmaecido
   (`opacity`), sem spinner.
3. Estilos no `.scss` do cartão, em BEM, sem `style` inline.

## Critérios de Aceite

- Ao abrir o chat com propostas, a linha discreta aparece no lugar do bloco cinza; ao confirmar, o cartão esmaece e os botões desativam.
- Testes de componente atualizados (não há mais `p-skeleton`/spinner; botões desativados em `operando`).
- Verificação ao vivo nos três viewports, nos estados carregando e operando (resposta da API atrasada).

## Fora de Escopo

- O "pensando…" (três pontinhos) e o "consultando" do chat.
