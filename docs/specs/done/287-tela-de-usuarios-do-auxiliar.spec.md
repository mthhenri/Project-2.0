# 287-tela-de-usuarios-do-auxiliar.spec.md

> Task da guarda-chuva `tipo-auxiliar.spec.md` (283–287). Redigida e concluída em 2026-11-01, depois da 286. Relatório da verificação ao vivo (desta e da 286) em `287-tela-de-usuarios-do-auxiliar/VERIFICACAO.md`.

## Objetivo

Permitir escolher o Auxiliar na tela de Usuários e fechar a guarda-chuva com a verificação ao vivo, logado como Auxiliar, nas telas da matriz.

## Entregáveis

1. **Formulário de usuário:** opção "Auxiliar" entre Desenvolvedor e Gestor. Com quatro opções o seletor de tipo deixou de caber ao lado da Senha: o campo Tipo ocupa a linha toda (`usuario-formulario-dialog__campo--linha-inteira`).
2. **Listagem:** filtro "Auxiliares" e o selo do Auxiliar (a 283 já o criou). Em tela estreita o grupo de filtros de tipo passa a quebrar em duas linhas em vez de ser cortado.
3. **Testes:** opções do formulário (gestor e administrador), filtro e selo na listagem, Auxiliar sem "Novo Usuário" nem ações de gestão, pad do Auxiliar aberto pelo gestor.
4. **Verificação ao vivo** (skill `verify`), logado como Auxiliar e como gestor, nos cinco formatos de desktop e nos dois temas (`VERIFICACAO.md`).
5. **Fecho da guarda-chuva:** `tipo-auxiliar.spec.md` e as tasks 283–287 em `done/`; `HISTORY.md`, `CONTEXT.md`, `PRIORITIES.md`.

## Critérios de Aceite

- `npm test`, `npm run test:integracao`, builds de backend e frontend e `npm run lint:tudo` sem erro; `npm run repo:verificar` ok.
- A matriz exercitada contra a API real como Auxiliar: o permitido responde 2xx e o recusado 403 (`VERIFICACAO.md`).

## Fora de Escopo

- Mudar o poder de qualquer tipo; permissão configurável por usuário.

## Dependências

- Tasks 283–286.

## Riscos e Mitigação

- **Layout com quatro opções:** pego ao vivo (a Senha ficava cortada) e corrigido; conferido a 1366 e a 720 de largura.

## Resultado (2026-11-01)

Ver `VERIFICACAO.md` e o bloco de 2026-11-01 em `HISTORY.md`.
