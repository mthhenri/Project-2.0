# 443-justificativa-sem-pedir-o-usuario-inteiro.spec.md

> Task 115/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-155 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/ponto e frontend/ponto. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Abrir o diálogo de justificativa deixa de fazer `GET /usuario/:id` para ler apenas `horasDiariasNecessarias`.

## Contexto

**A-155 · Baixa · Diálogo de justificativa pede o usuário inteiro só pela jornada diária**

Cada abertura do diálogo faz GET /usuario/:id e usa só `horasDiariasNecessarias` como teto das horas. O mensal que já está na tela não traz esse valor.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/ponto/components/ponto-justificativa-dialog/ponto-justificativa-dialog.component.ts:123-124 — `abrir` chama `carregarJornadaUsuario` e `carregarJustificativas`
- frontend/src/app/modules/ponto/components/ponto-justificativa-dialog/ponto-justificativa-dialog.component.ts:203-207 — `usuarioService.recuperar(usuarioId)` e leitura de `resposta.dados.horasDiariasNecessarias`
- shared/src/dtos/ponto/PontoMensalDto.ts:3-14 — campos do mensal, sem a jornada diária

Como observar: /ponto como gestor, com um usuário escolhido: clicar em justificar num dia: GET /usuario/:id e GET /ponto-justificativa?usuarioId=&ano=&mes= em paralelo, a cada abertura. Não exercitado na medição.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

**Antes:** o mensal que já está na tela não traz a jornada diária.

**Opções:**

1. Levar a jornada diária no `PontoMensalDto` (campo novo).
2. Manter a requisição.

## Entregáveis

1. Na opção 1: o campo no DTO e o diálogo usando o valor que já está na tela, com testes.

## Critérios de Aceite

- Ao vivo: abrir o diálogo de justificativa não gera requisição.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

