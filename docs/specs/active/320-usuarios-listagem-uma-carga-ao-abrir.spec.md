# 320-usuarios-listagem-uma-carga-ao-abrir.spec.md

> Task solta. Origem: `PROBLEMS.md` P-082 (dossiê `active/auditoria-requisicoes-telas/DOSSIE.md`, R-04).

## Objetivo

A tela de Usuários pede a listagem uma única vez ao abrir, com o mesmo resultado visível de hoje.

## Entregáveis

1. `usuario-listagem.page.ts` deixa de duplicar a carga inicial: ou o `ngOnInit` ou o `onLazyLoad` inicial da tabela busca, nunca os dois (o escolhido é o que já respeita filtros e paginação vindos da URL).
2. Teste de componente (`*.spec.ts`) que abre a tela e afirma exatamente uma `GET /usuario?pagina=1&itensPorPagina=10`.

## Critérios de Aceite

- Teste de componente verde; criar, filtrar, buscar e paginar continuam fazendo uma requisição cada.
- Verificação ao vivo (skill `verify`): abrir `/usuario` registra 1 `GET /usuario?...`; a tabela, os filtros e a paginação aparecem como antes em `1920×1080`, temas claro e escuro.
- `npm run lint:tudo` e `npm run test --workspace=frontend` sem erro novo.

## Fora de Escopo

Outras telas com carga dupla; mudar API, DTO ou layout da tela.

## Dependências

Nenhuma.
