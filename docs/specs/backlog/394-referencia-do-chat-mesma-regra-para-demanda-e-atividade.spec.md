# 394-referencia-do-chat-mesma-regra-para-demanda-e-atividade.spec.md

> Task 66/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-081 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/mensagem-direta.

## Objetivo

Alinhar as duas pernas da referência: para o desenvolvedor, a demanda vale por projeto acessível e a atividade exige vínculo com a própria demanda. Ele referencia a demanda B e não uma atividade dela.

## Contexto

**A-081 · Baixa · Referência #: demanda vale por projeto, atividade vale por demanda**

Para o desenvolvedor, o cartão e a sugestão de demanda aceitam qualquer demanda de projeto em que ele tem vínculo, mas os de atividade exigem vínculo na própria demanda da atividade. Ele referencia a demanda B e não uma atividade da mesma demanda B. É mais restritivo, não vaza; falta confirmar se é a regra do `AtividadeService`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/domain/mensagem-direta-referencia.ts:32 — demanda: `demandaRepositorio.recuperar(..., { usuarioId })`
- backend/src/modules/demanda/repositories/demanda.repository.ts:268-283 — EXISTS em `demanda_usuario` de qualquer demanda do mesmo `projeto_id`
- backend/src/modules/mensagem-direta/domain/mensagem-direta-referencia.ts:38 — atividade: `validarAcessoDemanda({ demandaId: atividade.demandaId, ... })`
- backend/src/modules/atividade/repositories/atividade.repository.ts:634-649 — `demanda_usuario.demanda_id = :demandaId`
- backend/src/modules/demanda/repositories/demanda.repository.ts:233-243 e backend/src/modules/atividade/repositories/atividade.repository.ts:150-159 — a mesma diferença nas sugestões

Como observar: Como DESENVOLVEDOR membro só da demanda A do projeto P: GET /api/v1/mensagem-direta/referencia/DEMANDA/<B de P> dá `acessivel: true`; GET /api/v1/mensagem-direta/referencia/ATIVIDADE/<atividade de B> dá `acessivel: false`, e POST mensagem com essa referência dá erro de negócio.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Conferir a regra de visão de atividade da `AtividadeService` e usar a mesma em `resolverReferenciaDireta` e nas sugestões; se a diferença for intencional, o motivo vai para o comentário.
2. Teste com desenvolvedor em projeto acessível sem ser membro da demanda.

## Critérios de Aceite

- O cartão e a sugestão de atividade respondem o mesmo que `GET /atividade/:id` responderia ao mesmo usuário.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Convém depois de `377-atividade-acesso-do-dono-coerente`, que define a regra de leitura da atividade.

