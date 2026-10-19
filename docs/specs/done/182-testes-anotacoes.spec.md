# Task 182 — Testes: anotações (pad)

> Task 12/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md). A service já tem 14 testes e a regra de texto 13.

## Objetivo

Completar o pad nas camadas que faltam: o SQL do conflito por `updatedDate` e do mover atômico, as rotas e as telas do pad.

## Entregáveis

### Backend

1. **`anotacao.repository` (integração):** alterar com `updatedDate` velho não grava (409 na service); mover é atômico
   na transação da linha ~69 (as duas seções ou nenhuma, inclusive quando a segunda gravação falha); leitura das cinco
   seções na ordem de exibição.
2. **Controller:** rotas de §12 (`GET`, `PUT .../:tipo`, `PATCH .../trecho`, `POST .../anexo`, `.../feito`, `.../mover`)
   e o DTO de cada uma.
3. **Regra pura:** `rotulo-secao-do-pad`.
4. **IA:** `consultar-pad` (só as seções pedidas, Feito só do dia, corte em 8000 caracteres) e `propor-anotar-pad`
   (Pessoal só com `pedidoExplicito`, trecho único conferido ao propor). O executor já tem 6 testes.

### Frontend

5. **Lógica:** `usuario/services/anotacao.service`, `anotacoes.util`, `secao-anotacao`.
6. **Componentes:** página `usuario-anotacoes` e `usuario-anotacoes-dialog`: cinco seções, salvar com conflito (aviso
   de versão velha), "Enviar para" outra seção com Desfazer de 7 s (`toast-desfazer`), "Feito" sob o título do dia,
   gestor abre o pad de outro e desenvolvedor não.

## Critérios de Aceite

- Regras de §12 (`anotacao`) — conflito, trecho único, mover atômico, Feito no fuso — com teste em pelo menos uma camada
  cada, listado no fecho.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- O editor de Markdown em si (187) e o interpretador do `shared` (já testado).

## Dependências

171, 172, 173. Fontes: `SYSTEM.SPEC.md` §12 (`anotacao`).
