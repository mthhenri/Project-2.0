# 388-participacao-na-demanda-como-controle-de-edicao.spec.md

> Task 60/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-072 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: backend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Levar ao autor a consequência de duas regras escritas ("inclui só a si mesmo" e "edita só onde é membro"): somadas, a participação é um passo, não uma barreira. Com uma linha em `demanda_usuario` no projeto, o desenvolvedor entra em qualquer outra demanda dele e altera nome, horas, status, pai e tags.

## Contexto

**A-072 · Informativo · "Edita só onde é membro" não segura o desenvolvedor: ele se inclui em qualquer demanda de projeto acessível e passa a editar**

O código segue as duas regras escritas (inclui só a si mesmo; edita só onde é membro), mas a soma delas faz a participação funcionar como um passo, não como barreira. Com uma linha em demanda_usuario no projeto, o desenvolvedor entra em qualquer outra demanda do projeto e altera nome, horas, status, pai e tags.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:874-890 — atribuirMembro exige do desenvolvedor só `usuarioId === sub` e acesso ao projeto
- backend/src/modules/demanda/services/demanda.service.ts:460-470 — recuperarDemandaParaEditar libera a edição a quem é membro
- backend/src/modules/demanda/services/demanda.service.ts:777-782 — alterarTagsDemanda idem

Como observar: Como DESENVOLVEDOR membro só da demanda A do projeto: POST /api/demanda/{B}/membro {"usuarioId": <próprio id>} responde 201; em seguida PUT /api/demanda/{B} {"status":"CONCLUIDA"} responde 200.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** o código segue as duas regras como estão escritas.

**Opções:**

1. A participação é só registro de quem trabalha: nada muda e o documento diz isso.
2. A participação controla a edição: a autoatribuição passa a ter condição (por exemplo, aprovação de quem conduz, ou só em demanda sem membro).

## Entregáveis

1. A decisão registrada no `SYSTEM.SPEC.md` §14; se for a opção 2, a condição implementada em `atribuirMembro` com teste.

## Critérios de Aceite

- O documento descreve a intenção da regra.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

