# 495-testes-do-frontend-no-node-26.spec.md

> Task solta. Origem: `PROBLEMS.md` P-087.

## Objetivo

A suíte do frontend (`ng test`) passa no Node 26 sem variável de ambiente, sem deixar de rodar nas versões anteriores
do Node, para que `npm test` na raiz volte a chegar ao fim (desktop e scripts do repositório).

## Entregáveis

1. `frontend/vitest.config.ts` desliga o Web Storage do próprio Node nos processos de teste quando o Node em uso conhece
   a opção `--no-experimental-webstorage`; quando não conhece (Node 20), não passa nada. Sem `NODE_OPTIONS`, sem
   dependência nova e igual em Windows e Linux.
2. P-087 sai de `PROBLEMS.md`; relato em `HISTORY.md`.

## Critérios de Aceite

- `npm test` na raiz sai com código 0 no Node 26 sem variável de ambiente.
- A opção é aceita (ou omitida) na versão de Node anterior usada pelo projeto (22, a do CI).
- `npm run lint:tudo` e `npm run repo:verificar` sem erros.

## Fora de Escopo

- Fixar a versão do Node (`engines`, `.nvmrc`) ou mudar a do CI.
- Alterar testes, `montar-componente.ts` ou código da aplicação.

## Dependências

Nenhuma.
