# 345-usuarios-busca-filtro-e-paginador.spec.md

> Task 17/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-021, A-022, A-023 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/usuario.

## Objetivo

A listagem de Usuários busca de forma previsível: filtrar fora da página 1 mostra a página 1 de verdade, o mesmo termo volta a buscar depois de "Limpar" e uma resposta antiga não sobrescreve a nova.

## Contexto

**A-021 · Média · Usuários: buscar ou filtrar fora da página 1 pede a página 1, mas o paginador continua na página antiga (e às vezes dispara uma segunda requisição)**

`aoMudarFiltro()` zera `paginaAtual` e busca, mas a `p-table` lazy guarda o próprio `first`, que a tela não liga nem reinicia. Depois da resposta: (a) se o novo total é menor ou igual ao `first` antigo e a página anterior existe, o paginador da PrimeNG recua uma página sozinho e emite `onLazyLoad`: sai uma segunda `GET /usuario?pagina=N` e a tela mostra essa página, não a 1; (b) nos outros casos as linhas são da página 1 e o paginador indica a página antiga.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:219-222 — `aoMudarFiltro` só faz `paginaAtual.set(1)` e `buscarUsuarios()`
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:121-128 — `p-table` lazy sem `[first]`
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:211-217 — `aoCarregarTabela` calcula a página a partir do `first` da tabela
- node_modules/primeng/fesm2022/primeng-paginator.mjs:381-386 — ao mudar `totalRecords` o paginador chama `updateFirst()`
- node_modules/primeng/fesm2022/primeng-paginator.mjs:467-472 e 452-466 — `updateFirst` chama `changePage(page - 1)` quando `first >= totalRecords`; `changePage` só age se a página existe
- node_modules/primeng/fesm2022/primeng-table.mjs:1549-1557 — `onPageChange` da tabela emite `onLazyLoad`

Como observar: Com mais de 20 usuários, ir à página 3 e digitar uma busca que devolva de 11 a 20 resultados: na rede saem `GET /usuario?pagina=1&busca=…` e depois `GET /usuario?pagina=2&busca=…`; a tela fica na página 2. Com busca que devolva 21 ou mais: uma requisição, linhas da página 1 e paginador marcando a 3.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-022 · Média · Usuários: depois de "Limpar", digitar o mesmo termo de antes não busca**

A busca passa por `debounceTime(300)` e `distinctUntilChanged()`. `limparFiltros()` zera o campo com `emitEvent: false`, então o operador continua lembrando o termo anterior. Redigitar o mesmo termo em ritmo normal emite um valor igual ao último e é descartado: nenhuma requisição sai e a lista fica sem filtro com o termo no campo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:126-131 — `debounceTime(300), distinctUntilChanged()` antes de `termoBusca.set` e `aoMudarFiltro`
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:240-241 — `termoBusca.set('')` e `setValue('', { emitEvent: false })`

Como observar: Na tela Usuários digitar "ana" (a lista filtra), clicar "Limpar" e digitar "ana" de novo: nenhuma `GET /usuario` sai e a lista continua completa. O mesmo pelo "Limpar filtros" do estado vazio.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-023 · Média · Usuários: cada busca, filtro ou recarga abre uma requisição nova sem cancelar a anterior**

`buscarUsuarios()` faz um `subscribe` novo a cada chamada. Busca, filtros, paginação, volta à aba e recarga pós-gravação podem ficar em voo ao mesmo tempo; a resposta que chegar por último vence, mesmo sendo de um pedido mais antigo, e o `finalize` da primeira já tira o estado de carregando.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:179-209 — `listar(filtros).pipe(finalize(...)).subscribe(...)` sem guardar nem cancelar a assinatura
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:126-131, 153-156 e 219-222 — os gatilhos que chamam `buscarUsuarios()`

Como observar: Com a rede em "Slow 3G" no DevTools: digitar "an", esperar 300 ms e completar "ana": duas `GET /usuario?busca=` pendentes; se a primeira responder depois, a lista fica com o resultado de "an".

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `[first]` da tabela ligado a um sinal, zerado em `aoMudarFiltro()`, para a busca partir da página 1 com uma requisição só.
2. A comparação do termo passa a ser com o termo aplicado (não `distinctUntilChanged()` sobre o campo), para acompanhar `limparFiltros()`.
3. As cargas passam por um fluxo que cancela a anterior (`switchMap` ou cancelar a assinatura).
4. Testes de componente para os três casos.

## Critérios de Aceite

- Ao vivo: na página 2, digitar um termo mostra o paginador na página 1 e faz 1 `GET /usuario`; "Limpar" e o mesmo termo de novo busca.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

As outras telas com `p-table` lazy: se tiverem o mesmo defeito do paginador, entram no relatório da task e viram spec própria.

## Dependências

Nenhuma.
