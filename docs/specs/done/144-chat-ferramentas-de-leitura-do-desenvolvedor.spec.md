# Task 144 — Chat: ferramentas de leitura do desenvolvedor

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 6. Fluxo do desenvolvedor, itens 4 ("O que eu tenho pra fazer?") e 5; "A IA é só mais um cliente da API".

## Objetivo

Dar à IA as ferramentas de **leitura** do dia do desenvolvedor, chamando as mesmas services das telas com o usuário do token, para ela responder "o que eu tenho pra fazer?" e saber o que está em execução.

## Entregáveis

1. Ferramentas de leitura registradas por `FerramentaIaRegistro` (`FerramentaIa` com `tipo` `LEITURA`, entrada validada por class-validator, esquema gerado da classe): `listar_minhas_atividades` (ordenadas por prioridade, com demanda e projeto, só as do usuário, sem concluídas por padrão), `consultar_execucao_ativa` (atividade, descrição provisória, `inicio_data` e duração até agora) e `listar_minhas_execucoes_do_dia`.
2. Cada ferramenta limita o tamanho do que devolve (máximo de itens e campos resumidos, com aviso "há mais") e nunca lança: erro volta ao modelo como texto.
3. Atualizar o prompt `CONVERSA` padrão com a lista de ferramentas e quando usá-las (nova versão por migration de seed ou pela tela de Prompts, conforme o padrão da task 131; o texto de versão antiga nunca é reescrito).
4. Testes de cada ferramenta com service falsa: dono (nunca atividade de outro), ordenação e limite.

## Critérios de Aceite

- Na aplicação real, "o que eu tenho pra fazer?" lista as atividades do usuário por prioridade, com a demanda de cada uma; um desenvolvedor de teste não vê atividade de outro.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Qualquer escrita (145) e ferramentas do gestor (153).
- Ferramenta de exclusão (a IA não exclui nada).

## Dependências

`138` e `139` (chat), `137` (registro de ferramentas) e `142` (prioridade na listagem).

## Riscos e Mitigação

- Contexto grande: o limite por ferramenta é a defesa; medir os tokens de uma resposta com 30 atividades e ajustar o resumo.
