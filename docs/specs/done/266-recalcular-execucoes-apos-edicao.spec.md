# 266 — Recalcular execuções após edição

> Task de correção do P-045.

## Objetivo

Manter a lista de execuções e os totais do dia consistentes após alterar início ou fim de uma execução.

## Entregáveis

1. Após salvar uma alteração de início ou fim, consultar novamente a lista com os filtros e paginação atuais, incluindo os totais calculados pelo servidor.
2. Cobrir atualização da duração e total, e remoção da linha quando mudar de dia, com teste de componente.

## Critérios de Aceite

- Teste de componente reproduz os casos e passa; suíte e build do frontend passam, com falhas preexistentes relatadas separadamente.
- Verificação na aplicação real nos tamanhos 1920×1080, 1366×768 e 1080×1920; a própria tela de Execuções é o análogo visual, pois o layout permanece o mesmo.
- `npm run repo:verificar` passa.

## Fora de Escopo

Alterar regras de cálculo ou permissões, modificar a edição de descrição, ou corrigir outros problemas da tela.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md` e P-045 em `docs/context/PROBLEMS.md`.
