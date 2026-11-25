# 497-seletor-do-chat-com-a-conversa-indisponivel.spec.md

> Task solta, pedida pelo autor em 2026-11-25 ("resolve a P-106"). Origem: `PROBLEMS.md` P-106, visto na verificação da task 496.

## Objetivo

Quando a conversa de hoje falha ao carregar, o seletor do ChatIA (na barra superior) deixa de ficar "Carregando…" para
sempre e passa a nomear a conversa que a página está oferecendo para tentar de novo.

## Entregáveis

1. `SeletorComponent` ganha a entrada `indisponivel` (padrão `false`): a conversa do dia não carregou. Com o dia ainda
   desconhecido, o rótulo é "Conversa de hoje" quando `indisponivel` e "Carregando…" quando não.
2. A etiqueta "conversa do dia" só aparece com o dia conhecido: hoje ela aparece também durante o carregamento e no erro,
   ao lado de "Carregando…" (os dois vazios contam como iguais).
3. A `ChatPage` passa o seu `erro()` (falha da carga da conversa de hoje) ao seletor. "Tentar de novo" bem-sucedido
   volta ao rótulo normal ("Hoje, dd/mm" ou o nome da conversa).
4. Testes: no seletor, o rótulo e a etiqueta nos três casos (carregando, indisponível, carregado); na página, o rótulo na
   falha e depois do "Tentar de novo".

## Critérios de Aceite

- Testes do frontend, build e `npm run lint:tudo` sem erros.
- Ao vivo (skill `verify`), com `GET /chat/hoje` respondendo 500: o seletor mostra "Conversa de hoje" sem a etiqueta, em
  `1366×768` e `720×1280`, claro e escuro; o popover do seletor continua abrindo as outras conversas.
- P-106 sai de `PROBLEMS.md`.

## Fora de Escopo

- Calcular o dia de hoje no navegador (o dia é o do servidor, `APP_TIMEZONE`).
- Mudar o aviso de erro da página ou o comportamento do "Tentar de novo".

## Dependências

Task 496 (seletor na barra superior).

## Verificação (2026-11-25)

- `npm run test --workspace=frontend`: 244 arquivos, 3003 testes passando (3 novos: dois no seletor, um trecho a mais no
  teste de falha da página). `npm run build --workspace=frontend` e `npm run lint:tudo`: sem erros.
- Ao vivo (dev.teste, com execução rodando; `GET /chat/hoje` forçado a 500 pelo Playwright), em `1366×768` e `720×1280`,
  claro e escuro: o seletor mostra "Conversa de hoje" sem a etiqueta; a lista do seletor abre e traz as outras
  conversas; "Tentar de novo" com a API de volta mostra "Login do portal" e a etiqueta. Sem erro de página. Capturas em
  `.artifacts/497-seletor-indisponivel/` (fora do Git).
