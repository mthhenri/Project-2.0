# 270-prompt-da-revisao-do-relatorio-editavel.spec.md

> Origem: pergunta do autor em 2026-10-30 sobre o prompt da revisão por IA do relatório (task 111), que está escrito no código; o autor pediu levá-lo para a tabela de prompts e dar à IA a hora de cada execução.

## Objetivo

O prompt da revisão do relatório passa a ser um tipo de prompt editável em Configurações da IA (como `ALTERAR_TRECHO`), e a IA recebe o início e o fim de cada execução, o que torna possíveis as checagens de sobreposição e de horário que o prompt já pedia.

## Entregáveis

1. Tipo de prompt `REVISAO_RELATORIO` (enum do `shared`, nível PADRÃO em `NIVEL_DO_TIPO_DE_PROMPT`) e migration `0073` com a versão 1 ativa (o texto de papel, critérios e formato JSON, hoje no código).
2. `RelatorioService.revisarRelatorio` lê o prompt ativo pela `PromptService` e o envia como `instrucoes`; a mensagem do usuário leva só os dados (projeto, período, totais e linhas).
3. Cada linha enviada à IA traz início e fim (data e hora no fuso da aplicação; "em andamento" quando não há fim), além da duração.
4. `RelatorioModule` importa o `PromptModule`; o resto do fluxo (200 linhas, parse do JSON, tradução de falhas) não muda.

## Critérios de Aceite

- Testes do service: as instruções vêm do prompt ativo, a mensagem não repete o texto do prompt, as linhas trazem início e fim, e o limite de 200 e o parse seguem como antes. Teste do `shared` para o nível. Suítes e builds verdes.
- **Não verificado ao vivo:** sem chave de provedor nem banco neste ambiente; a migration não foi aplicada em PostgreSQL real.

## Fora de Escopo

- Registrar o custo da revisão na aba Custos (hoje não entra; fica para uma task própria).
- Teste de prompt na tela de Configurações da IA para este tipo (a tela lista os tipos da tabela).

## Dependências

Tasks 110 e 111 (revisão do relatório), 133 e 203 (prompts e provedores), 260 (molde do tipo de prompt `ALTERAR_TRECHO`).
