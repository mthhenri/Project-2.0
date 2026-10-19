# Task 181 — Testes: tags

> Task 11/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md). O `tag.repository` já é coberto pela task 171
> (repository de referência).

## Objetivo

Provar o CRUD de tags (só gestor cria), a unicidade de nome e a cor, e as telas de tags (quick-add e cor inline, task
116).

## Entregáveis

### Backend

1. **`tag.service`** (3 testes, só `restaurar`): criar/alterar/excluir só gestor; desenvolvedor recusado; nome duplicado
   entre ativas recusado (conferir se compara sem caixa/acento, conforme o documento); cor válida.
2. **Repository:** só o que a 171 não cobriu (listagem com contagem de uso, se houver).
3. **Controller:** permissão de cada rota.
4. **IA:** `listar-tags.ferramenta`.

### Frontend

5. **Lógica:** `tag.util`, `tag.service`.
6. **Componentes:** `tag-listagem` (quick-add, cor inline, vazio/cheio/erro, ações só para gestor), `tag-edicao-dialog`.
   Se a 172 já usou a tela de Tags como referência, só completar.

## Critérios de Aceite

- Linha "Criar e atribuir tag" de §14 (parte de criar) com teste; a parte de atribuir fica com 176/177.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Atribuição de tag a demanda (176) e a atividade (177).

## Dependências

171, 172, 173. Fontes: `SYSTEM.SPEC.md` §12 (`tag`), §13 (Tag), §14.
